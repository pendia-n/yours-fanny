# Yetzer

Yetzer is a daily, paid creative video quest app running on Cloudflare Workers. Five quests are drawn from an immutable pool of 220 each New York day. A completed purchase permits one generation; the creator may download the result, while public results expire after 47 hours.

The app uses React Router, D1 for accounts, quests, orders and generation records, private R2 for uploaded and generated media, and a Cloudflare Workflow for asynchronous generation. See [APP.md](../APP.md) for product rules and operations.

## Local checks

From this directory, run `pnpm install`, `pnpm typecheck`, `node --test scripts/*.test.mjs`, `pnpm exec tsx --test scripts/rules.test.ts`, and `pnpm build`. These checks do not call AI models or perform payments. Do not use localhost to validate this app.

## Deployment

`wrangler.jsonc` defines the Worker, D1 database, R2 bucket, Workflow, and cron. Apply migrations with `pnpm exec wrangler d1 migrations apply yetzer-db --remote` and deploy with `pnpm exec wrangler deploy`. Run `node scripts/prepare-assets.mjs` before building if the supplied `../yetzer.svg` changes.

The private `.env` holds `YETZER_JWT_SECRET` and `YETZER_PASSWORD_PEPPER`. Both must be 32 random bytes encoded as 64 hex characters and uploaded as Worker secrets; never commit or print their values. The same values must remain consistent across deployments. Sales stay disabled until `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `OPENROUTER_API_KEY`, a correct `APP_URL`, and approved prices are configured and payment/provider flows have been verified. The browser must never receive these secrets.

The `/schedule` page publishes the New York opening, purchase, submission, and expiry windows. Do not treat a successful build or deploy as proof that paid generation works end to end.
