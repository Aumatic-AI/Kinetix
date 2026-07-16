import { inngest } from "../client";
import { aiOrchestrator } from "../../ai/orchestrator";
import { createClient } from "@supabase/supabase-js";
import { getSocialVideoScriptPrompt, getSocialCaptionPrompt, formatPlatformCaptions, SocialPlatform } from "../../ai/prompts/social-media";
import { getVisualPromptsPrompt } from "../../ai/prompts/meta-ads";
import { KieService } from "../../ai/providers/kie";
import { ElevenLabsService } from "../../ai/providers/elevenlabs";
import { FFmpegService } from "../../video/ffmpeg";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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
        const audioBuffer = await ElevenLabsService.generateSpeech(fullScript, voiceId);
        const fileName = `${businessId}/social/audio/${Date.now()}.mp3`;
        const { error } = await supabase.storage.from("business_media").upload(fileName, audioBuffer, { contentType: "audio/mpeg" });
        if (error) throw new Error("Audio upload failed: " + error.message);
        const { data } = supabase.storage.from("business_media").getPublicUrl(fileName);
        return { url: data.publicUrl };
      });

      // 5. Trigger per-scene images
      const imageJobIds = await step.run("trigger-images", async () => {
        const ids = [];
        for (const vp of visualPromptsJson.visual_prompts) {
          const jobId = await KieService.createImageTask(vp.prompt, "9:16");
          ids.push({ id: jobId, url: null as string | null, scene: vp.scene, prompt: vp.video_scenario });
        }
        return ids;
      });

      // 6. Poll images (same budget as the proven Meta Ads job)
      let imagesDone = false;
      let imgAttempts = 0;
      const MAX_IMAGE_ATTEMPTS = 12;
      while (!imagesDone && imgAttempts < MAX_IMAGE_ATTEMPTS) {
        await step.sleep(`wait-image-${imgAttempts}`, imgAttempts === 0 ? "30s" : "20s");
        const pollResult = await step.run(`check-image-status-${imgAttempts}`, async () => {
          let pending = false;
          for (let i = 0; i < imageJobIds.length; i++) {
            if (imageJobIds[i].url) continue;
            const status = await KieService.checkSingleTaskStatus(imageJobIds[i].id);
            if (status.state === "success") {
              try {
                const r = JSON.parse(status.resultJson);
                imageJobIds[i].url = r.resultUrls?.[0] || r.urls?.[0] || null;
              } catch { pending = true; }
            } else if (status.state === "failed" || status.state === "error") {
              throw new Error(`Kie Image Failed for scene ${i + 1} (job ${imageJobIds[i].id}): ${JSON.stringify(status)}`);
            } else { pending = true; }
          }
          return { imageJobIds, allComplete: !pending };
        });
        for (let i = 0; i < imageJobIds.length; i++) { imageJobIds[i].url = pollResult.imageJobIds[i].url; }
        imagesDone = pollResult.allComplete;
        imgAttempts++;
      }
      if (!imagesDone) {
        const stuck = imageJobIds.filter((j) => !j.url).map((j) => `scene ${j.scene}`);
        throw new Error(`Image Generation Timed Out. Still pending: ${stuck.join(", ")}`);
      }

      // 7. Trigger per-scene videos (image-to-video)
      const videoJobIds = await step.run("trigger-videos", async () => {
        const ids = [];
        for (const imgJob of imageJobIds) {
          const cinematicPrompt = `${imgJob.prompt} Cinematic social content, natural color grade, shallow depth of field, smooth slow camera movement only, no cuts within clip, photorealistic quality, animate the subject naturally from the image, preserve the exact scene composition and person from the image.`;
          const jobId = await KieService.createVideoTask(cinematicPrompt, [imgJob.url as string], "9:16", "4");
          ids.push({ id: jobId, url: null as string | null, scene: imgJob.scene });
        }
        return ids;
      });

      // 8. Poll videos (same generous budget as the proven Meta Ads job)
      let videosDone = false;
      let vidAttempts = 0;
      const MAX_VIDEO_ATTEMPTS = 25;
      while (!videosDone && vidAttempts < MAX_VIDEO_ATTEMPTS) {
        await step.sleep(`wait-video-${vidAttempts}`, vidAttempts === 0 ? "40s" : "30s");
        const pollResult = await step.run(`check-video-status-${vidAttempts}`, async () => {
          let pending = false;
          for (let i = 0; i < videoJobIds.length; i++) {
            if (videoJobIds[i].url) continue;
            const status = await KieService.checkSingleTaskStatus(videoJobIds[i].id);
            if (status.state === "success") {
              try {
                const r = JSON.parse(status.resultJson);
                videoJobIds[i].url = r.resultUrls?.[0] || r.urls?.[0] || null;
              } catch { pending = true; }
            } else if (status.state === "failed" || status.state === "error") {
              throw new Error(`Kie Video Failed for scene ${videoJobIds[i].scene} (job ${videoJobIds[i].id}): ${JSON.stringify(status)}`);
            } else { pending = true; }
          }
          return { videoJobIds, allComplete: !pending };
        });
        for (let i = 0; i < videoJobIds.length; i++) { videoJobIds[i].url = pollResult.videoJobIds[i].url; }
        videosDone = pollResult.allComplete;
        vidAttempts++;
      }
      if (!videosDone) {
        const stuck = videoJobIds.filter((j) => !j.url).map((j) => `scene ${j.scene}`);
        throw new Error(`Video Generation Timed Out. Still pending: ${stuck.join(", ")}`);
      }

      const clipUrls = videoJobIds.map((j) => j.url).filter(Boolean) as string[];

      // 9. Stitch via FFmpeg
      const finalVideoUrl = await step.run("stitch-video", async () => {
        const CLIP_DURATION = 4;
        const outputDuration = clipUrls.length * CLIP_DURATION;

        const videoInputFlags = clipUrls.map((_, i) => `-i {input${i}}`).join(" ");
        const inputs = `${videoInputFlags} -i {input${clipUrls.length}}`;

        const filterParts: string[] = [];
        clipUrls.forEach((_, i) => {
          filterParts.push(`[${i}:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24[v${i}]`);
        });
        const concatInputs = clipUrls.map((_, i) => `[v${i}]`).join("");
        filterParts.push(`${concatInputs}concat=n=${clipUrls.length}:v=1:a=0,format=yuv420p[v]`);
        const filterComplex = filterParts.join(",");

        const fullCommand = `ffmpeg -y ${inputs} -filter_complex "${filterComplex}" -map "[v]" -map ${clipUrls.length}:a -t ${outputDuration.toFixed(2)} -c:v libx264 -preset superfast -crf 23 -c:a aac -b:a 192k -ar 44100 -ac 2 -avoid_negative_ts make_zero -movflags +faststart {output}`;

        return await FFmpegService.submitJob({
          files: [...clipUrls, audioResult.url],
          command: fullCommand,
          outputExtension: "mp4",
        });
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
        const response = await fetch(stitchedVideoUrl, { headers: FFmpegService.getHeaders() });
        if (!response.ok) throw new Error(`Failed to download stitched video: ${response.status}`);
        const videoBuffer = await response.arrayBuffer();

        const fileName = `${businessId}/social/videos/${Date.now()}.mp4`;
        const { error } = await supabase.storage.from("business_media").upload(fileName, videoBuffer, { contentType: "video/mp4" });
        if (error) throw new Error("Video upload to Supabase failed: " + error.message);

        const { data: publicUrlData } = supabase.storage.from("business_media").getPublicUrl(fileName);

        const { data: asset, error: assetError } = await supabase
          .from("media_assets")
          .insert({
            business_id: businessId,
            type: "video",
            source: "ai_generated",
            bucket: "business_media",
            storage_path: fileName,
            mime_type: "video/mp4",
            size_bytes: videoBuffer.byteLength,
            duration_seconds: clipUrls.length * 4,
            metadata: { publicUrl: publicUrlData.publicUrl, script: scriptJson.script, ideaPrompt, videoStyle, language, service, backgroundSong },
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
