import { FFmpegService } from "./client";

/**
 * Puts the business logo on a finished one-shot video as a watermark: top-right
 * corner, about 8% of the frame height, 70% opacity — the same placement the
 * per-scene pipeline's stitch uses (stitch-scenes.ts), so every video looks
 * alike. Done by code, not by the video model, so it's the exact logo file,
 * pixel-identical on every frame.
 *
 * The command is written exactly like the stitch's, which the FFmpeg service
 * accepts: filter parts joined with commas (no ";") and plain stream maps (no
 * "?"); the service refuses other shapes with a bare 400.
 */

/** Seedance 2.5's frame at 480p */
const FRAME = { "9:16": { width: 480, height: 854 }, "16:9": { width: 854, height: 480 } } as const;

export async function submitLogoWatermarkJob(videoUrl: string, logoUrl: string, aspectRatio: "9:16" | "16:9"): Promise<string> {
  const { width, height } = FRAME[aspectRatio];
  const logoHeight = Math.round((height * 0.08) / 2) * 2;
  const margin = Math.round(width * 0.03);
  const filterComplex = [
    "[0:v]format=yuv420p[vbase]",
    `[1:v]scale=-2:${logoHeight},format=rgba,colorchannelmixer=aa=0.7[wm]`,
    `[vbase][wm]overlay=W-w-${margin}:${margin}[v]`,
  ].join(",");
  // Seedance videos always carry sound (generate_audio is on), so the audio stream is mapped as it is
  const command = `ffmpeg -y -i {input0} -i {input1} -filter_complex "${filterComplex}" -map "[v]" -map 0:a -c:v libx264 -preset superfast -crf 23 -c:a aac -b:a 192k -ar 44100 -ac 2 -avoid_negative_ts make_zero -movflags +faststart {output}`;
  return FFmpegService.submitJob({ files: [videoUrl, logoUrl], command, outputExtension: "mp4" });
}
