# Muaawina release — 12 October 2026

The current main-branch update fixes Malayalam typing and refreshes login/member styling. It deliberately preserves the existing API contract so a frontend-only deployment continues to work. Admin styling is unchanged. The release branch contains the coordinated security, payment, queue and frontend corrections below. **Do not deploy the release frontend before the matching backend.**

## Deployment order

1. Back up the live spreadsheet and current Apps Script and bot versions. Use the existing production sheet, not the XLSX export or an inferred test copy.
2. Replace Apps Script source with `backend/Code.gs`. In Script Properties set `SPREADSHEET_ID` to the existing live target, set a strong `ADMIN_PASS` (not `1234`), and set `ONESIGNAL_API_KEY` if push notifications are used. Run `initializeSecurity()` from the script editor. It creates request IDs for existing queue records, the notification-state header and the one-minute worker. It does not invent member fees/join dates.
3. Read the generated `BOT_API_KEY` privately from Script Properties. Put the same value in the bot's environment. Set `SCRIPT_URL` to the exact frontend `API_URL`. Set `DATA_DIR` to a mounted persistent disk. Replace bot source with `bot/bot.js`; retain existing package dependencies and the existing WhatsApp auth files by moving them into `DATA_DIR/baileys_auth_info`. The public health endpoint is `/health`. QR and send routes require `Authorization: Bearer <BOT_API_KEY>`; do not embed that key in the website or a URL.
4. Deploy a new version of the existing Apps Script web-app deployment so its URL remains the same. Confirm `getAppSettings` reports `securityVersion: 2`. Retest spreadsheet permissions and the queue trigger as the deployment owner.
5. Run `inspectTrackerReadiness()` in the editor. The provided export had 18 missing join dates and 19 missing fees; verify current live values with the data owner. Run `reconcileYearTrackers()` only after inspecting year-sheet formulas. For array formulas with fixed member ranges, extend their ranges to open-ended rows first; the helper refuses to overwrite array-formula spill ranges. Existing payments are retained. These live data corrections have not been performed here.
6. Deploy the release `index.html` only after backend and bot are ready. Previous browser passwords/digests are discarded; users log in once to obtain their new server session. Sessions persist until logout or a credential change.
7. Perform a controlled real test with an agreed member/recipient: submit once and retry; approve without message; approve with receipt; reject; offline payment; logout/reopen; profile phone/password change; bot restart and reminder/queue failure recovery. Check amounts against the live sheet. No real payment or WhatsApp message was submitted during this work.

## Validation

Syntax checks passed for frontend, Apps Script source and bot. Executed mocked regression tests: 20 backend cases, 7 frontend logic cases, 4 bot behavior cases. Browser QA script is included but **was not executed successfully**: Chromium is unavailable and its download failed in this environment. Mobile visual appearance, actual IME keyboard composition, PDF/print/PWA, hosted asset loading, quota/concurrent-user timing and real WhatsApp delivery are still unverified.

Run locally:

```sh
node tests/backend.test.cjs
node tests/frontend-unit.test.cjs
node tests/bot.test.cjs
node tests/frontend.test.cjs # needs Playwright and its Chromium browser
```

## Audit corrections prepared

Server-side admin/member authorization; no browser admin password or 1234 fallback; exact phone plus current credential login; authenticated bot routes/QR; escaped member/highlight render paths and quoted approval handlers; stable request IDs; locked duplicate prevention; validated approval transitions; write-ahead payment recovery; independent receipt snapshots; full group IDs; explicit production-sheet configuration; environment-based shared bot deployment URL; trigger checks and queue diagnostics/retry API; bot delivery idempotency and uncertain-delivery review; persistent-disk requirement; queued optional reminders/broadcasts/offline messages; future dues cutoff; historical paid amount/date metadata; rejected history; profile token rotation and blank password field; closed campaign router; login-only statistics; logout response guards; private cache/modal cleanup; per-request completed filtering; preserved tabs/filters; network timeouts; push input guard and configured push secret.

## Remaining release gates and limitations

- Live deployment/configuration, trigger permissions, secret rotation (if an old key was exposed) and current Sheet readiness require access to those systems; GitHub code updates do not deploy Apps Script/Render.
- The missing join dates/fees cannot be inferred. Old Boolean tracker entries have no authoritative historical paid date/amount: the app uses the configured fee and labels missing dates instead of inventing dates.
- Queue delivery is at least-once at the transport boundary. A durable bot record blocks a repeat after success. An interrupted `sending` record returns 409 and needs human delivery review; automatic resend is deliberately disabled for an uncertain outcome.
- The worker remains limited to four jobs per run. Queue depth/failures are available through admin-only `getWhatsAppQueueStatus`; large campaigns may take several minutes. Failed jobs can be retried through admin-only `retryFailedWhatsAppJobs`, excluding uncertain deliveries.
- Frontend escaping covers the corrected member/highlight/approval paths; this is not a claim of an exhaustive security penetration test of every legacy print/campaign/report template. Closed campaign endpoints are blocked server-side.
- Browser token persistence still depends on the browser retaining local storage. Rendering CDN availability, actual mobile keyboards, real performance and multi-device behavior need hosted tests.
- No final public-release sign-off is claimed.
