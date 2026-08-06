import { FFmpegService } from "./client";

export interface StitchScenesOptions {
  clipUrls: string[];
  /** Omit for a silent/music-bed video; when present, mixed in as the one audio track. */
  audioUrl?: string | null;
  clipDurationSeconds?: number;
}

/**
 * Builds the multi-clip vertical-video concat FFmpeg command (scale/pad
 * every clip to 1080x1920, concat them in order, optionally mux in one
 * audio track) and submits it as an FFmpeg API job. Shared by the Meta
 * Ads and Social video pipelines — both stitch Kie-generated per-scene
 * clips into one final video the exact same way.
 *
 * Callers still own the actual step.sleep/step.run polling loop — Inngest
 * steps can't live inside an imported helper — this only removes the
 * duplicated command-building that used to be copy-pasted in both jobs.
 *
 * `outputDuration` used to be a pure assumption (`clipUrls.length x
 * clipDurationSeconds`) with no guarantee any given Kie clip actually came
 * back at exactly that length — generative video models commonly return a
 * clip a few tenths of a second short or long of what was requested. Each
 * clip is now force-conformed to exactly `clipDurationSeconds` before the
 * concat (`tpad` freeze-pads a short clip with its own last frame, `trim`
 * cuts a long one — applying both unconditionally, in that order, is a
 * standard way to land on an exact duration regardless of which direction
 * the input actually drifted), so `outputDuration` is now a real guarantee
 * instead of a hope. The audio track is `apad`-padded with silence so it
 * always covers the full output length even if the narration naturally
 * runs shorter than the scene count implies — the final `-t` still trims
 * anything longer, same as before. This narrows, but doesn't fully
 * eliminate, audio/video drift: the remaining source is that one
 * continuous narration track is laid over evenly-spaced fixed-length
 * scenes, while spoken sentences naturally vary in length — perfectly
 * mapping each line's real spoken duration to its own scene would need
 * per-line TTS with measured timestamps, a larger change than this fix.
 */
export async function submitSceneStitchJob({ clipUrls, audioUrl, clipDurationSeconds = 4 }: StitchScenesOptions): Promise<string> {
  const hasAudio = !!audioUrl;
  const outputDuration = clipUrls.length * clipDurationSeconds;

  const videoInputFlags = clipUrls.map((_, i) => `-i {input${i}}`).join(" ");
  const audioInputFlag = hasAudio ? ` -i {input${clipUrls.length}}` : "";
  const inputs = `${videoInputFlags}${audioInputFlag}`;

  const filterParts: string[] = [];
  clipUrls.forEach((_, i) => {
    filterParts.push(
      `[${i}:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24,tpad=stop_mode=clone:stop_duration=${clipDurationSeconds},trim=duration=${clipDurationSeconds},setpts=PTS-STARTPTS[v${i}]`
    );
  });
  const concatInputs = clipUrls.map((_, i) => `[v${i}]`).join("");
  filterParts.push(`${concatInputs}concat=n=${clipUrls.length}:v=1:a=0,format=yuv420p[v]`);
  if (hasAudio) filterParts.push(`[${clipUrls.length}:a]apad[aout]`);
  const filterComplex = filterParts.join(",");

  const audioMap = hasAudio ? `-map "[aout]" ` : "";
  const audioEncode = hasAudio ? `-c:a aac -b:a 192k -ar 44100 -ac 2 ` : `-an `;

  const fullCommand = `ffmpeg -y ${inputs} -filter_complex "${filterComplex}" -map "[v]" ${audioMap}-t ${outputDuration.toFixed(2)} -c:v libx264 -preset superfast -crf 23 ${audioEncode}-avoid_negative_ts make_zero -movflags +faststart {output}`;

  return FFmpegService.submitJob({
    files: hasAudio ? [...clipUrls, audioUrl as string] : [...clipUrls],
    command: fullCommand,
    outputExtension: "mp4",
  });
}

export interface DownloadAndStoreVideoOptions {
  sourceUrl: string;
  /** Full object path within the `business_media` bucket, e.g.
   * `${businessId}/social/videos/${Date.now()}.mp4`. */
  storagePath: string;
}

export interface DownloadAndStoreVideoResult {
  publicUrl: string;
  sizeBytes: number;
}

/** Downloads a finished FFmpeg render (hosted on Upload-Post's own
 * storage) and re-uploads it into our own `business_media` bucket, so the
 * final asset is durable and reusable rather than depending on Upload-Post
 * retaining the file. `supabase` is whatever service-role client the
 * calling job already created. */
export async function downloadAndStoreVideo(supabase: any, { sourceUrl, storagePath }: DownloadAndStoreVideoOptions): Promise<DownloadAndStoreVideoResult> {
  const response = await fetch(sourceUrl, { headers: FFmpegService.getHeaders() });
  if (!response.ok) throw new Error(`Failed to download stitched video: ${response.status}`);
  const videoBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage.from("business_media").upload(storagePath, videoBuffer, { contentType: "video/mp4" });
  if (error) throw new Error("Video upload to Supabase failed: " + error.message);

  const { data } = supabase.storage.from("business_media").getPublicUrl(storagePath);
  return { publicUrl: data.publicUrl, sizeBytes: videoBuffer.byteLength };
}
