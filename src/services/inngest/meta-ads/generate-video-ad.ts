import { inngest } from "../client";
import { aiOrchestrator } from "../../ai/orchestrator";
import { createClient } from "@supabase/supabase-js";
import { getVideoAdScriptPrompt, getVisualPromptsPrompt } from "../../ai/prompts/meta-ads";
import { KieService } from "../../ai/providers/kie";
import { ElevenLabsService } from "../../ai/providers/elevenlabs";
import { FFmpegService } from "../../video/ffmpeg";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const generateVideoAd = inngest.createFunction(
  { 
    id: "generate-video-ad",
    triggers: [{ event: "meta-ads/generate-video" }]
  },
  async ({ event, step }) => {
    const { ideaPrompt, duration, audioStyle, character, voiceId, videoStyle, language, creativeId, brandId } = event.data;
    
    if (!creativeId) throw new Error("No creativeId provided");

    try {
      // 1. Fetch intelligence
      const intelligence = await step.run("fetch-intelligence", async () => {
        const { data: compData } = await supabase
          .from("meta_ad_intelligence")
          .select("*")
          .eq("brand_id", brandId)
          .eq("report_type", "competitor")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
          
        const { data: selfData } = await supabase
          .from("meta_ad_intelligence")
          .select("*")
          .eq("brand_id", brandId)
          .eq("report_type", "self")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        return {
          competitor: compData?.insights || {},
          brand: selfData?.insights || {}
        };
      });

      // 2. Generate script via LLM
      const prompt = getVideoAdScriptPrompt(intelligence, { ideaPrompt, duration, audioStyle, videoStyle, character });
      const scriptJson = await step.run("generate-script", async () => {
        const response = await aiOrchestrator.executeTask('text', prompt, 'openai');
        const jsonStr = (response as string).replace(/```json\n?|\n?```/g, "").trim();
        return JSON.parse(jsonStr);
      });

      // 3. Generate Visual Prompts via LLM
      const visualPromptsJson = await step.run("generate-visual-prompts", async () => {
        const vpPrompt = getVisualPromptsPrompt(scriptJson.script, { character, videoStyle, duration });
        const response = await aiOrchestrator.executeTask('text', vpPrompt, 'openai');
        const jsonStr = (response as string).replace(/```json\n?|\n?```/g, "").trim();
        return JSON.parse(jsonStr);
      });

      // 4. Audio Generation via ElevenLabs (Only if Voiceover)
      const audioResult = await step.run("audio-generation", async () => {
        if (audioStyle === "Voiceover" && voiceId) {
          const fullScript = scriptJson.script.join(" ");
          const audioBuffer = await ElevenLabsService.generateSpeech(fullScript, voiceId);
          
          // Upload to Supabase
          const fileName = `${brandId}/meta-ads/audio/${creativeId}_${Date.now()}.mp3`;
          const { error } = await supabase.storage.from("brand_media").upload(fileName, audioBuffer, { contentType: "audio/mpeg" });
          if (error) throw new Error("Audio upload failed: " + error.message);
          
          const { data } = supabase.storage.from("brand_media").getPublicUrl(fileName);
          return { url: data.publicUrl, isGenerated: true };
        }
        return { url: null, isGenerated: false }; // Background music only, or no voiceId
      });

      // 5. Trigger Images in Parallel
      const imageJobIds = await step.run("trigger-images", async () => {
        const ids = [];
        for (const vp of visualPromptsJson.visual_prompts) {
           const jobId = await KieService.createImageTask(vp.prompt, "9:16");
           ids.push({ id: jobId, url: null as string | null, scene: vp.scene, prompt: vp.video_scenario });
        }
        return ids;
      });

      // 6. Poll for all images completion
      let imagesDone = false;
      let imgAttempts = 0;
      while (!imagesDone && imgAttempts < 8) {
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
              } catch (e) { pending = true; }
            } else if (status.state === "failed" || status.state === "error") {
              throw new Error(`Kie Image Failed`);
            } else { pending = true; }
          }
          return { imageJobIds, allComplete: !pending };
        });
        for (let i = 0; i < imageJobIds.length; i++) { imageJobIds[i].url = pollResult.imageJobIds[i].url; }
        imagesDone = pollResult.allComplete;
        imgAttempts++;
      }
      if (!imagesDone) throw new Error("Image Generation Timed Out");

      // 7. Trigger Videos in Parallel using Generated Images
      const videoJobIds = await step.run("trigger-videos", async () => {
        const ids = [];
        for (const imgJob of imageJobIds) {
           const cinematicPrompt = `${imgJob.prompt} Cinematic medical tourism ad, warm 3200K golden-hour color grade, bold golds and deep teals, shallow depth of field, smooth slow camera movement only, no cuts within clip, photorealistic quality, animate the subject naturally from the image, preserve the exact scene composition and person from the image. Facial expression from the input image must be preserved exactly throughout the entire clip.`;
           const jobId = await KieService.createVideoTask(cinematicPrompt, [imgJob.url as string], "9:16", "4");
           ids.push({ id: jobId, url: null as string | null });
        }
        return ids;
      });

      // 8. Poll for all videos completion
      let videosDone = false;
      let vidAttempts = 0;
      while (!videosDone && vidAttempts < 12) {
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
              } catch (e) { pending = true; }
            } else if (status.state === "failed" || status.state === "error") {
              throw new Error(`Kie Video Failed`);
            } else { pending = true; }
          }
          return { videoJobIds, allComplete: !pending };
        });
        for (let i = 0; i < videoJobIds.length; i++) { videoJobIds[i].url = pollResult.videoJobIds[i].url; }
        videosDone = pollResult.allComplete;
        vidAttempts++;
      }
      if (!videosDone) throw new Error("Video Generation Timed Out");

      const clipUrls = videoJobIds.map(j => j.url).filter(Boolean) as string[];

      // 9. Stitching via FFmpeg API
      const finalVideoUrl = await step.run("stitch-video", async () => {
        const CLIP_DURATION = 4;
        const totalVideoDuration = clipUrls.length * CLIP_DURATION;
        const hasAudio = !!audioResult.url;
        const outputDuration = totalVideoDuration; // Fallback since we don't have exact audio duration yet

        const videoInputFlags = clipUrls.map((_, i) => `-i {input${i}}`).join(" ");
        const audioInputFlag = hasAudio ? ` -i {input${clipUrls.length}}` : "";
        const inputs = `${videoInputFlags}${audioInputFlag}`;

        const filterParts = [];
        clipUrls.forEach((_, i) => {
          filterParts.push(`[${i}:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24[v${i}]`);
        });

        const concatInputs = clipUrls.map((_, i) => `[v${i}]`).join("");
        const concatPart = `${concatInputs}concat=n=${clipUrls.length}:v=1:a=0,format=yuv420p[v]`;
        filterParts.push(concatPart);
        const filterComplex = filterParts.join(",");

        const audioMap = hasAudio ? `-map ${clipUrls.length}:a ` : "";
        const audioEncode = hasAudio ? `-c:a aac -b:a 192k -ar 44100 -ac 2 ` : `-an `;

        const fullCommand = `ffmpeg -y ${inputs} -filter_complex "${filterComplex}" -map "[v]" ${audioMap}-t ${outputDuration.toFixed(2)} -c:v libx264 -preset superfast -crf 23 ${audioEncode}-avoid_negative_ts make_zero -movflags +faststart {output}`;

        const jobId = await FFmpegService.submitJob({
          files: hasAudio ? [...clipUrls, audioResult.url] : [...clipUrls],
          command: fullCommand,
          outputExtension: "mp4"
        });

        return jobId;
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
        const { FFmpegService } = await import("../../video/ffmpeg");
        
        // Fetch the video buffer using the service's auth token
        const response = await fetch(stitchedVideoUrl, {
          // @ts-ignore - access private auth token for this internal step
          headers: { "Authorization": FFmpegService.AUTH_TOKEN }
        });

        if (!response.ok) throw new Error(`Failed to download stitched video: ${response.status}`);
        
        const videoBuffer = await response.arrayBuffer();
        
        const fileName = `${brandId}/meta-ads/videos/${creativeId}_${Date.now()}.mp4`;
        const { error } = await supabase.storage
          .from("brand_media")
          .upload(fileName, videoBuffer, { contentType: "video/mp4" });
          
        if (error) throw new Error("Video upload to Supabase failed: " + error.message);
        
        const { data } = supabase.storage.from("brand_media").getPublicUrl(fileName);
        return data.publicUrl;
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
