# Yetzer

Yetzer is a daily creative quest game: bring your own everyday footage, pictures,
and voice, then turn one playful challenge into one short film. It is not an
asset vault, a model browser, or an unlimited generation subscription.

## Why it exists

AI creation can feel like repeatedly buying guesses. Yetzer makes the user's
own performance the starting point, explains the transformation before payment,
and gives each purchase a clear beginning and one delivered result. Five daily
quests reduce decision overload; compact instructions make preparation playful.

## Product contract

- Username/password authentication; optional eight-character recovery passcode.
- Signed-out `/recovery`; signed-in `/security`; one password change per rolling
  24 hours across both paths. No configured passcode means no signed-out recovery.
- Exactly 220 immutable base quests in D1; five unique selections each day, with
  every base quest eligible again on later days (no obsolescence or 44-day deck).
- Each draw independently samples a probability. At >=0.48, call
  `nex-agi/nex-n2.5-mini` once for a bounded scene variant when a provider key is
  configured. Store draw decisions and published snapshots in D1. Never mutate
  the base recipes. Missing keys, invalid output and timeouts use the original.
- User preparation stays fixed: safe household filming, recordings, photos or
  drawings. AI changes the imaginary background/mood, not the required action.
- All daily rules use America/New_York, including daylight-saving transitions.
- Sunday-Thursday: purchase until 21:00; submit until 23:30.
- Friday: purchase until 15:30; submit until 16:00. Saturday: no purchase;
  submission reopens 21:00-23:30 for unsubmitted Friday purchases.
- One account may purchase at most three plays per New York calendar day and
  submit at most three per day. Repeating one quest requires another purchase.
- One purchase grants one creative submission. No free creative rerolls.
- Provider or delivery failures are service failures, never successful delivery.
- All successfully delivered films appear in `/manifestation`, grouped by the
  daily quest, sorted by views descending then completion timestamp descending.
- Original uploads remain private. Only the author gets the download action and
  download endpoint; public streaming cannot technically prevent screen capture
  or copying by a determined viewer.
- Delivered media expires 47 hours after provider completion, with access denied
  at the deadline, durable deletion, and scheduled cleanup as a fallback.
- R2 keys start with the creator's validated username. A folder is a key prefix,
  not a separate bucket. No public bucket or permanent provider URL is exposed.
- A missing payment or generation configuration disables purchases honestly.

## Model routes

| Route | Required input | Output |
| --- | --- | --- |
| Edit | 10-15-second video | FLUX Video Edit, source duration, 720p |
| Perform | Image + audio; optional video; audio/video at most 15 seconds | HeyGen Video 1, 768p, 10-15 seconds |
| Imagine | Video; optional image/audio within reference limits | Seedance 2.0 Mini, 720p, 10-15 seconds |
| Adventure | Video; optional image/audio within reference limits | Seedance 2.5, 720p, 20-30 seconds |

## Assurance and operating limits

Users see what is retained, changed, and imagined before buying. Media validation
is authoritative on the server, not just browser-reported metadata. Delivery is
complete only after a verified R2 object exists. Retrying transfer of the same
provider result must never start another paid generation. An ambiguous provider
submission is held for reconciliation rather than blindly resubmitted.

The UI provides one shared navigation and persisted Light, Dark, and Dim themes,
responsive layouts, the supplied Yetzer logo, and an installable PWA shell.
No invented completed films, user counts, scores, or provider receipts appear.

## Infrastructure and launch configuration

- Worker: `yetzer`; D1: `yetzer-db`; private R2: `yetzer-media`.
- `yetzer-generation` Workflow performs one provider submission, polls, retries
  delivery of that same result, verifies R2 and sleeps until deletion time.
- A one-minute cron maintains daily releases, the generation outbox, expiry and
  refunds. D1 leases coordinate daily release creation; no extra Durable Object,
  Queue or Pipeline is needed for this volume.
- Authentication secrets are generated with `openssl rand -hex 32`, persisted
  in ignored code-root `.env`, then uploaded unchanged. Password/passcode hashes
  use PBKDF2-SHA256 with random salts and a separate HMAC pepper.
- Set `OPENROUTER_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` through
  Worker secrets and change `SALES_ENABLED` to `true` only when ready. Stripe
  webhook URL is `/api/webhooks/stripe`. No real payment or AI test is performed.
- Configurable preview prices are USD 9.99 short / 14.99 long; owner confirmation
  is still pending. Do not open sales until these prices are approved.
- Custom-domain linking is left to the owner. Update `APP_URL` to the canonical
  HTTPS domain as well; origin checks, checkout returns and reference links use it.

## Verification boundary

Build/type checks and pure rule tests may run without starting a web server.
Never test the app on localhost. Verify deployed pages and non-generative APIs.
Do not execute AI generation or payment transactions during this implementation.
Live generation remains unverified until the owner supplies a provider key and
explicitly authorizes a paid test.
