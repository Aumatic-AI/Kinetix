import { inngest } from "../client";
import { aiOrchestrator } from "../../ai/orchestrator";
import { createClient } from "@supabase/supabase-js";
import { getVisualPromptsPrompt, MOOD_CINEMATOGRAPHY, MODES_WITH_PROTAGONIST } from "../../../prompts/meta-ads/video";
import { generateVideoScript, VideoScriptResult } from "../../ai/video-script";
import { getAudioDurationSeconds } from "../../ai/audio-duration";
import { FFmpegService } from "../../ffmpeg";
import { submitPerSceneStitchJob, downloadAndStoreVideo } from "../../ffmpeg/stitch-scenes";
import { resolveVideoReferenceUrl } from "../../ai/video-reference";
import { elevenLabsLanguageCode } from "../../ai/providers/elevenlabs";
import { env } from "@/config";

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY!
);

// Kie's Seedance video model's own documented duration range — every
// per-scene clip request is clamped into this range regardless of how long
// that scene's real narration measured.
const MIN_SCENE_SECONDS = 4;
const MAX_SCENE_SECONDS = 12;
// Used only when there's no narration to size a scene against (audioStyle
// isn't "Voiceover") — matches the old fixed-clip-length default.
const DEFAULT_SCENE_SECONDS = 4;

export const generateVideoAd = inngest.createFunction(
  {
    id: "generate-video-ad",
    triggers: [{ event: "meta-ads/generate-video" }]
  },
  async ({ event, step }) => {
    const { ideaPrompt, duration, audioStyle, character, voiceId, videoStyle, language, service, creativeId, businessId, videoMode, useReferencePhoto } = event.data;
    const isPosterMode = videoMode === "animated_poster";

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

      // 2. Script — reuse whatever the user already reviewed/approved (or
      // edited) in the Create Ad modal's script-review step, if one was
      // sent; only generate a fresh one here when none was supplied (e.g.
      // a retry that skips the review step). Same prompt, same call, same
      // trimming either way — see generateVideoScript's own doc comment.
      const scriptJson: VideoScriptResult = event.data.script
        ? event.data.script
        : await step.run("generate-script", () =>
            generateVideoScript(intelligence, { ideaPrompt, duration, audioStyle, videoStyle, character, service, language })
          );

      // 3. Generate Visual Prompts via LLM — resolved ahead of this step (not
      // just before image generation below) so the prompt itself can be told
      // whether a reference photo will be conditioning every scene's face.
      // The reference face-lock is a plain user toggle (default off, see
      // CreateAdModal), not something derived from the ad's mode — even a
      // TRANSFORMATION ad might not want the configured photo used, and an
      // otherwise-non-protagonist ad could still want it if the idea calls
      // for showing that real person. Poster mode never applies it either
      // way (a graphic composition doesn't need a locked face).
      const referenceUrl = (isPosterMode || !useReferencePhoto) ? undefined : resolveVideoReferenceUrl(intelligence.business, character);
      const logoUrl: string | undefined = intelligence.business.logo_url || undefined;
      const brandColor: string | undefined = intelligence.business.business_colors?.primary || undefined;
      // Live-action scenes with a protagonist need SOME cross-scene face/
      // body lock or the person's appearance drifts scene to scene (older,
      // younger, different skin tone) purely by chance — each scene's image
      // generation call is otherwise independent, with no memory of what a
      // previous call actually rendered. If no real reference photo is
      // configured (the default), an auto-anchor fills that role instead:
      // scene 1 is generated alone, then reused as the identity lock for
      // every other scene — see the anchor-generation step below. Computed
      // here, before visual prompts, so that prompt can be told a face-lock
      // is coming even though the actual anchor image doesn't exist yet.
      const hasProtagonist = MODES_WITH_PROTAGONIST.has(scriptJson.ad_mode);
      const needsIdentityAnchor = !isPosterMode && hasProtagonist && !referenceUrl;
      const visualPromptsJson = await step.run("generate-visual-prompts", async () => {
        const vpPrompt = getVisualPromptsPrompt(
          scriptJson.script,
          { character, videoStyle, duration, service, hasReferenceImage: !!referenceUrl || needsIdentityAnchor, adMode: scriptJson.ad_mode, videoMode, hasLogo: !!logoUrl, brandColor },
          intelligence.business
        );
        const response = await aiOrchestrator.executeTask('text', vpPrompt, 'openai');
        const jsonStr = (response as string).replace(/```json\n?|\n?```/g, "").trim();
        return JSON.parse(jsonStr);
      });

      // 4. Audio generation — one narration clip PER SCENE (not one
      // continuous track for the whole script), each measured for its
      // real spoken length. That real, measured duration (not a
      // words-per-second estimate) is what step 7 requests for that
      // scene's video clip, so every scene's audio and video are the same
      // length by construction — no separate track to drift long/short
      // against a uniformly fixed clip length. Generated one scene at a
      // time, not via Promise.all — this ElevenLabs account's plan caps
      // concurrent requests at 6, and firing every scene at once was
      // already enough on its own to blow past that (a 7-scene video =
      // 7 concurrent requests), on top of whatever else might be running
      // at the same time. Sequential costs a few extra seconds total, not
      // meaningful next to the minutes the rest of this pipeline takes.
      const sceneAudio: { url: string | null; durationSeconds: number }[] = await step.run("generate-scene-audio", async () => {
        if (audioStyle !== "Voiceover" || !voiceId) {
          return scriptJson.script.map(() => ({ url: null, durationSeconds: DEFAULT_SCENE_SECONDS }));
        }
        const languageCode = elevenLabsLanguageCode(language);
        const results: { url: string | null; durationSeconds: number }[] = [];
        for (let i = 0; i < scriptJson.script.length; i++) {
          const line = scriptJson.script[i];
          const audioBuffer = await aiOrchestrator.generateSpeech(line, voiceId, languageCode);
          const rawDuration = await getAudioDurationSeconds(audioBuffer);
          const durationSeconds = Math.min(MAX_SCENE_SECONDS, Math.max(MIN_SCENE_SECONDS, Math.round(rawDuration)));

          const fileName = `${businessId}/meta-ads/audio/${creativeId}_scene${i}_${Date.now()}.mp3`;
          const { error } = await supabase.storage.from("business_media").upload(fileName, audioBuffer, { contentType: "audio/mpeg" });
          if (error) throw new Error(`Scene ${i + 1} audio upload failed: ${error.message}`);

          const { data } = supabase.storage.from("business_media").getPublicUrl(fileName);
          results.push({ url: data.publicUrl, durationSeconds });
        }
        return results;
      });

      // 5. Trigger Images. In poster mode, or in live-action with a
      // protagonist and no real reference photo configured, scene 1 is
      // generated alone FIRST and then used as a shared anchor for every
      // other scene — each image-generation call is otherwise independent
      // with no memory of what a previous call actually rendered, so
      // without a real image to copy from, the model reinterprets either
      // the "design system" (poster mode: colors, font style, layout) or
      // the protagonist's actual face/body/skin tone (live-action) a little
      // differently every time, even when the prompt wording is consistent.
      // Anchoring the rest to a real result image costs one extra
      // generation round-trip before the remaining scenes fire in
      // parallel, in exchange for genuine consistency. Poster mode treats a
      // failed anchor as fatal (the whole design system depends on it);
      // live-action's identity anchor is a best-effort consistency
      // improvement, not a hard requirement — a failure there falls back
      // to independent per-scene generation instead of failing the video.
      let anchorUrl: string | undefined;
      if ((isPosterMode || needsIdentityAnchor) && visualPromptsJson.visual_prompts.length > 0) {
        const anchorMode = isPosterMode ? "reference" : "identity";
        const anchorJobId = await step.run("trigger-scene-anchor-image", async () => {
          const referenceImages = [referenceUrl, logoUrl].filter(Boolean) as string[];
          return aiOrchestrator.createImageTask(visualPromptsJson.visual_prompts[0].prompt, "9:16", referenceImages, anchorMode);
        });

        let anchorAttempts = 0;
        const MAX_ANCHOR_ATTEMPTS = 12;
        while (!anchorUrl && anchorAttempts < MAX_ANCHOR_ATTEMPTS) {
          await step.sleep(`wait-scene-anchor-${anchorAttempts}`, anchorAttempts === 0 ? "20s" : "15s");
          const status = await step.run(`check-scene-anchor-status-${anchorAttempts}`, async () => aiOrchestrator.checkTaskStatus(anchorJobId));
          if (status.state === "success") {
            try {
              const r = JSON.parse(status.resultJson);
              anchorUrl = r.resultUrls?.[0] || r.urls?.[0] || undefined;
            } catch { /* malformed result — treated as still-pending below */ }
          } else if (status.state === "fail") {
            if (isPosterMode) throw new Error(`Kie poster anchor image failed: ${status.failMsg || status.failCode || "no reason given"}`);
            console.error(`Identity anchor image failed, continuing without it: ${status.failMsg || status.failCode || "no reason given"}`);
            break;
          }
          anchorAttempts++;
        }
        if (isPosterMode && !anchorUrl) throw new Error("Poster anchor image generation timed out");
      }

      const imageJobIds = await step.run("trigger-images", async () => {
        const ids = [];
        for (let i = 0; i < visualPromptsJson.visual_prompts.length; i++) {
          const vp = visualPromptsJson.visual_prompts[i];
          if (anchorUrl && i === 0) {
            // Already generated above as the anchor — reuse it, no new job.
            ids.push({ id: "", url: anchorUrl as string, scene: vp.scene, imagePrompt: vp.prompt, videoScenario: vp.video_scenario, fellBack: false, state: "success" as string | null });
            continue;
          }
          const scenePrompt = isPosterMode
            ? `${vp.prompt} Match the exact background color, typography style, and overall design treatment of the attached reference image (scene 1 of this same ad) precisely — same color palette, same font style, same layout approach; only the on-scene text quoted above (and any specific photo/element this scene calls for) differs from it.`
            : vp.prompt;
          const referenceImages = isPosterMode
            ? ([anchorUrl, logoUrl].filter(Boolean) as string[])
            : ([referenceUrl || anchorUrl, logoUrl].filter(Boolean) as string[]);
          const jobId = await aiOrchestrator.createImageTask(scenePrompt, "9:16", referenceImages, isPosterMode ? "reference" : "identity");
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

      // 7. Trigger Videos in Parallel using Generated Images. Motion prompt
      // is driven by the brand archetype the script step already chose
      // (visual_mood) instead of a fixed sentence — and poster mode gets an
      // entirely different, honestly-scoped motion instruction (camera
      // movement over a static design, never "text animates in", since an
      // image-to-video model can only evolve what's already in the frame).
      const moodPhrase = MOOD_CINEMATOGRAPHY[scriptJson.visual_mood] || MOOD_CINEMATOGRAPHY.WARM_APPROACHABLE;
      const videoJobIds = await step.run("trigger-videos", async () => {
        const ids = [];
        for (let i = 0; i < imageJobIds.length; i++) {
           const imgJob = imageJobIds[i];
           // This scene's own measured narration length (clamped into
           // Kie's supported range), not a fixed "4" — see step 4.
           const clipDuration = sceneAudio[i]?.durationSeconds ?? DEFAULT_SCENE_SECONDS;
           const cinematicPrompt = isPosterMode
             ? `${imgJob.videoScenario} Smooth, slow camera movement over this static designed composition only — a gentle zoom or pan, like a camera drifting across a printed poster. Do not animate, warp, distort, or attempt to regenerate any text or graphic element — every piece of text and design must stay perfectly crisp, legible, and unchanged throughout the clip, exactly as it appears in the source image. No new elements appear that weren't already in the original image.`
             : `${imgJob.videoScenario} Cinematic ${service || intelligence.business.industry || "brand"} ad, ${moodPhrase}, shallow depth of field, smooth slow camera movement only, no cuts within clip, photorealistic quality, animate the subject naturally from the image, preserve the exact scene composition and person from the image, same color grade and lighting as the input image. The person's face, identity, body, and wardrobe must not change or drift at any point in the clip. Facial expression from the input image must be preserved exactly throughout the entire clip — do not alter or relax it.`;
           const jobId = await aiOrchestrator.createVideoTask(cinematicPrompt, [imgJob.url as string], "9:16", String(clipDuration));
           ids.push({ id: jobId, url: null as string | null, scene: imgJob.scene, cinematicPrompt, sourceImageUrl: imgJob.url as string, durationSeconds: clipDuration, resubmitted: false, state: null as string | null });
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
                job.id = await aiOrchestrator.createVideoTask(job.cinematicPrompt, [job.sourceImageUrl], "9:16", String(job.durationSeconds));
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

      // 9. Stitching via FFmpeg API — each scene's own video clip paired
      // with its own narration clip (already the same length by
      // construction from step 4/7), not one clip list plus one separate
      // bulk audio track.
      const finalVideoUrl = await step.run("stitch-video", async () => {
        const clips = videoJobIds.map((job, i) => ({
          videoUrl: job.url as string,
          audioUrl: sceneAudio[i]?.url ?? null,
          durationSeconds: job.durationSeconds,
        }));
        return submitPerSceneStitchJob(clips);
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
              audioUrls: sceneAudio.map((a) => a.url).filter(Boolean),
              ad_mode: scriptJson.ad_mode,
              visual_mood: scriptJson.visual_mood
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
