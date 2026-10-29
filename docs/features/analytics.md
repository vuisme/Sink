---
title: Analytics and Realtime
description: Turn on visit analytics, read charts and logs, understand near-realtime view, exclude bots, and export CSV.
---

# Analytics and Realtime

Analytics is **optional**. Without it, short links, login, and link management still work — charts, logs, and realtime stay empty.

The authenticated Realtime dashboard displays each recorded click's IP address alongside its link and time. IP addresses are also included in the authenticated `/api/logs/events` response. A VPN or proxy may replace the visitor's public IP, and Analytics Engine sampling can omit individual clicks.

Each link's statistics page also includes a click history table with IP addresses, timestamps, countries, regions, cities, operating systems, browsers, and the recorded User-Agent header. Sink already stores the original User-Agent in Analytics Engine; the table displays the full recorded value. It shows up to the 100 latest recorded clicks within the selected date range. Regions and cities are inferred from IP addresses and may be approximate or unavailable.

Click history is also available on the main Analytics page, across all slugs or the selected slug filters. Each row links to its slug's statistics. Both views follow the selected date range and show up to 100 latest recorded clicks.

## Visitor IDs, sessions, and Client Hints

New clicks include a random Visitor ID and Session ID. Click either ID in the history table to filter related clicks; clear the selection to return to the full history. The existing IP-based visitor totals are unchanged.

- The `__Host-sink_visitor` cookie lasts 90 days after the last click. It identifies a browser on the same hostname, not a verified person.
- The `__Host-sink_session` cookie expires after 30 minutes without a click. A returning visitor keeps the Visitor ID but starts a new session after expiry.
- Both cookies use `Secure`, `HttpOnly`, `SameSite=Lax`, and `Path=/`, with no `Domain` attribute. Tracking requires HTTPS and cookies accepted by the browser. Separate hostnames, private browsing, deleted cookies, and different devices can produce different IDs.
- Responses that set these cookies use `Cache-Control: private, no-store`, including proxy responses. Previously cached permanent redirects may still bypass the Worker until the browser cache is cleared.
- Client Hints are recorded from an allowlist of `Sec-CH-UA*` request headers in a JSON string. Values are bounded to 128 characters each. `Accept-CH` requests supported additional hints for subsequent requests. High-entropy details may be absent on the first click or in unsupported browsers. Sink does not use `Critical-CH`, an intermediate page, or a retry to collect them.
- Old records have empty IDs and Client Hints; they cannot be reconstructed from IP or User-Agent. Cookie IDs and browser headers are correlation signals and may be changed or spoofed.

The authenticated `/api/logs/events` API accepts optional UUID `visitorId` and `sessionId` filters. Analytics Engine stores the new fields in appended columns `blob17` through `blob19`, preserving the existing column layout. Its [limits and retention](https://developers.cloudflare.com/analytics/analytics-engine/limits/) still apply, including sampling and three-month retention. [Client Hints behavior](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Accept-CH) depends on browser support.

## Turn it on (three things)

You need all three:

1. **Analytics Engine binding** named `ANALYTICS`
   - **Workers:** usually created by deploy settings (dataset default `sink`)
   - **Pages:** **Settings → Bindings → Add → Analytics Engine**
   - Variable name: `ANALYTICS`
   - Dataset: `sink` by default. If you set `NUXT_DATASET`, use the same name here

2. **Account ID** — set `NUXT_CF_ACCOUNT_ID` to the Cloudflare account that hosts this app  
   (Dashboard sidebar → account name, or the URL after you log in)

3. **API token** — set `NUXT_CF_API_TOKEN` as an encrypted secret:
   - Cloudflare dashboard → profile icon → **My Profile** → **API Tokens** → **Create Token** → **Custom Token**
   - Permission: **Account → Account Analytics → Read** only
   - Prefer limiting the token to that same account

If any one is missing or mismatched, analytics stays empty.

## What you can see

Successful visits feed counters, charts, heatmaps, recent events, and locations. Filter by link, time, country, browser, OS, device, and referrer.

Numbers can be **approximate** (Cloudflare samples high traffic). Low traffic can look uneven for the same reason.

To hide detected bots from stats and [click webhooks](/configuration/webhooks), set `NUXT_DISABLE_BOT_ACCESS_LOG=true`.

## Near-realtime page

::: tip Not a live stream
This page does **not** use WebSocket. It refreshes about every 10 seconds and plays new events at about one per second. Pause or a hidden tab stops playback. Treat it as a live-looking overview, not a perfect event feed.
:::

## Export

Download filtered stats as CSV from the dashboard or the stats export API (slug, URL, viewers, views, referrers).

Link JSON export is separate — see [Import and Export](./import-export).
