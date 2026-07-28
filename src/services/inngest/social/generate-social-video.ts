import { inngest } from "../client";
import { aiOrchestrator } from "../../ai/orchestrator";
import { createClient } from "@supabase/supabase-js";
import { getSocialVideoScriptPrompt, getSocialCaptionPrompt, formatPlatformCaptions, SocialPlatform } from "../../../prompts/social-media";
import { getVisualPromptsPrompt } from "../../../prompts/meta-ads";
import { FFmpegService } from "../../ffmpeg";
import { submitSceneStitchJob, downloadAndStoreVideo } from "../../ffmpeg/stitch-scenes";
import { resolveVideoReferenceUrl } from "../../ai/video-reference";
import { env } from "@/config";

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Generates one narrated video + per-platform captions for an organic
 * social post. Mirrors the proven Meta Ads video pipeline
 * (`generate-video-ad.ts`) step for step — same script -> visual prompts
 * -> ElevenLabs -> Kie images -> Kie videos -> FFmpeg stitch chain, same
 * polling budgets — but with the 4-act organic-story prompt instead of
 * the ad's 3-act prompt, and writing into `media_assets` (reusable
 * library) + one `social_posts` row per selected platform instead of
 * `meta_ad_creatives`.
 */
export const generateSocialVideo = inngest.createFunction(
  { id: "generate-social-video", triggers: [{ event: "social/generate-video" }] },
  async ({ event, step }) => {
    const {
      businessId, ideaPrompt, duration, character, voiceId,
      service, language, videoStyle, backgroundSong,
      platforms = [], socialPostIds = [],
    } = event.data as {
      businessId: string;
      ideaPrompt: string;
      duration: number;
      character: "male" | "female";
      voiceId: string;
      service?: string;
      language?: string;
      videoStyle?: string;
      backgroundSong?: string;
      platforms?: SocialPlatform[];
      socialPostIds?: string[];
    };

    try {
      const business = await step.run("fetch-business", async () => {
        const { data } = await supabase.from("businesses").select("*").eq("id", businessId).single();
        return data || {};
      });

      // 1. Caption metadata + per-platform formatting — only if this will
      // actually become a post somewhere.
      let platformCaptions: ReturnType<typeof formatPlatformCaptions> = {};
      let captionMeta: any = null;
      if (platforms.length) {
        captionMeta = await step.run("generate-captions", async () => {
          const prompt = getSocialCaptionPrompt(business, { ideaPrompt, contentType: "video" });
          const response = await aiOrchestrator.executeTask("analysis", prompt.user, "openai", { systemPrompt: prompt.system });
          const jsonStr = (response as string).replace(/```json\n?|\n?```/g, "").trim();
          return JSON.parse(jsonStr);
        });
        platformCaptions = formatPlatformCaptions(captionMeta, platforms);
      }

      // 2. Script (4-act organic arc)
      const scriptJson = await step.run("generate-script", async () => {
        const prompt = getSocialVideoScriptPrompt(business, { ideaPrompt, duration, character, service, language });
        const response = await aiOrchestrator.executeTask("text", prompt, "openai");
        const jsonStr = (response as string).replace(/```json\n?|\n?```/g, "").trim();
        return JSON.parse(jsonStr);
      });

      // 3. Visual prompts per scene — reuses the same condition/tier system
      // already proven for Meta Ads video (no ad-specific assumptions in it).
      const visualPromptsJson = await step.run("generate-visual-prompts", async () => {
        const vpPrompt = getVisualPromptsPrompt(scriptJson.script, { character, videoStyle: videoStyle || "Cinematic", duration, service }, business);
        const response = await aiOrchestrator.executeTask("text", vpPrompt, "openai");
        const jsonStr = (response as string).replace(/```json\n?|\n?```/g, "").trim();
        return JSON.parse(jsonStr);
      });

      // 4. ElevenLabs narration
      const audioResult = await step.run("audio-generation", async () => {
        const fullScript = scriptJson.script.join(" ");
        const audioBuffer = await aiOrchestrator.generateSpeech(fullScript, voiceId);
        const fileName = `${businessId}/social/audio/${Date.now()}.mp3`;
        const { error } = await supabase.storage.from("business_media").upload(fileName, audioBuffer, { contentType: "audio/mpeg" });
        if (error) throw new Error("Audio upload failed: " + error.message);
        const { data } = supabase.storage.from("business_media").getPublicUrl(fileName);
        return { url: data.publicUrl };
      });

      // 5. Trigger per-scene images
      const referenceUrl = resolveVideoReferenceUrl(business, character);
      const imageJobIds = await step.run("trigger-images", async () => {
        const ids = [];
        for (const vp of visualPromptsJson.visual_prompts) {
          const jobId = await aiOrchestrator.createImageTask(vp.prompt, "9:16", referenceUrl);
          ids.push({ id: jobId, url: null as string | null, scene: vp.scene, imagePrompt: vp.prompt, videoScenario: vp.video_scenario, fellBack: false, state: null as string | null });
        }
        return ids;
      });

      // 6. Poll images (same budget as the proven Meta Ads job). Kie's real
      // terminal-failure state is "fail" (its docs list waiting/queuing/
      // generating/success/fail) — an earlier version of this code checked
      // for "failed"/"error", which never matches, so a scene Kie had
      // already rejected (e.g. a content-safety hold on the reference-image
      // + prompt combo, plausible for medical-procedure scenes) looked
      // identical to one still queued and got polled all the way to the
      // timeout below instead of being caught immediately. Once a real
      // "fail" is seen, retrying the exact same reference-image-conditioned
      // request would likely fail the same way, so fall back once to plain
      // text-to-image for just that scene.
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

      // 7. Trigger per-scene videos (image-to-video)
      const videoJobIds = await step.run("trigger-videos", async () => {
        const ids = [];
        for (const imgJob of imageJobIds) {
          const cinematicPrompt = `${imgJob.videoScenario} Cinematic social content, natural color grade, shallow depth of field, smooth slow camera movement only, no cuts within clip, photorealistic quality, animate the subject naturally from the image, preserve the exact scene composition and person from the image.`;
          const jobId = await aiOrchestrator.createVideoTask(cinematicPrompt, [imgJob.url as string], "9:16", "4");
          ids.push({ id: jobId, url: null as string | null, scene: imgJob.scene, cinematicPrompt, sourceImageUrl: imgJob.url as string, resubmitted: false, state: null as string | null });
        }
        return ids;
      });

      // 8. Poll videos (same generous budget as the proven Meta Ads job).
      // Same "fail" detection fix as the image poll above.
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

      const clipUrls = videoJobIds.map((j) => j.url).filter(Boolean) as string[];

      // 9. Stitch via FFmpeg
      const finalVideoUrl = await step.run("stitch-video", async () => {
        return submitSceneStitchJob({ clipUrls, audioUrl: audioResult.url });
      });

      // 10. Poll stitching
      let stitchDone = false;
      let stitchAttempts = 0;
      let stitchedVideoUrl = "";
      while (!stitchDone && stitchAttempts < 15) {
        await step.sleep(`wait-stitch-${stitchAttempts}`, "20s");
        const pollResult = await step.run(`check-stitch-status-${stitchAttempts}`, async () => {
          const statusResult = await FFmpegService.checkStatus(finalVideoUrl);
          if (statusResult.status === "finished") return { url: statusResult.url, done: true };
          if (statusResult.status === "failed" || statusResult.status === "error") {
            throw new Error(`FFmpeg Stitching Failed: ${statusResult.error || "Unknown error"}`);
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

      // 11. Download stitched video + save as a media_assets row
      const stored = await step.run("store-media-asset", async () => {
        const fileName = `${businessId}/social/videos/${Date.now()}.mp4`;
        const { publicUrl, sizeBytes } = await downloadAndStoreVideo(supabase, { sourceUrl: stitchedVideoUrl, storagePath: fileName });

        const { data: asset, error: assetError } = await supabase
          .from("media_assets")
          .insert({
            business_id: businessId,
            type: "video",
            source: "ai_generated",
            bucket: "business_media",
            storage_path: fileName,
            mime_type: "video/mp4",
            size_bytes: sizeBytes,
            duration_seconds: clipUrls.length * 4,
            metadata: { publicUrl, script: scriptJson.script, ideaPrompt, videoStyle, language, service, backgroundSong },
          })
          .select()
          .single();
        if (assetError || !asset) throw new Error("Failed to save media asset: " + assetError?.message);

        return { assetId: asset.id };
      });

      // 12. Finalize every social_posts row with the shared asset + its own
      // caption — there may be none, if this was generated straight into
      // the Media Library with no platform selected yet.
      if (socialPostIds.length) {
        await step.run("finalize", async () => {
          for (let i = 0; i < socialPostIds.length; i++) {
            const platform = platforms[i];
            const platformCaption = platformCaptions[platform];
            await supabase
              .from("social_posts")
              .update({
                status: "draft",
                media_asset_id: stored.assetId,
                caption: platformCaption?.text || captionMeta?.caption || "",
                title: platformCaption?.title || null,
                generation_inputs: { ideaPrompt, captionMeta, script: scriptJson.script },
              })
              .eq("id", socialPostIds[i]);
          }
        });
      }

      return { success: true, socialPostIds, mediaAssetId: stored.assetId };
    } catch (e: any) {
      if (socialPostIds.length) {
        await supabase
          .from("social_posts")
          .update({ status: "failed", error_message: String(e.message || e).slice(0, 500) })
          .in("id", socialPostIds);
      }
      throw e;
    }
  }
);
