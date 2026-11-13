import { inngest } from "../client";
import { aiOrchestrator } from "../../ai/orchestrator";
import { createClient } from "@supabase/supabase-js";
import { getSocialCaptionPrompt, formatPlatformCaptions, SocialPlatform } from "../../../prompts/social-media";
import { oneShotDuration, oneShotReferences, type OneShotChoices } from "../../../prompts/one-shot-video";
import { generateOneShotPlan, writeOneShotVideoPrompt, type OneShotPlan } from "../../ai/one-shot-video";
import { fitSeedanceReferences } from "../../ai/seedance-references";
import { FFmpegService } from "../../ffmpeg";
import { submitLogoWatermarkJob } from "../../ffmpeg/logo-watermark";
import { env } from "@/config";

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY!);

/** 480p keeps a 30-second video at about $4.20 on Kie (720p would be about $9.45). */
const RESOLUTION = "480p" as const;

/** Waiting for Seedance: first look after 90 s, then every 30 s, up to about 20 minutes. */
const MAX_VIDEO_POLLS = 40;

/** The logo step on the FFmpeg service: checked every 20 s, up to 5 minutes. */
const MAX_LOGO_POLLS = 15;

/** A real video never compresses to almost nothing; a tiny file is a blank clip from Kie's safety filter. */
const MIN_VIDEO_BYTES_PER_SECOND = 15000;

async function remoteSize(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    const len = res.headers.get("content-length");
    return len ? parseInt(len, 10) : null;
  } catch {
    return null;
  }
}

function resultUrl(resultJson: string | undefined): string | null {
  try {
    const r = JSON.parse(resultJson || "{}");
    return r.resultUrls?.[0] || r.urls?.[0] || null;
  } catch {
    return null;
  }
}

/**
 * One-shot social video: the approved plan (concept + spoken lines) → one
 * prompt written by OpenAI → Seedance 2.5 makes the whole video in one go (the
 * main character from the business's reference photo, speech, music) →
 * our code puts the exact logo top-right (FFmpeg) → saved to the
 * Media Library, and the social_posts rows become drafts with their post text.
 *
 * The default story is fixed, the idea can change it (shared prompts in
 * src/prompts/one-shot-video, the same as Meta Ads'). Replaces the per-scene
 * pipeline (generate-social-video.ts) for videos started from CreatePostModal;
 * that one stays in the code for older posts and their retries.
 */
export const generateSocialOneShotVideo = inngest.createFunction(
  { id: "generate-social-one-shot-video", triggers: [{ event: "social/generate-one-shot-video" }] },
  async ({ event, step }) => {
    const { businessId, platforms = [], socialPostIds = [] } = event.data as {
      businessId: string;
      platforms?: SocialPlatform[];
      socialPostIds?: string[];
    };
    const choices: Omit<OneShotChoices, "hasCharacterPhoto"> = {
      channel: "social_post",
      voice: event.data.audioStyle !== "No Voice",
      ideaPrompt: String(event.data.ideaPrompt || ""),
      service: event.data.service ? String(event.data.service) : undefined,
      duration: oneShotDuration(event.data.duration),
      aspectRatio: event.data.aspectRatio === "16:9" ? "16:9" : "9:16",
      character: event.data.character === "female" ? "female" : "male",
      videoStyle: event.data.videoStyle || undefined,
      videoMode: event.data.videoMode === "animated_poster" ? "animated_poster" : "live_action",
      language: event.data.language || "English",
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const business: any = await step.run("fetch-business", async () => {
        const { data } = await supabase.from("businesses").select("*").eq("id", businessId).single();
        if (!data) throw new Error("Business not found");
        return data;
      });

      // 1. Post text per platform — only when it will be posted somewhere
      let platformCaptions: ReturnType<typeof formatPlatformCaptions> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let captionMeta: any = null;
      if (platforms.length) {
        captionMeta = await step.run("generate-captions", async () => {
          const prompt = getSocialCaptionPrompt(business, { ideaPrompt: choices.ideaPrompt, contentType: "video", language: choices.language });
          const response = await aiOrchestrator.executeTask("analysis", prompt.user, "openai", { systemPrompt: prompt.system });
          return JSON.parse((response as string).replace(/```json\n?|\n?```/g, "").trim());
        });
        platformCaptions = formatPlatformCaptions(captionMeta, platforms);
      }

      // 2. The reference photo of the main character (male or female, from Settings; always used when
      //    uploaded) and the brand image, fitted to Seedance's size rules. The brand image is sent only if the
      //    writer uses it in a shot (step 5); our code puts the exact logo top-right afterwards (step 6)
      const references = await step.run("prepare-references", () =>
        fitSeedanceReferences(supabase, `${businessId}/social/one-shot/${Date.now()}`, oneShotReferences(business, choices.character, true))
      );
      const fullChoices: OneShotChoices = { ...choices, hasCharacterPhoto: references.some((r) => !r.optional) };

      // 3. The plan the user approved in the modal; a retry without one writes it again
      const sent = event.data.script as Partial<OneShotPlan> | undefined;
      const plan: OneShotPlan =
        sent && (sent.script?.length || sent.concept)
          ? { concept: String(sent.concept || ""), script: (sent.script ?? []).map(String) }
          : await step.run("generate-plan", () => generateOneShotPlan(business, fullChoices));

      // 4. One prompt for the whole video. If it still asks to show written words (which Seedance misspells),
      //    the writer gets one rewrite with the problems named; a second miss stops here, before Kie is paid
      const images = references.map((r) => r.what);
      let written = await step.run("write-video-prompt", () => writeOneShotVideoPrompt(business, fullChoices, plan, images));
      if (written.problems.length) {
        const problems = written.problems;
        console.error(`[ONE_SHOT_SOCIAL_VIDEO] Video prompt asked for written words, rewriting: ${problems.join(" | ")}`);
        written = await step.run("rewrite-video-prompt", () => writeOneShotVideoPrompt(business, fullChoices, plan, images, problems));
        if (written.problems.length) {
          throw new Error(`The video prompt kept asking for words in the picture, which the video model misspells (${written.problems[0]}). Try again, or reword the idea without on-screen words.`);
        }
      }

      // 5. Seedance 2.5 makes the video
      const request = {
        prompt: written.videoPrompt,
        referenceImageUrls: references.filter((r) => !r.optional || written.useBrandImage).map((r) => r.url),
        durationSeconds: choices.duration,
        aspectRatio: choices.aspectRatio,
        resolution: RESOLUTION,
      };
      let taskId = await step.run("start-video", () => aiOrchestrator.createFullVideoTask(request));
      let resubmitted = false;
      let videoUrl: string | null = null;

      for (let i = 0; i < MAX_VIDEO_POLLS && !videoUrl; i++) {
        await step.sleep(`wait-video-${i}`, i === 0 ? "90s" : "30s");
        const check = await step.run(`check-video-${i}`, async () => {
          const status = await aiOrchestrator.checkTaskStatus(taskId);
          if (status.state === "success") {
            const url = resultUrl(status.resultJson);
            if (!url) return { outcome: "bad" as const, reason: "Kie said the video was ready but sent no link" };
            const size = await remoteSize(url);
            if (size !== null && size < choices.duration * MIN_VIDEO_BYTES_PER_SECOND) {
              return { outcome: "bad" as const, reason: `the video came back almost empty (${size} bytes), likely blocked by Kie's safety filter` };
            }
            return { outcome: "done" as const, url };
          }
          if (status.state === "fail") return { outcome: "bad" as const, reason: String(status.failMsg || status.failCode || "no reason given") };
          return { outcome: "waiting" as const, state: String(status.state ?? "") };
        });

        if (check.outcome === "done") videoUrl = check.url;
        else if (check.outcome === "bad") {
          // One more try with the same request; a second refusal is final
          if (resubmitted) throw new Error(`Seedance couldn't make this video twice: ${check.reason}`);
          console.error(`[ONE_SHOT_SOCIAL_VIDEO] Seedance task ${taskId} failed (${check.reason}), trying once more`);
          taskId = await step.run(`restart-video-${i}`, () => aiOrchestrator.createFullVideoTask(request));
          resubmitted = true;
        }
      }
      if (!videoUrl) throw new Error("Seedance didn't finish the video within 20 minutes. Try again.");
      const seedanceUrl = videoUrl;

      // 6. The logo, top-right like every other video, put on by FFmpeg. If that fails the paid-for video is
      //    still kept, without the logo, and the reason is saved with it
      const logoUrl: string | null = business.logo_url || null;
      let logoed: { url: string } | null = null;
      let logoError: string | null = null;
      if (logoUrl) {
        const submitted = await step.run("add-logo", async () => {
          try {
            return { jobId: await submitLogoWatermarkJob(seedanceUrl, logoUrl, choices.aspectRatio), error: null };
          } catch (e) {
            return { jobId: null, error: e instanceof Error ? e.message : String(e) };
          }
        });
        logoError = submitted.error;
        const jobId = submitted.jobId ?? "";
        for (let i = 0; i < MAX_LOGO_POLLS && jobId && !logoed && !logoError; i++) {
          await step.sleep(`wait-logo-${i}`, "20s");
          const status = await step.run(`check-logo-${i}`, async () => {
            const s = await FFmpegService.checkStatus(jobId);
            return { status: s.status, url: s.url ?? null, error: s.error ?? null };
          });
          if (status.status === "finished" && status.url) logoed = { url: status.url };
          else if (status.status === "failed" || status.status === "error") logoError = status.error || "the logo step failed";
        }
        if (!logoed && !logoError) logoError = "the logo step didn't finish in time";
        if (logoError) console.error(`[ONE_SHOT_SOCIAL_VIDEO] Saved without the logo: ${logoError}`);
      }
      const finished = logoed;

      // 7. Into the Media Library
      const stored = await step.run("store-media-asset", async () => {
        // The logo version lives on the FFmpeg service, which needs its key to download
        const res = finished ? await fetch(finished.url, { headers: FFmpegService.getHeaders() }) : await fetch(seedanceUrl);
        if (!res.ok) throw new Error(`Couldn't download the finished video (status ${res.status})`);
        const buffer = await res.arrayBuffer();
        const storagePath = `${businessId}/social/videos/${Date.now()}.mp4`;
        const { error: uploadError } = await supabase.storage.from("business_media").upload(storagePath, buffer, { contentType: "video/mp4" });
        if (uploadError) throw new Error("Video upload to Supabase failed: " + uploadError.message);
        const publicUrl = supabase.storage.from("business_media").getPublicUrl(storagePath).data.publicUrl;

        const { data: asset, error: assetError } = await supabase
          .from("media_assets")
          .insert({
            business_id: businessId,
            type: "video",
            source: "ai_generated",
            bucket: "business_media",
            storage_path: storagePath,
            mime_type: "video/mp4",
            size_bytes: buffer.byteLength,
            duration_seconds: choices.duration,
            metadata: {
              publicUrl, pipeline: "one_shot", title: written.title, concept: plan.concept, script: plan.script,
              videoPrompt: written.videoPrompt, ideaPrompt: choices.ideaPrompt, character: choices.character,
              videoStyle: choices.videoStyle, videoMode: choices.videoMode, voice: choices.voice, language: choices.language,
              service: choices.service, aspectRatio: choices.aspectRatio, kieTaskId: taskId,
              brandImageInVideo: written.useBrandImage,
              logo: finished ? "top-right" : logoUrl ? `missing: ${logoError}` : "none on file",
            },
          })
          .select()
          .single();
        if (assetError || !asset) throw new Error("Failed to save media asset: " + assetError?.message);
        return { assetId: asset.id as string };
      });

      // 8. Every social_posts row gets the video and its own post text
      if (socialPostIds.length) {
        await step.run("finalize", async () => {
          for (let i = 0; i < socialPostIds.length; i++) {
            const platformCaption = platformCaptions[platforms[i]];
            await supabase
              .from("social_posts")
              .update({
                status: "draft",
                media_asset_id: stored.assetId,
                caption: platformCaption?.text || captionMeta?.caption || "",
                title: platformCaption?.title || null,
                generation_inputs: { ...event.data, pipeline: "one_shot", captionMeta, script: plan, title: written.title },
              })
              .eq("id", socialPostIds[i]);
          }
        });
      }

      return { success: true, socialPostIds, mediaAssetId: stored.assetId };
    } catch (e) {
      if (socialPostIds.length) {
        await supabase
          .from("social_posts")
          .update({ status: "failed", error_message: (e instanceof Error ? e.message : String(e)).slice(0, 500) })
          .in("id", socialPostIds);
      }
      throw e;
    }
  }
);
