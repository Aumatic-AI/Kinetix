import { inngest } from "../client";
import { aiOrchestrator } from "../../ai/orchestrator";
import { createClient } from "@supabase/supabase-js";
import { getVideoAdScriptPrompt, getVisualPromptsPrompt, sceneCountForDuration } from "../../../prompts/meta-ads/video";
import { FFmpegService } from "../../ffmpeg";
import { submitSceneStitchJob, downloadAndStoreVideo } from "../../ffmpeg/stitch-scenes";
import { resolveVideoReferenceUrl } from "../../ai/video-reference";
import { elevenLabsLanguageCode } from "../../ai/providers/elevenlabs";
import { env } from "@/config";

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY!
);

export const generateVideoAd = inngest.createFunction(
  { 
    id: "generate-video-ad",
    triggers: [{ event: "meta-ads/generate-video" }]
  },
  async ({ event, step }) => {
    const { ideaPrompt, duration, audioStyle, character, voiceId, videoStyle, language, service, creativeId, businessId } = event.data;

    if (!creativeId) throw new Error("No creativeId provided");

    try {
      // 1. Fetch business context + intelligence (competitor + self-ad reports)
      const intelligence = await step.run("fetch-intelligence", async () => {
        const { data: businessData } = await supabase
          .from("businesses")
          .select("*")
          .eq("id", businessId)
          .single();

        const { data: compData } = await supabase
          .from("ad_analysis_reports")
          .select("*")
          .eq("business_id", businessId)
          .eq("report_type", "competitor")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const { data: selfData } = await supabase
          .from("ad_analysis_reports")
          .select("*")
          .eq("business_id", businessId)
          .eq("report_type", "self")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        return {
          business: businessData || {},
          competitor: compData?.insights || {},
          self: selfData?.insights || {}
        };
      });

      // 2. Generate script via LLM
      const sceneCount = sceneCountForDuration(duration);
      const prompt = getVideoAdScriptPrompt(intelligence, { ideaPrompt, duration, audioStyle, videoStyle, character, service, language });
      const scriptJson = await step.run("generate-script", async () => {
        const response = await aiOrchestrator.executeTask('text', prompt, 'openai');
        const jsonStr = (response as string).replace(/```json\n?|\n?```/g, "").trim();
        const parsed = JSON.parse(jsonStr);
        // Video length is scenes x 4s (hard constraint, see the cinematic
        // prompt below) — truncate defensively if the model overshoots the
        // requested line count, so the video is never longer than intended.
        // Undershooting isn't trimmed: a shorter-but-complete video is a
        // safer failure than the mid-sentence audio cutoff a too-long
        // script causes once it's laid over the fixed-length video.
        if (Array.isArray(parsed.script) && parsed.script.length > sceneCount) {
          parsed.script = parsed.script.slice(0, sceneCount);
        }
        return parsed;
      });

      // 3. Generate Visual Prompts via LLM — resolved ahead of this step (not
      // just before image generation below) so the prompt itself can be told
      // whether a reference photo will be conditioning every scene's face.
      const referenceUrl = resolveVideoReferenceUrl(intelligence.business, character);
      const visualPromptsJson = await step.run("generate-visual-prompts", async () => {
        const vpPrompt = getVisualPromptsPrompt(scriptJson.script, { character, videoStyle, duration, service, hasReferenceImage: !!referenceUrl }, intelligence.business);
        const response = await aiOrchestrator.executeTask('text', vpPrompt, 'openai');
        const jsonStr = (response as string).replace(/```json\n?|\n?```/g, "").trim();
        return JSON.parse(jsonStr);
      });

      // 4. Audio Generation via ElevenLabs (Only if Voiceover)
      const audioResult = await step.run("audio-generation", async () => {
        if (audioStyle === "Voiceover" && voiceId) {
          const fullScript = scriptJson.script.join(" ");
          const audioBuffer = await aiOrchestrator.generateSpeech(fullScript, voiceId, elevenLabsLanguageCode(language));
          
          // Upload to Supabase
          const fileName = `${businessId}/meta-ads/audio/${creativeId}_${Date.now()}.mp3`;
          const { error } = await supabase.storage.from("business_media").upload(fileName, audioBuffer, { contentType: "audio/mpeg" });
          if (error) throw new Error("Audio upload failed: " + error.message);

          const { data } = supabase.storage.from("business_media").getPublicUrl(fileName);
          return { url: data.publicUrl, isGenerated: true };
        }
        return { url: null, isGenerated: false }; // Background music only, or no voiceId
      });

      // 5. Trigger Images in Parallel (referenceUrl resolved above, step 3)
      const imageJobIds = await step.run("trigger-images", async () => {
        const ids = [];
        for (const vp of visualPromptsJson.visual_prompts) {
           const jobId = await aiOrchestrator.createImageTask(vp.prompt, "9:16", referenceUrl);
           ids.push({ id: jobId, url: null as string | null, scene: vp.scene, imagePrompt: vp.prompt, videoScenario: vp.video_scenario, fellBack: false, state: null as string | null });
        }
        return ids;
      });

      // 6. Poll for all images completion. Up to 8 scene images generate in
      // parallel on Kie's side, so completion time varies per-scene — give
      // slower/queued scenes enough room (~4.5 min total) rather than a
      // tight budget tuned for a single image. Kie's real terminal-failure
      // state is "fail" (its docs list waiting/queuing/generating/success/
      // fail) — an earlier version of this code checked for "failed"/"error",
      // which never matches, so a scene Kie had already rejected (e.g. a
      // content-safety hold on the reference-image + prompt combo, plausible
      // for medical-procedure scenes) looked identical to one still queued
      // and got polled all the way to the timeout below instead of being
      // caught immediately. Once a real "fail" is seen, retrying the exact
      // same reference-image-conditioned request would likely fail the same
      // way, so fall back once to plain text-to-image for just that scene.
      let imagesDone = false;
      let imgAttempts = 0;
      const MAX_IMAGE_ATTEMPTS = 12;
      while (!imagesDone && imgAttempts < MAX_IMAGE_ATTEMPTS) {
        await step.sleep(`wait-image-${imgAttempts}`, imgAttempts === 0 ? "30s" : "20s");
        const pollResult = await step.run(`check-image-status-${imgAttempts}`, async () => {
          let pending = false;
          for (const job of imageJobIds) {
            if (job.url) continue;
            const status = await aiOrchestrator.checkTaskStatus(job.id);
            job.state = status.state; // waiting / queuing / generating / success / fail — visible in the step output for debugging
            if (status.state === "success") {
              try {
                const r = JSON.parse(status.resultJson);
                job.url = r.resultUrls?.[0] || r.urls?.[0] || null;
              } catch { /* malformed result — treated as still-pending below */ }
              if (!job.url) pending = true;
            } else if (status.state === "fail") {
              console.error(`Kie image generation failed for scene ${job.scene} (job ${job.id}): ${status.failMsg || status.failCode || "no reason given"}`);
              if (!job.fellBack) {
                job.id = await aiOrchestrator.createImageTask(job.imagePrompt, "9:16");
                job.fellBack = true;
              } else {
                throw new Error(`Kie rejected scene ${job.scene} twice (job ${job.id}): ${status.failMsg || "no reason given"}`);
              }
              pending = true;
            } else {
              pending = true; // waiting / queuing / generating — normal, keep polling
            }
          }
          return { imageJobIds, allComplete: !pending };
        });
        for (let i = 0; i < imageJobIds.length; i++) { imageJobIds[i] = pollResult.imageJobIds[i]; }
        imagesDone = pollResult.allComplete;
        imgAttempts++;
      }
      if (!imagesDone) {
        const stuck = imageJobIds.filter((j) => !j.url).map((j) => `scene ${j.scene} (job ${j.id})`);
        throw new Error(`Image Generation Timed Out after ${MAX_IMAGE_ATTEMPTS} attempts. Still pending: ${stuck.join(", ")}`);
      }

      // 7. Trigger Videos in Parallel using Generated Images
      const videoJobIds = await step.run("trigger-videos", async () => {
        const ids = [];
        for (const imgJob of imageJobIds) {
           const cinematicPrompt = `${imgJob.videoScenario} Cinematic medical tourism ad, warm 3200K golden-hour color grade, bold golds and deep teals, shallow depth of field, smooth slow camera movement only, no cuts within clip, photorealistic quality, animate the subject naturally from the image, preserve the exact scene composition and person from the image, same color grade and lighting as the input image. The person's face, identity, body, and wardrobe must not change or drift at any point in the clip. Facial expression from the input image must be preserved exactly throughout the entire clip — do not alter or relax it.`;
           const jobId = await aiOrchestrator.createVideoTask(cinematicPrompt, [imgJob.url as string], "9:16", "4");
           ids.push({ id: jobId, url: null as string | null, scene: imgJob.scene, cinematicPrompt, sourceImageUrl: imgJob.url as string, resubmitted: false, state: null as string | null });
        }
        return ids;
      });

      // 8. Poll for all videos completion. Seedance (image-to-video) is
      // markedly slower and more variable per-clip than the image model,
      // especially with up to 8 clips generating in parallel on Kie's side
      // — a clip that's still queued at minute 6 is common, not stuck, so
      // this needs a much longer budget than the image polling above
      // (~40s + 24*30s ≈ 12.5 min) before we give up on it. Same "fail"
      // detection fix as the image poll above — Kie's real failure state is
      // "fail", not "failed"/"error".
      let videosDone = false;
      let vidAttempts = 0;
      const MAX_VIDEO_ATTEMPTS = 25;
      while (!videosDone && vidAttempts < MAX_VIDEO_ATTEMPTS) {
        await step.sleep(`wait-video-${vidAttempts}`, vidAttempts === 0 ? "40s" : "30s");
        const pollResult = await step.run(`check-video-status-${vidAttempts}`, async () => {
          let pending = false;
          for (const job of videoJobIds) {
            if (job.url) continue;
            const status = await aiOrchestrator.checkTaskStatus(job.id);
            job.state = status.state; // waiting / queuing / generating / success / fail — visible in the step output for debugging
            if (status.state === "success") {
              try {
                const r = JSON.parse(status.resultJson);
                job.url = r.resultUrls?.[0] || r.urls?.[0] || null;
              } catch { /* malformed result — treated as still-pending below */ }
              if (!job.url) pending = true;
            } else if (status.state === "fail") {
              console.error(`Kie video generation failed for scene ${job.scene} (job ${job.id}): ${status.failMsg || status.failCode || "no reason given"}`);
              if (!job.resubmitted) {
                job.id = await aiOrchestrator.createVideoTask(job.cinematicPrompt, [job.sourceImageUrl], "9:16", "4");
                job.resubmitted = true;
              } else {
                throw new Error(`Kie rejected video for scene ${job.scene} twice (job ${job.id}): ${status.failMsg || "no reason given"}`);
              }
              pending = true;
            } else {
              pending = true; // waiting / queuing / generating — normal, keep polling
            }
          }
          return { videoJobIds, allComplete: !pending };
        });
        for (let i = 0; i < videoJobIds.length; i++) { videoJobIds[i] = pollResult.videoJobIds[i]; }
        videosDone = pollResult.allComplete;
        vidAttempts++;
      }
      if (!videosDone) {
        const stuck = videoJobIds.filter((j) => !j.url).map((j) => `scene ${j.scene} (job ${j.id})`);
        throw new Error(`Video Generation Timed Out after ${MAX_VIDEO_ATTEMPTS} attempts. Still pending: ${stuck.join(", ")}`);
      }

      const clipUrls = videoJobIds.map(j => j.url).filter(Boolean) as string[];

      // 9. Stitching via FFmpeg API
      const finalVideoUrl = await step.run("stitch-video", async () => {
        return submitSceneStitchJob({ clipUrls, audioUrl: audioResult.url });
      });

      // 10. Poll for Stitching
      let stitchDone = false;
      let stitchAttempts = 0;
      let stitchedVideoUrl = "";

      while (!stitchDone && stitchAttempts < 15) {
        await step.sleep(`wait-stitch-${stitchAttempts}`, "20s");
        const pollResult = await step.run(`check-stitch-status-${stitchAttempts}`, async () => {
          const statusResult = await FFmpegService.checkStatus(finalVideoUrl);

          if (statusResult.status === "finished") {
            return { url: statusResult.url, done: true };
          } else if (statusResult.status === "failed" || statusResult.status === "error") {
            throw new Error(`FFmpeg Stitching Faile d: ${statusResult.error || 'Unknown error'}`);
          }
          return { url: "", done: false };
        });

        if (pollResult.done && pollResult.url) {
          stitchedVideoUrl = pollResult.url;
          stitchDone = true;
        }
        stitchAttempts++;
      }

      if (!stitchDone || !stitchedVideoUrl) throw new Error("Stitching Timed Out");

      // 11. Download Stitched Video and Upload to Supabase
      const finalSupabaseUrl = await step.run("upload-stitched-video", async () => {
        const { publicUrl } = await downloadAndStoreVideo(supabase, {
          sourceUrl: stitchedVideoUrl,
          storagePath: `${businessId}/meta-ads/videos/${creativeId}_${Date.now()}.mp4`,
        });
        return publicUrl;
      });

      // 12. Finalize
      await step.run("finalize", async () => {
        await supabase
          .from('meta_ad_creatives')
          .update({
            status: 'review',
            ad_script: {
              script: scriptJson.script,
              audioUrl: audioResult.url
            },
            media_urls: [finalSupabaseUrl]
          })
          .eq('id', creativeId);
      });

      return { success: true, creativeId };
    } catch (e: any) {
      await supabase
        .from('meta_ad_creatives')
        .update({ status: 'failed' })
        .eq('id', creativeId);
      throw e;
    }
  }
);
