/** Short, single-purpose instruction for a targeted photo edit. Sent
 * together with the current RAW photo (pre-compositing) as the reference
 * image — never the already-composited final image, so the edit never has
 * to fight with baked-in text.
 *
 * The rule is simple: do exactly what the instruction says, fully — a
 * small tweak or a big one, whatever it genuinely calls for — and don't do
 * anything beyond that. The failure mode to avoid isn't "the model made a
 * big change"; it's the model changing things the instruction never asked
 * for (a different person, an extra prop, a rearranged scene) on its own. */
export function getAdEditPrompt(editInstruction: string): string {
  return `This exact reference image is the starting point. Apply the following change to it completely and precisely — follow it exactly as written, whether that means a small tweak or a substantial change to the scene. Do not do it halfway, and do not hold back if the instruction genuinely calls for a bigger change:

${editInstruction}

Rules:
- Carry out the instruction above fully and correctly — nothing about it is off-limits (new objects, text, people, or a different setting are all fine if the instruction calls for them).
- Do not change anything the instruction above doesn't ask for or doesn't require — the subject, framing, background, lighting, and every other detail it doesn't mention must stay exactly as it is in the reference image.
- Never invent extra changes on your own initiative beyond what's needed to carry out the instruction above.`;
}
