# Voice Agent Module

The Voice module automates inbound and outbound phone calls using an AI voice agent (the legacy project used Retell.ai for this). It existed as a working feature in the old Newsletter project and is planned to return in Kinetix — deferred behind Meta Ads and Social Media, on the same timeline as Newsletter and Outreach, not dropped.

*(Note: Schema for this module is not yet designed — this doc records intent and legacy behavior so the design isn't lost, not a build spec.)*

## Core Capabilities (carried over from the legacy implementation)
1. **Outbound Calling:** Scheduled or triggered AI-driven calls to leads/prospects, with call outcomes routed by a decision tree (interested, not interested, callback requested, voicemail).
2. **Inbound Calling:** An AI agent answers and handles incoming calls, logging outcomes the same way.
3. **Call Logging:** Every call's outcome, transcript, and duration recorded against the contact it was made to.

## Open questions to resolve before this gets designed properly
- **Provider:** confirm whether Retell.ai is still the intended provider, or whether this gets re-evaluated alongside the other AI providers already in use (OpenAI, ElevenLabs, Kie, AssemblyAI).
- **Data model links:** voice calls will likely need to reference `leads` (Meta Ads) and/or a future `outreach_contacts`-style table (Outreach) as the thing being called — this should be designed once Outreach's schema is finalized, not in isolation.
- **Scope:** confirm whether both inbound and outbound are in scope for the first pass, or just one.

## Workflow (as it existed in the legacy project, for reference)
1. Outbound: a scheduled job places calls via the provider's API, polls for call completion, and routes based on outcome.
2. Inbound: a webhook endpoint receives call events from the provider in real time.
3. Both paths log the result back to the relevant contact record.
