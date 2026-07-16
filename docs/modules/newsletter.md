# Newsletter Automation Module

The Newsletter module allows businesses to automate their email marketing by utilizing AI to curate and write personalized, high-converting newsletters.

## Core Capabilities
1. **AI Content Curation:** The AI reads the business's recent `social_posts` and `meta_ad_creatives` to summarize what is happening with the business, automatically drafting a newsletter without the business owner having to write a word.
2. **Template Engine:** Generates HTML-ready templates using dynamic layouts tailored for modern email clients.
3. **Mailing List Management:** Tracks subscribers, unsubscribes, and open/click metrics.
4. **Third-Party Integrations:** Connects directly to mailing services (e.g., SendGrid, Mailgun) — credentials stored via `api_credentials` (Vault-referenced, see `architecture/database_schema.md` §1), not a separate config table.

## Database Relationships
*(Note: this module is deferred — Meta Ads and Social Media are being built first. There is no schema for it today: `newsletters`, `subscribers`, `newsletter_sends`, and `newsletter_recipients` existed at one point but were dropped when the schema was cut down to exactly the 14 tables in active use — see `architecture/database_schema.md` §10/§11. When this module actually gets built, these tables get created fresh, `business_id`-scoped from day one.)*
- `newsletters`: status (draft, scheduled, sent), HTML content, AI prompts, scoped to `business_id`.
- `subscribers`: mailing list, scoped to `business_id`.
- `newsletter_sends` / `newsletter_recipients`: per-send recipient tracking and engagement events.

## Workflow Flow
1. The AI orchestrator triggers an Inngest job weekly.
2. It fetches recent updates (social posts, website scrapes).
3. OpenAI drafts an email newsletter focusing on value and the business's core offerings.
4. The draft is sent to the business owner's dashboard for a 1-click approval.
5. Once approved, Inngest triggers the dispatch job, looping through `subscribers` and firing emails via the configured provider.
