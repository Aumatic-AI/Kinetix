// ElevenLabs TTS and Voice Cloning API
import { env } from "@/config";

/** Maps the language dropdown's display name (Create Ad / Create Post
 * modals — Meta Ads and Social share the exact same option list) to the
 * ISO 639-1 code ElevenLabs' `language_code` param expects. `eleven_flash_v2_5`
 * (the model in use here) supports this enforcement param, but only for
 * languages actually in its own supported-language list — adding an entry
 * here for a language that model doesn't support (Hebrew was tried and
 * removed: real 400 "does not support language_code" errors, since the
 * model doesn't support Hebrew AT ALL, not just the param) just moves the
 * failure here instead of fixing it. Verify against ElevenLabs' current
 * model docs before adding a new entry, don't assume. */
const LANGUAGE_CODE_MAP: Record<string, string> = {
  english: "en",
  spanish: "es",
  french: "fr",
  turkish: "tr",
};

export function elevenLabsLanguageCode(language?: string | null): string | undefined {
  if (!language) return undefined;
  return LANGUAGE_CODE_MAP[language.toLowerCase().trim()];
}

export class ElevenLabsService {
  private static API_BASE = "https://api.elevenlabs.io/v1";

  private static getHeaders() {
    const apiKey = env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY is missing");

    return {
      "xi-api-key": apiKey,
      "Content-Type": "application/json"
    };
  }

  /**
   * Generate Text-to-Speech audio. `languageCode` (ISO 639-1, e.g. "he" for
   * Hebrew) explicitly enforces the spoken language instead of relying on
   * eleven_flash_v2_5's own auto-detection from the text alone — pass it
   * whenever the caller already knows the script's language (map the UI's
   * language name through `elevenLabsLanguageCode` first).
   *
   * Retries on a 429 (this account's plan caps concurrent requests at 6,
   * and both video pipelines now call this once per scene) with a short
   * backoff before giving up — a brief collision with another
   * simultaneously-running generation should self-heal here rather than
   * failing the whole Inngest step, which would otherwise redo every scene
   * already generated successfully in this same batch, not just the one
   * that hit the limit.
   */
  static async generateSpeech(text: string, voiceId: string = "21m00Tcm4TlvDq8ikWAM", languageCode?: string) {
    const MAX_ATTEMPTS = 5;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let response: Response;
      try {
        response = await fetch(`${this.API_BASE}/text-to-speech/${voiceId}`, {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({
            text,
            model_id: "eleven_flash_v2_5",
            ...(languageCode ? { language_code: languageCode } : {}),
            // Tuned for clear, consistent narration over creative variety —
            // low stability + high style exaggeration is what was causing
            // occasional slurred/fumbled words. Higher stability trades some
            // expressiveness for reliably clear delivery; speaker_boost is
            // ElevenLabs' own clarity/similarity enhancer.
            voice_settings: {
              stability: 0.75,
              similarity_boost: 0.8,
              style: 0.3,
              use_speaker_boost: true
            }
          })
        });
      } catch (error) {
        // Network-level failure, not an API error response — not the
        // concurrency issue this retry exists for, so fail immediately
        // rather than retrying, same as before this change.
        console.error("ElevenLabs TTS Error:", error);
        throw error;
      }

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }

      // ElevenLabs puts the actually useful diagnostic (e.g. quota_exceeded
      // with exact credits remaining/required) in the JSON body, not the
      // status text — a bare "Unauthorized" hides what's really wrong.
      const body = await response.text();
      let detail = body;
      try {
        const parsed = JSON.parse(body);
        detail = parsed?.detail?.message || parsed?.detail?.status || body;
      } catch {
        // body wasn't JSON — fall back to the raw text above
      }

      if (response.status === 429 && attempt < MAX_ATTEMPTS) {
        const delayMs = 2000 * attempt;
        console.warn(`ElevenLabs 429 (attempt ${attempt}/${MAX_ATTEMPTS}) — retrying in ${delayMs}ms`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      const err = new Error(`ElevenLabs API Error (${response.status}): ${detail}`);
      console.error("ElevenLabs TTS Error:", err);
      throw err;
    }
    throw new Error("ElevenLabs TTS failed after retries");
  }
}
