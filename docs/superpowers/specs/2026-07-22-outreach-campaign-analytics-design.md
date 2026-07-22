# Outreach Campaign Analytics — Design Spec

Status: approved by user, proceeding to implementation.

## 1. Problem

Two distinct issues surfaced while testing the Send flow end-to-end against the real
Instantly account:

1. **Campaigns created via the API never actually send.** `InstantlyService.createCampaign`
   never assigns a sending mailbox (`email_list`). Instantly auto-pauses any campaign with
   no assigned sending account shortly after activation (confirmed live: a test campaign
   went `status: 1` → `status: -1` within minutes of being activated). The workspace has
   exactly one connected, usable mailbox: `medical@togahh.com` (via `GET /accounts`).
2. **There is no visibility into whether/how much a campaign actually sent.** The
   Campaigns list shows only a bare status badge; the Dashboard tab's numbers come from
   `email_events`, a table nothing populates (no Instantly webhook has ever been
   configured/verified) — so it always reads zero regardless of real activity.

## 2. Root-cause fix: assign a sending account on campaign creation

`InstantlyService.createCampaign` gains a call to `GET /api/v2/accounts` (or accepts a
pre-fetched list) and passes every connected account's email as `email_list` in the
create-campaign payload. No settings UI needed — this always uses whatever's currently
connected to the workspace. If the account list is empty, throw a clear error rather than
silently creating another campaign that can never send.

## 3. Data layer — live analytics, filtered to Kinetix's own campaigns

`GET /campaigns/analytics` (Instantly v2) returns **every** campaign in the workspace,
unscoped — confirmed live: it includes the old legacy shared campaign
(`April_Hair_Transplant_awareness`, 294 sent) and an unrelated "AI SDR" auto-campaign
alongside anything Kinetix creates. A per-campaign `campaign_id`/`id` query filter was
tried and had no effect in testing.

So: `InstantlyService.getCampaignsAnalytics()` wraps the endpoint, and a new route
`GET /api/outreach/campaigns/analytics` fetches the full array, then filters it down to
rows whose `campaign_id` matches one of *this business's* `outreach_campaigns.external_campaign_id`
values (fetched from Supabase first). Returns:

```ts
{
  byExternalId: Record<string, InstantlyCampaignAnalytics>,
  totals: { sent, opened, opened_unique, replied, replied_unique, clicked, clicked_unique, bounced, unsubscribed }
}
```

Fetched via `useQuery` with a short `staleTime` (~30–60s) — same live-fetch, no-mirror
pattern already used for Meta Ads status/spend in this app (and the same approach the
legacy Outreach app's own dashboard used: a single uncached call to this exact endpoint,
confirmed by reading `projects/Outreach/src/app/api/instantly/analytics/route.ts`).

No new tables. No background job. (A later fast-follow, only if wanted: nightly snapshots
into a new table for trend charts — explicitly out of scope for this pass.)

### Field selection — "useful, not noisy"

Included: `emails_sent_count`, `open_count_unique` (+ rate), `reply_count_unique` (+ rate),
`link_click_count_unique` (+ rate), `bounced_count` (+ rate), `unsubscribed_count`.

Excluded as not useful in this context: `total_opportunities`/`total_opportunity_value`
(CRM-pipeline fields, unused here), `completed_count`/`contacted_count`/`new_leads_contacted_count`/`leads_count`
(redundant with `emails_sent_count` for our single-step sequences).

### Instantly status → friendly health label

Confirmed via live testing + Instantly's help docs: `0` = Draft, `1` = Active,
`-1` = Accounts Unhealthy (no healthy/assigned sending account), `-2` = Bounce Protect
(auto-paused for high bounce rate — observed on the legacy campaign, ~7.5% bounce rate).
Other documented enum values (`2`, `3`, `4`, `-99`) exist but weren't observed directly —
map them to a generic "Paused" / "Unknown status" fallback rather than guessing a
specific wrong label.

## 4. UI changes

**Campaigns list** (`CampaignsPage.tsx`): table gains three columns — Sent, Opened,
Replied — plus the Status column now shows the folded-in Instantly health (e.g. "Paused —
sending account issue") instead of just our own `active`/`draft` status when it would be
misleading.

**Campaign detail** (`CampaignDraftPanel.tsx`, shown once `external_campaign_id` is set):
a compact KPI strip below the email preview — Sent, Opened (rate), Replied (rate), Clicked
(rate), Bounced (rate), Unsubscribed — reusing the existing `KpiCard` component from the
Outreach Dashboard. Plus the health status and Instantly's `timestamp_updated`.

**Dashboard tab** (`DashboardPage.tsx` — the existing "Dashboard" entry already in the
Outreach secondary sidebar, not a new page): swap the `email_events`-based counts for the
same live analytics totals, aggregated across the business's campaigns. Same KpiCard row
layout, extended with Opened/Clicked tiles.

## 5. Out of scope for this pass

- Historical trend charts / nightly snapshot table (flagged as a possible fast-follow).
- Per-lead-level open/reply/click tracking (Instantly's analytics endpoint is aggregate
  only; per-lead would need a different, more expensive API surface or webhooks).
- A Settings UI for choosing which sending account(s) to use — always uses whatever's
  connected today.
- Fixing/verifying the Instantly reply/bounce webhook — the live-analytics approach makes
  it unnecessary for this feature; left as-is (already flagged unverified elsewhere).
