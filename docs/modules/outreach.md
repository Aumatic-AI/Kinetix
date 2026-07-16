# Outreach & Lead Gen Module

The Outreach module is designed to automate cold email and LinkedIn messaging campaigns, turning cold prospects into warm leads.

## Core Capabilities
1. **AI Personalization:** Scrapes prospect websites or LinkedIn profiles using Apify and uses AI to generate highly personalized cold email icebreakers.
2. **Automated Sequencing:** Allows businesses to set up multi-step drip campaigns (e.g., Email 1 -> wait 3 days -> Email 2).
3. **Inbox Management:** Automatically detects replies, categorizes them by sentiment (Positive, Negative, Out of Office) using OpenAI, and pauses sequences for interested leads.

## Database Relationships
*(Note: this module is deferred — Meta Ads and Social Media are being built first. There is no schema for it today: `outreach_contacts`, `outreach_campaigns`, `outreach_sequence_steps`, `outreach_enrollments`, `outreach_emails`, and `email_events` existed at one point but were dropped when the schema was cut down to exactly the 14 tables in active use — see `architecture/database_schema.md` §10/§11. When this module actually gets built, these tables get created fresh, `business_id`-scoped from day one.)*
- `outreach_contacts`: the people being contacted (name, email, LinkedIn, company), scoped to `business_id`.
- `outreach_campaigns` / `outreach_sequence_steps`: the high-level workflow and its per-step delays/templates.
- `outreach_enrollments`: which contact is on which campaign, and at what step.
- `outreach_emails` / `email_events`: every email sent, and every open/click/reply/bounce event against it.

## Execution Flow
1. User uploads a CSV of prospects or runs a LinkedIn search scrape (Apify) into `outreach_contacts`.
2. The AI orchestrator pre-writes personalized icebreakers for all prospects.
3. Inngest cron wakes up daily to evaluate `outreach_enrollments` against each contact's current step.
4. It sends the next scheduled email via the configured provider, logging it to `outreach_emails`.
5. If a reply webhook hits the Next.js API, Inngest triggers a sentiment analysis job and logs an `email_events` row.
6. If positive, the prospect is flagged for human review and the enrollment stops (`outreach_enrollments.stopped_reason`).
