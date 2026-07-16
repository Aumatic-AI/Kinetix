# AI Media Generation Pipeline

The Media Generation Pipeline is the most complex backend service in Kinetix, and the one both Meta Ads and Social Media share end-to-end — a social post and a meta ad creative go through the exact same steps below, differing only in what happens to the output afterward (an ad launch vs. a scheduled post). Because AI video generation can take up to 3–5 minutes, it's impossible to run this synchronously in a standard Vercel serverless function (which times out at 15–60 seconds), so Kinetix uses **Inngest** for step-function execution.

**Canonical events:** `meta-ads/generate-image`, `meta-ads/generate-video` (Meta Ads, already implemented), `social/post.generate` (Social Media, proposed — not yet built) — see `architecture/system_design.md` §D.

## Optional pre-step: AI Idea Generation

Before a user even opens the generation form, `CreateAdModal` offers a **"Generate Ideas"** button next to the script textarea. It sends the user's short, rough idea to `POST /api/meta-ads/generate-idea` (`src/services/prompts/idea-generation.prompt.ts`), which expands it into 3 first-person story variations — one per angle (`result`, `value`, `<business>_difference`) — using the business's own offerings/voice/audience/pain points. This is a standalone OpenAI call, ported from the legacy n8n "Idea Generation for ads" workflow; it does not touch the Inngest pipeline below. Clicking a suggestion just fills the script textarea, which then flows into Step 2 like any hand-written idea.

## The Generation Workflow

### Step 1: Intelligence + Business Fetching
The pipeline queries the `businesses` row (name, industry, core offerings, business voice, target audience, pain points) alongside `ad_analysis_reports` for the business's latest `competitor` and `self` reports (see `ai_pipelines/intelligence_engine.md`). Previously only the two reports were fetched — the business's own context never reached the prompts at all.

### Step 2: Script Generation (OpenAI)
A prompt combining the business context and intelligence from Step 1 with the user's base idea is sent to OpenAI to generate a converting script (hook, body, CTA for image ads; a voiceover script for video ads). `src/services/ai/prompts/meta-ads.ts` ports the proven content/rules from the legacy n8n prompts (framework rotation, hook types, category-specific vocabulary, 3-act narrative arc, forbidden-content list, self-check) — genericized to read business persona from the `businesses` row instead of being hardcoded, and to reference the competitor `hook_analysis`/`gap_opportunities` and self-ad `winning_patterns`/`creative_directives` fields explicitly rather than dumping the raw report JSON. Output shapes are unchanged (`{headline, primary_text, visual_prompt}` for image; `{script: string[]}` for video) so the rest of this pipeline is untouched.

### Step 3: Visual Prompting (OpenAI)
A second LLM call turns the script into detailed cinematic prompts for the video generator (camera angles, lighting, character descriptions), one per script line. The prompt ports the legacy workflow's condition-diagnosis table (tiering sensitive subjects so imagery stays tasteful) and journey-milestone framing, but drops the legacy's "reference character image" override mechanic — that mechanic exists to fight a face-consistency image generator our Kie AI calls don't use (each scene image is generated fresh from text, with no reference photo passed), so porting it would have added prompt complexity with no corresponding pipeline behavior to fight against.

### Step 4: Audio Generation (ElevenLabs)
If a voiceover is selected, the full script is sent to ElevenLabs. The resulting audio is uploaded to Supabase Storage as a `media_assets` row (`kind = 'audio'`).

### Step 5: Image Generation (Kie AI)
Kie AI can't generate video from text directly — it needs a base image first. Parallel per-scene image generation tasks are triggered via the Kie API. `step.sleep()` polls Kie every 20 seconds without consuming Vercel compute.

### Step 6: Video Generation (Kie AI, Image-to-Video)
Once base images are ready, they're sent back to Kie AI with the cinematic prompts to produce motion video. Inngest polls again for completion.

### Step 7: Caption Timing (AssemblyAI)
The ElevenLabs voiceover audio from Step 4 is sent to AssemblyAI for transcription with word-level timestamps. Kinetix already has a ground-truth script (Step 2), so this isn't a blind transcription — it's forced alignment: matching the known script text to precise timing in the generated audio, which is what dynamic/karaoke-style subtitles need in Step 8. The transcript and word timings are stored in the video's `media_assets.metadata` (no new column needed).

*Carried forward from the old n8n pipeline, where AssemblyAI served the same purpose — it's the right tool for this step, not new scope for its own sake.*

### Step 8: Final Assembly (FFmpeg)
The raw video clips, the ElevenLabs audio track, and the AssemblyAI word timings from Step 7 are combined by an FFmpeg worker: clips are stitched, audio is synced, and dynamic subtitles are burned in using the word-level timing data. The final compiled video is uploaded to `media_assets` and linked via `media_asset_id` on `meta_ad_creatives` (Meta Ads) or `social_posts` (Social Media — the same asset is shared across every per-platform row for one post, see `architecture/database_schema.md` §7).

This closes out the step that earlier drafts marked "(Planned)" with no concrete design — captioning now has a defined data source (AssemblyAI timing) and a defined consumer (the FFmpeg burn-in), rather than being an open question.
