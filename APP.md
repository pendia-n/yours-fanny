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
- A New York-date-seeded probability >=0.5 selects two distinct Adventures and
  three shorts; otherwise one Adventure and four shorts. Published boards do not reroll.
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
| Adventure | 15-30-second video; optional image/audio | Wan 3.0 (`alibaba/wan-3.0`), 720p, 15-25 seconds |

There is no image-generation model or per-user AI paraphrase step. Uploaded
images are provider references. `nex-agi/nex-n2.5-mini` creates daily quest
variants only. The final video prompt combines the quest, fixed constraints and
the user's optional text; raw text is retained separately until cleanup.

## Prices and automatic timing

- Edit, Perform and Imagine cost USD 2.99. Adventure costs USD 5.99, displayed
  beside its struck-through USD 11.99 previous price and "50% off Adventure".
  No sale deadline or countdown is invented.
- Pricing, quest cards and the purchase panel share the same discount display.
  Stripe Checkout uses inline `price_data` at 599/299 cents; no configured
  Product ID or Price ID is needed. App/payment metadata retains `app=yetzer`.
- Marketing copy sells the experience, not a specific number of output seconds.
  Required source-media lengths remain explicit beside the upload instructions.
- Users do not select output seconds. On submission, a versioned SHA-256 hash
  of the purchase ID and quest ID selects an integer target: 10-15 seconds for
  Perform/Imagine, 15-25 seconds for Adventure. The saved target is reused on
  duplicate requests and Workflow recovery; client `duration` values are ignored.
- Edit preserves its 10-15-second source length; FLUX receives no unsupported
  duration parameter. Perform stays at 768p; other routes stay at 720p.
- Video input stays 10-15 seconds for short quests, 15-30 seconds for Adventure.
  Separate audio always stays 5-15 seconds, independent of output duration.
- New generation rows use `output_policy_version=2`. Delivery accepts the
  route's allowed output interval (50 ms timestamp tolerance), not an exact
  match to the target. Edit must also match its measured source duration.
  Historical rows default to version 1 and keep their previous validation.
- Maintenance confirms and expires unpaid old-price Adventure Checkout
  Sessions, then expires their local purchase records. Paid sessions and
  uncertain/network-error states are never cancelled or repriced.

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
- A one-minute cron maintains daily releases, the generation outbox, media expiry
  and unpaid Checkout expiry. No automatic voluntary refunds are issued.
  D1 leases coordinate daily release creation; no extra Durable Object,
  Queue or Pipeline is needed for this volume.
- Authentication secrets are generated with `openssl rand -hex 32`, persisted
  in ignored code-root `.env`, then uploaded unchanged. Password/passcode hashes
  use PBKDF2-SHA256 with random salts and a separate HMAC pepper.
- Set `OPENROUTER_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` through
  Worker secrets and change `SALES_ENABLED` to `true` only when ready. Stripe
  webhook URL is `/api/webhooks/stripe`. No real payment or AI test is performed.
- Apply migration `0004_output_policy.sql` before deploying the new Worker.
  Prices are approved: `SHORT_PRICE_CENTS=299`, `LONG_PRICE_CENTS=599`.
  Purchases still require configured payment/provider secrets and `SALES_ENABLED=true`.
- Custom-domain linking is left to the owner. Update `APP_URL` to the canonical
  HTTPS domain as well; origin checks, checkout returns and reference links use it.

## Verification boundary

Build/type checks and pure rule tests may run without starting a web server.
Never test the app on localhost. Verify deployed pages and non-generative APIs.
Do not execute AI generation or payment transactions during this implementation.
This release does not perform paid generation or payment tests; build/deploy and
mocked provider tests are not proof of a completed paid transaction.
