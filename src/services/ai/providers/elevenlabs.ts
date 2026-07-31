// ElevenLabs TTS and Voice Cloning API
import { env } from "@/config";

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
   * Generate Text-to-Speech audio
   */
  static async generateSpeech(text: string, voiceId: string = "21m00Tcm4TlvDq8ikWAM") {
    try {
      const response = await fetch(`${this.API_BASE}/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          text,
          model_id: "eleven_flash_v2_5",
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

      if (!response.ok) {
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
        throw new Error(`ElevenLabs API Error (${response.status}): ${detail}`);
      }

      // Returns the raw audio buffer
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error("ElevenLabs TTS Error:", error);
      throw error;
    }
  }
}
