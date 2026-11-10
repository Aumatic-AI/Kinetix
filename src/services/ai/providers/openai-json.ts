import OpenAI from "openai";
import { env } from "@/config";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

/**
 * A text call that must come back as one valid JSON object (OpenAI's JSON
 * mode). Used where the answer carries long free text — the one-shot video
 * prompt runs to thousands of characters — so it never arrives as broken JSON.
 * The prompt itself must mention JSON (OpenAI requires it for this mode).
 */
export class OpenAIJsonService {
  static async generateJson(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: prompt });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.8,
      response_format: { type: "json_object" },
      max_tokens: 8000,
    });
    const choice = completion.choices[0];
    if (choice?.finish_reason === "length") throw new Error("OpenAI's answer was cut off before it finished. Try again.");
    return choice?.message?.content || "";
  }
}
