# Yetzer

Yetzer is a daily, paid creative video quest app running on Cloudflare Workers. Five quests are drawn from an immutable pool of 220 each New York day. A completed purchase permits one generation; the creator may download the result, while public results expire after 47 hours.

The app uses React Router, D1 for accounts, quests, orders and generation records, private R2 for uploaded and generated media, and a Cloudflare Workflow for asynchronous generation. See [APP.md](../APP.md) for product rules and operations.

## Local checks

From this directory, run `pnpm install`, `pnpm typecheck`, `node --test scripts/*.test.mjs`, `pnpm exec tsx --test scripts/rules.test.ts`, and `pnpm build`. These checks do not call AI models or perform payments. Do not use localhost to validate this app.

## Deployment

`wrangler.jsonc` defines the Worker, D1 database, R2 bucket, Workflow, and cron. Apply migrations with `pnpm exec wrangler d1 migrations apply yetzer-db --remote` and deploy with `pnpm exec wrangler deploy`. Run `node scripts/prepare-assets.mjs` before building if the supplied `../yetzer.svg` changes.

The private `.env` holds `YETZER_JWT_SECRET` and `YETZER_PASSWORD_PEPPER`. Both must be 32 random bytes encoded as 64 hex characters and uploaded as Worker secrets; never commit or print their values. The same values must remain consistent across deployments. Sales stay disabled until `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `OPENROUTER_API_KEY`, a correct `APP_URL`, and approved prices are configured and payment/provider flows have been verified. The browser must never receive these secrets.

The `/schedule` page publishes the New York opening, purchase, submission, and expiry windows. Do not treat a successful build or deploy as proof that paid generation works end to end.

Short plays (Edit, Perform, Imagine) cost USD 2.99; Adventure costs USD 7.99. Each purchase permits one creative submission. Separate audio uploads must be 5-15 seconds for every audio-capable quest. Perform requires an image and audio, and lets the user choose a 10-15 second output independently of the audio length. Extra text remains optional but is recommended to state desired changes and details to preserve.

Purchases are non-refundable, including creative dissatisfaction and technical failures, subject to applicable statutory rights. Service failures are recorded without issuing Stripe refunds or granting a free new attempt. Historical Stripe refund notifications are still reconciled.

Checkout names start with `Yetzer:`. New Checkout Sessions and their PaymentIntents include `app=yetzer`, purchase and quest references, the quest kind, and the refund-policy identifier for reconciliation. The PaymentIntent description also starts with `Yetzer:`. These labels attribute payments; funds still share the Stripe account's combined balance.
