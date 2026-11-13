import { serviceDescriptor, contactDisplayText } from "../meta-ads/shared";

/**
 * One-shot video (Seedance 2.5) for Meta Ads (a paid ad) and Social Media (an
 * organic post), in two prompts. Meta Ads has no fixed story: the AI picks
 * whatever concept and structure makes the strongest video. Social Media
 * tells the same story by default (problem → finds the business → cared for →
 * resolved, `socialStory`), the same arc as the per-scene social pipeline;
 * only what happens inside each part comes from the idea and the service.
 * Both show the problem the service treats first, at its worst, by default.
 * Each default gives way when the owner's idea asks for another kind of video
 * (an offer, an announcement, an introduction to the business…).
 *
 * 1. The PLAN — the concept and every spoken line, which the user reviews and
 *    can edit before anything is paid for.
 * 2. The VIDEO PROMPT — one OpenAI call turns the approved plan, the business
 *    and the owner's choices into a complete brief for Seedance 2.5, which
 *    makes the finished video in one go (people, places, camera, speech with
 *    lip sync or voice-over, music). Our code adds the logo afterwards.
 *
 * Fixed here: only facts, safety, the owner's choices (length, format,
 * character, language, voice) and what the video model can't do well: it
 * misspells every word it draws, so the picture has no writing at all, even
 * when the idea asks for some (the business name is only spoken, with a
 * respelling beside the line that says it; our code adds the logo top-right;
 * the brand image is sent only when a shot, such as the business's website on
 * a screen, needs it), it fills quiet moments with words of its own, so only
 * the script is spoken, and it draws whatever it's told about, so the brief it
 * gets is written in positive terms only.
 */

export type OneShotChannel = "meta_ad" | "social_post";

export const ONE_SHOT_DURATIONS = [20, 25, 30] as const;
export type OneShotDuration = (typeof ONE_SHOT_DURATIONS)[number];

/** Seconds from whatever was sent ("30 seconds", 30, "25"), limited to the lengths offered (Seedance 2.5 makes at most 30). */
export function oneShotDuration(value: unknown): OneShotDuration {
  const n = parseInt(String(value ?? ""), 10);
  return (ONE_SHOT_DURATIONS as readonly number[]).includes(n) ? (n as OneShotDuration) : 30;
}

/** Spoken words that fit a video of this length at a natural pace, with room for moments without speech. */
export function wordBudget(seconds: number): { min: number; max: number } {
  return { min: Math.round(seconds * 1.6), max: Math.round(seconds * 2.4) };
}

export interface OneShotChoices {
  channel: OneShotChannel;
  ideaPrompt: string;
  /** The service the video is about; Social Media may leave it empty */
  service?: string;
  duration: number;
  aspectRatio: "9:16" | "16:9";
  character: "male" | "female";
  videoStyle?: string;
  videoMode?: "live_action" | "animated_poster";
  language?: string;
  /** False for a video without speech (Social Media's "No Voice"): music and natural sound only */
  voice: boolean;
  /** The business's reference photo of the main character is attached */
  hasCharacterPhoto: boolean;
}

const WHAT_IT_IS: Record<OneShotChannel, string> = {
  meta_ad: "a paid Meta (Facebook and Instagram) video ad",
  social_post: "an organic social media video post (Instagram, Facebook, TikTok, YouTube Shorts, LinkedIn): native to the feed, worth watching for its own sake, never a hard sell",
};

/** Finds the business's name in a text: in full, or its first word when that's distinctive ("Novara" for "Novara Clinic"). */
export function businessNamePattern(businessName: string | null | undefined): RegExp | null {
  const name = String(businessName ?? "").trim().toLowerCase();
  if (!name) return null;
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const first = name.split(/\s+/)[0];
  const parts = [escape(name), ...(first.length >= 4 && first !== name ? [escape(first)] : [])];
  return new RegExp(`\\b(${parts.join("|")})\\b`, "i");
}

/** Everything the business has told us, in full: the AI writes only from this. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function businessFacts(business: any, service?: string): string {
  const website = business?.website_url ? String(business.website_url).replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") : null;
  const contact = [website && `website ${website}`, business?.contact_phone && `phone ${business.contact_phone}`].filter(Boolean).join(", ") || contactDisplayText(business);
  const countries = Array.isArray(business?.target_countries) && business.target_countries.length ? business.target_countries.join(", ") : null;
  const lines = [
    `BUSINESS: ${business?.name || "the business"}${business?.industry ? ` (${business.industry})` : ""}`,
    business?.description && `About: ${business.description}`,
    business?.core_offerings && `What it does: ${business.core_offerings}`,
    business?.target_audience && `Who it's for: ${business.target_audience}`,
    business?.pain_points && `Their problems: ${business.pain_points}`,
    business?.business_voice && `How it talks about itself: ${business.business_voice}`,
    business?.tone_of_voice && `Tone of voice: ${business.tone_of_voice}`,
    countries && `Markets: ${countries}`,
    contact && `Contact (only ever spoken, never written in the picture): ${contact}`,
    service ? `\nTHE SERVICE THIS VIDEO IS FOR: ${serviceDescriptor(business, service) || service}` : "",
  ];
  return lines.filter(Boolean).join("\n");
}

function choicesText(c: OneShotChoices): string {
  const person = c.character === "female" ? "woman" : "man";
  return [
    `Length: exactly ${c.duration} seconds.`,
    `Aspect ratio: ${c.aspectRatio === "16:9" ? "16:9 landscape" : "9:16 vertical"}.`,
    `Type: ${c.videoMode === "animated_poster" ? "an animated design (motion graphics with shapes, colour and movement), not real-life footage" : "real-life footage with real-looking people and places"}.`,
    c.videoStyle ? `Visual style the owner chose: ${c.videoStyle}.` : "",
    `Main character: a ${person}${c.hasCharacterPhoto ? " (the business's reference photo of this one person is attached)" : ""}.`,
    c.voice ? `Sound: spoken words (a ${person}'s voice for the main character), music and sound effects.` : "Sound: no speech at all — music and natural sound only.",
    `Language of every spoken word: ${c.language || "English"}.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * How the problem the service treats is shown: at its worst, then resolved. Both prompts need it: the video
 * model softens a vague "thinning hair" and copies the reference photo's full hair otherwise.
 */
const problemLooks = `- First, the problem at its most advanced, unmistakable stage, the stage that makes someone seek this service: obvious at a glance in every shot of that part, never mild or subtle. For hair loss, for example: a mostly bald head on top, wide bare scalp across the crown and the front, only a few thin strands, hair left only at the sides and back. For teeth: several missing teeth with dark gaps, the rest chipped and stained, plainly visible when they speak or smile. Likewise for whatever this service treats: its most severe form. It gets real screen time: several shots, at least one close-up where it fills the frame. Shown with dignity, never mocking.
- Later, the same person, same face, visibly has the result.`;

/** Kinds of video that don't need anyone's problem, for the "the idea can override the default" lines. */
const OTHER_KINDS = "an offer or promotion, an introduction to the business, an announcement, or anything else where a person's problem isn't the point";

/** Facts, safety and the brand name: the only fixed rules, shared by both prompts. */
function rules(businessName: string): string {
  return `TRUTH AND SAFETY
- Describe what ${businessName} does exactly as its own description says, never more (if it arranges or coordinates care, it doesn't perform it).
- No prices, discounts, percentages, dates, statistics, results, reviews, awards or guarantees unless the owner's idea gives them. A character's story is a dramatization: never present it as a real customer's review, and never promise an outcome.
- Health, medical or cosmetic services: never show or describe surgery, procedures, operating rooms, recovery, pain, blood, needles, instruments or side effects; no medical jargon. Bodies are always clothed and nothing is sexualised.
- Never name or show real people, celebrities, other brands or other logos.

PICTURES WITHOUT WRITING
The video model misspells every word it draws, so the video tells everything through pictures and speech, never through writing:
- No written words anywhere in the picture: no captions, titles or text cards, and nothing readable on screens, laptops, phones, documents, signs, clothes, packaging or buildings. Screens show soft, unreadable interfaces; every surface is plain and unbranded. (The one exception, added later only where a shot needs the brand: the business's brand mark, copied from its logo image, may appear there — on a screen showing its website, on an object the moment needs branded, such as a ticket or a card, or in the final shot.)
- This holds even when the owner's idea asks for written words, such as a title, or a name on a ticket, card, badge, sign, tape or screen: keep that moment, with the object plain, or showing the brand mark when the moment needs the brand, and when the words matter, someone says them instead. Things that usually carry writing (tickets, boarding passes, badges, warning tape, signs, labels, newspapers, menus) are left out, or are plain and blank.
- "${businessName}" is only ever spoken, at most twice in the whole video. The website is spoken only where the video needs it, usually the call to action.

WHAT THE SERVICE CHANGES (the default; the owner's idea can change it)
By default, when this service changes something visible on a person, the video shows that problem first and the result later, on the same main character. When the owner's idea asks for a different kind of video (${OTHER_KINDS}), follow the idea instead, and show the problem only where the idea calls for it.
Whenever the problem is shown:
${problemLooks}
In the concept, say in plain physical words how the problem looks on the main character.`;
}

/** Social Media's default story, used by both prompts: the order is fixed, the situation never is. */
function socialStory(businessName: string): string {
  return `THE STORY (the default: every video follows these four parts, in this order, unless the owner's idea asks for a different kind of video, such as ${OTHER_KINDS}; then the idea decides the structure, and every other rule still applies)
1. THE PROBLEM, about the first quarter: the hook. The main character in one recognisable everyday moment where what this service treats gets in their way. The problem is visible on them at its most severe (see WHAT THE SERVICE CHANGES), and we feel what it does to them.
2. FINDING ${businessName}: they discover the business and reach out. When the video has speech, this is where the name is first spoken.
3. THE CARE: they are welcomed, listened to, and their path is explained and planned; they feel safe and understood. The people who help them are whoever truly fits this business and this service.
4. THE RESULT, about the last third: the same person, the problem visibly resolved, living new moments with confidence, and the people around them notice. The last moment is the strongest emotional payoff, in the same life the first part set up. The change speaks for itself: no hard sell, price or slogan at the end.
What is not fixed: the specific problem, the moment, the places, the people and how it all looks. All of that comes from the owner's idea and the service, freshly imagined each time, never a default scenario.`;
}

// ---------------------------------------------------------------------------
// 1. The plan (reviewed by the user)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getOneShotPlanPrompt(business: any, c: OneShotChoices): string {
  const name = business?.name || "the business";
  const words = wordBudget(c.duration);
  const language = c.language && c.language !== "English" ? c.language : null;
  const forService = c.service ? " and this service" : "";
  const job =
    c.channel === "social_post"
      ? `${socialStory(name)}

YOUR JOB
Tell this story in the strongest possible way for this idea${forService} (or, when the idea asks for a different kind of video, make that video). Imagine three clearly different ways to tell it (different moments, places and people), then pick the best one and write its plan. Make it specific to this business${forService}, full of life and never generic.`
      : `YOUR JOB
Find the strongest possible video for this idea${forService}. Imagine three clearly different concepts — any format that would stop the scroll and move the right people — then pick the best one and write its plan. Apart from the default under WHAT THE SERVICE CHANGES, nothing about the structure is fixed: the format, the order, the pace, who speaks and how it ends are your call. Make it specific to this business${forService}, full of life and never generic.`;
  const scriptAsk = c.voice
    ? `- "script": every spoken line, in order, one short natural sentence each, ${words.min} to ${words.max} words in total so it fits ${c.duration} seconds at a natural pace. Each line is said by a character on camera or by a voice-over, whichever the concept needs. Everyday words that are easy to say; no em dashes, semicolons, quotation marks, emojis or ALL CAPS.`
    : `- "script": an empty list — this video has no speech, only music and natural sound; the concept carries it.`;
  return `${language && c.voice ? `OUTPUT LANGUAGE: write every spoken line in ${language}, never mixed with another language. The concept can stay in English.\n\n` : ""}You are the creative director of ${WHAT_IT_IS[c.channel]} for ${name}. The video is made in one go by an AI video model from a detailed brief written after your plan: real-looking people, places and camera work, speech with lip sync or voice-over, and music.

${businessFacts(business, c.service)}

THE OWNER'S IDEA
${c.ideaPrompt}

THE VIDEO
${choicesText(c)}

${job}

Write:
- "concept": the chosen idea in 3 to 5 sentences: what the viewer sees and hears from the first second to the last, where it happens, how it feels, and why it works for this audience.
${scriptAsk}

${rules(name)}

Return ONLY JSON, no markdown:
{ "concept": "…", "script": ["…", "…"] }`;
}

// ---------------------------------------------------------------------------
// 2. The prompt for Seedance 2.5
// ---------------------------------------------------------------------------

/** Fields both channels return beside the video prompt; our code acts on them (see services/ai/one-shot-video.ts). */
const SHARED_OUTPUT = `- "videoPrompt": detailed, usually 3,000 to 9,000 characters, never more than 15,000.
- "useBrandImage": true only when a beat shows the brand image (see PICTURES WITHOUT WRITING); otherwise false, and the image isn't sent.`;

const OUTPUT: Record<OneShotChannel, string> = {
  meta_ad: `Return JSON only: { "title": string, "headline": string, "primaryText": string, "videoPrompt": string, "useBrandImage": boolean }.
- "title": a few words naming the video.
- "headline": the Meta ad headline, at most 40 characters.
- "primaryText": the Meta ad primary text, 1 to 3 short sentences, at most 300 characters, ending with the call to action. Plain text, so the business name and website may appear here.
${SHARED_OUTPUT}`,
  social_post: `Return JSON only: { "title": string, "videoPrompt": string, "useBrandImage": boolean }.
- "title": a few words naming the video.
${SHARED_OUTPUT}`,
};

/**
 * The writer's instructions for one channel. Written so what reaches the video model is positive and
 * concrete: it gets descriptions of plain, unbranded, wordless pictures — never "don't draw a logo" or
 * "no text", which video models tend to read as a request to draw one.
 */
export function getOneShotSystemPrompt(channel: OneShotChannel): string {
  return `ROLE
You are the creative director and film director of short social videos — here, ${WHAT_IT_IS[channel]}. You write ONE prompt for Seedance 2.5, a video model that makes the whole finished video in one go: the pictures, the cuts and camera, the people and how they move, speech in sync with their lips or a voice-over, music and sound effects. What your prompt describes is the video people will see.

THE PLAN
You get an approved concept and script. Keep the concept and say every line word for word; the one thing you never keep is written words in the picture (see PICTURES WITHOUT WRITING), even when the concept or the owner's idea asks for them. Everything else — the places, light, wardrobe, actions, camera, transitions, sound — is yours to make the video vivid, specific and alive: a lot happens, it keeps changing, it holds attention to the last second. Never slow, plain or generic; write it at the level of a top creative agency.
${channel === "social_post" ? `
${socialStory("the business")}
When the approved concept follows THE STORY, keep the four parts in this order, each with its share of the time, and in TIMELINE mark which part each beat belongs to. When it is a different kind of video because the owner's idea asked for one, follow the concept.
` : ""}
HOW THE VIDEO MODEL READS YOUR PROMPT
It follows the words it sees, literally. Anything you name, it tends to draw — even inside "no" or "avoid". So describe only what you want to see, in positive, concrete terms, and leave unwanted things unnamed.

PICTURES WITHOUT WRITING (the most important rule)
The video model misspells every word it draws, so the video tells everything through pictures and speech:
- Describe every surface as plain and unbranded: plain clothes and uniforms, plain walls and signs, plain packaging, phone and laptop screens glowing with soft, blurred, unreadable interfaces, documents seen from too far or too blurred to read.
- No captions, titles, text cards, subtitles or written words of any kind. Do not ask for any.
- This holds even when the owner's idea or the approved concept asks for written words, such as a title at the end, or a name on a ticket, card, badge, sign, tape or screen. Keep that moment, with the object plain (for example "a plain glowing golden card"), or, when the moment needs the brand and a brand image is attached, showing the brand mark from it (see below); and when the words matter, a character says them instead.
- Things that usually carry writing (tickets, boarding passes, badges, warning tape, signs, labels, newspapers, menus, books) are left out, or described as plain, blank, solid-coloured objects.
- The business's name appears only in THE BUSINESS AND THE SERVICE, SPOKEN WORDS and SOUND. Never in a description of something we see: never "a card for" the business, the business's lounge, sign or screen. A place or object is described by how it looks.
- The one exception is the brand image, when one is listed under ATTACHED IMAGES. Use it wherever a shot needs the brand: a laptop or phone screen showing the business's own website or page, an object the moment needs branded instead of written words (a ticket, a card, a badge), or the final shot. That surface shows the brand mark from that reference image, copied exactly, called "the brand mark from reference image N", never by the business's name. Name it only in the beats that show it. It is never decoration: when no shot needs it, never mention it at all.
- Our editor adds the brand's mark in the top-right corner of every video afterwards. Never mention that, and never use the words "logo", "watermark" or "text" in your prompt. Instead, simply compose every shot so its top-right corner is calm and clear: soft background there, no faces, hands or key action.

SAYING THE NAME AND THE WEBSITE
The video model guesses how to say names and web addresses, and often guesses wrong: a hard consonant softened into another (a G heard as a K), or an address broken into separate letters with pauses. So:
- The business name is only ever spoken, at most twice in the whole video, and never written. It is said exactly as it is spelled, every letter keeping its own sound. Give a plain respelling (for example: "Novara, said noh-VAH-rah").
- The website is spoken only where the video needs it, usually the call to action; many videos don't say it at all. When it is said, it is said exactly as written, as one smooth phrase in one breath with no pauses inside it, with its own respelling.
- Put each respelling in SOUND, and in SPOKEN WORDS on its own line straight after the line that says it (for example: How to say "Novara": noh-VAH-rah).

THE MAIN CHARACTER AND EVERYONE ELSE
- The main character is one person and looks the same in every shot. When their reference photo is attached, only the main character has its face, features and skin tone; the photo's background and pose are not reused.
- Every other person in the video is clearly a different individual from the main character, with a different face, age, hair and build, each described in PEOPLE. Only add other people when the concept needs them.

WHAT THE SERVICE CHANGES (as important as the writing rule)
Follow the approved concept: by default it shows the problem first and the result later, but when the owner's idea asked for a different kind of video it may not show the problem at all. Whenever the video shows a person with what this service treats:
${problemLooks}
The video model softens anything described vaguely ("thinning hair", "imperfect teeth") and copies what it sees in the reference photo. So:
- Describe the problem in concrete physical words, at its most severe, exactly as it should appear.
- Repeat that full description in PEOPLE and in every TIMELINE beat before the change; never "as before" or "the same".
- In REFERENCE IMAGES, say the photo gives only who the person is (face, features, skin tone), then describe how what the service treats looks on them in each part of the video.
Bodies are always clothed and nothing is sexualised.

TRUTH AND SAFETY
- Facts (prices, results, numbers, reviews, awards, what the business does) come only from the data given; the business is described exactly as its own description says.
- A character's story is a dramatization: never present it as a real customer's review, and never promise an outcome.
- Health, medical or cosmetic services: the camera stays on people, conversations, places and everyday life — consultations, travel, arrival, rest, daily routine, the result. Describe no surgery, procedure, operating room, recovery, pain, blood, needle, instrument or side effect.
- Never show or name real people, celebrities or other companies.

PROCEDURE
1. Read the business, the service, the owner's idea, the approved plan and the owner's choices.
2. Imagine the film beat by beat: the main character, the places, the light, what happens, how the camera moves, how the sound builds.
3. Write the video prompt, plainly and completely, as a director briefs a film crew, in English (spoken words in the video's language). In this order:
   a. THE VIDEO: what it is, the aspect ratio, the exact length, the overall look, pace and mood, the visual style, and whether it is real-life footage or an animated design.
   b. THE BUSINESS AND THE SERVICE: who the business is, what the service is, who it is for, the one message and the tone, so the model understands what the video is about.
   c. REFERENCE IMAGES: when the main character's photo is attached, "reference image 1 is the main character" and what that means (their face, features and skin tone only), then how what the service treats looks on them before and after the change, in physical words. The brand image is named here only when a beat uses it.
   d. PEOPLE: the main character first (age range, look, hair, wardrobe, manner, and the state of what the service treats at each point), then anyone else, each clearly different from the main character.
   e. TIMELINE: the video beat by beat, each beat with its start and end time in seconds, together filling the exact length: what we see, the shot and camera move, the action, the place and light, and the sound in that moment. Every beat before the change repeats the full physical description of the problem. Every surface plain, every screen soft and unreadable (apart from the brand mark, where a beat shows the brand image), every top-right corner calm.
   f. SPOKEN WORDS: every script line exactly as written, at the second it is said and by whom (a character on camera with lips in sync, or a voice-over). These lines are the only words anyone says: between them there is music and natural sound, and what we see is shown, never described aloud. When the video has no speech, nobody speaks.
   g. SOUND: each voice (gender, age, accent and tone that fit the speaker and the language), the respelling of the business name (and of the website, when it is spoken), the music (new and original, described only by mood, tempo, instruments and how it builds — never a song, artist or famous track) and the sound effects.
   h. THE ENDING: the last shot — a strong, calm image with a clear top-right corner — ${channel === "social_post" ? "the payoff moment of THE STORY (or the concept's own ending), ending on the last spoken line of the script." : "and the call to action, spoken."}
   i. A closing line telling the model that the timeline is the plan, not a fixed script: it may improve shots, camera, transitions and timing where that makes a better video, keeping the concept, the main character, the spoken words, the business and the facts.
   j. KEEP IT CLEAN: the faces and hands natural and well formed, the main character's face only on the main character, every surface plain and every screen unreadable apart from the brand image where a beat uses it, as described above. (Write this as what you want, in positive words.)
${channel === "meta_ad" ? "4. Write the Meta ad copy that goes with the video: a headline and the primary text, from the same facts only. This is plain text shown by Meta, so the business name and website may appear here.\n" : ""}
OUTPUT
${OUTPUT[channel]}

SELF-CHECK
- Would a top creative agency post this? If any shot, line or setting is generic, rewrite it.
- Every script line is in the timeline, word for word, and fits its time (about 2.5 words per second).
- The prompt asks for no written words anywhere, even where the owner's idea or the concept asked for some, and never uses the words "logo", "watermark", "caption" or "text"; every surface is plain and every screen unreadable.
- The business's name appears only in THE BUSINESS AND THE SERVICE, SPOKEN WORDS and SOUND, never in what we see.
- The brand image appears only in a beat that truly needs it, or nowhere; "useBrandImage" says which.
- The business name is spoken at most twice; the website only where the video needs it, as one smooth phrase; the respelling of each one that is spoken is in SOUND and right after its line in SPOKEN WORDS.
- Only the script's lines are spoken; nothing else is said aloud.
- Only the main character has the reference photo's face; everyone else is clearly someone else.
- Whenever the video shows the problem this service treats, it is at its most severe, in concrete physical words repeated in PEOPLE and every beat before the change, with a close-up, and the result is visible after.
- The prompt never explains why the top-right corner is calm.
${channel === "social_post" ? "- When the concept follows THE STORY, all four parts are there, in order: the problem clearly visible at the start, resolved and noticed at the end.\n" : ""}- Every fact comes from the data; nothing is invented; nothing under TRUTH AND SAFETY appears.
- The prompt stands on its own: someone who knows nothing about the business could make the video from it.`;
}

/**
 * `problems`: what the code check (services/ai/one-shot-video.ts) found in the writer's last draft, for its one
 * rewrite.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getOneShotVideoPrompt(business: any, c: OneShotChoices, plan: { concept: string; script: string[] }, images: string[], problems: string[] = []): string {
  return [
    businessFacts(business, c.service),
    `\nTHE OWNER'S IDEA\n${c.ideaPrompt}`,
    `\nTHE APPROVED CONCEPT\n${plan.concept || "(none given: build the video from the script)"}`,
    plan.script.length
      ? `\nTHE APPROVED SCRIPT (in order)\n${plan.script.map((line, i) => `${i + 1}. ${line}`).join("\n")}`
      : "\nTHE APPROVED SCRIPT: none — this video has no speech.",
    `\nTHE VIDEO TO MAKE\n${choicesText(c)}`,
    "Top-right corner: our editor adds the brand there afterwards, so keep that corner of every shot calm and clear (see PICTURES WITHOUT WRITING).",
    images.length ? `\nATTACHED IMAGES\n${images.map((what, i) => `Reference image ${i + 1}: ${what}`).join("\n")}` : "",
    c.hasCharacterPhoto ? "" : "\nNo photo of the main character is attached: describe them in full, and keep them the same in every shot.",
    problems.length
      ? `\nYOUR LAST DRAFT BROKE PICTURES WITHOUT WRITING. Write the whole prompt again, keeping everything else, without these:\n${problems.map((p) => `- ${p}`).join("\n")}`
      : "",
  ].join("\n");
}

/**
 * The images offered for one video, in this order: the main character's reference photo (when used), then
 * the brand image. The brand image comes last and is `optional`: the writer decides whether a shot needs it
 * (`useBrandImage`), and when none does it isn't sent, which leaves the other images' numbers unchanged.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function oneShotReferences(business: any, character: "male" | "female", withCharacterPhoto: boolean): { url: string; what: string; optional?: boolean }[] {
  const person = character === "female" ? "woman" : "man";
  const photoUrl = character === "female" ? business?.video_reference_female_url : business?.video_reference_male_url;
  return [
    withCharacterPhoto && photoUrl
      ? {
          url: String(photoUrl),
          what: `the main character only, a ${person}: this one person has this face, features and skin tone in every shot, and nobody else in the video does. The photo gives only who this person is: what the service treats (hair, teeth, skin, face, body) looks the way the story describes, at its worst before the change and resolved after`,
        }
      : null,
    business?.logo_url
      ? {
          url: String(business.logo_url),
          what: `the business's brand mark, exactly as it looks. Optional: show it wherever a shot needs the brand — a laptop or phone screen showing the business's own website or page, an object the moment needs branded instead of written words (a ticket, a card, a badge), or the final shot — and nowhere else. If no shot needs it, never mention it and set "useBrandImage" to false`,
          optional: true,
        }
      : null,
  ].filter((r): r is { url: string; what: string; optional?: boolean } => r !== null);
}
