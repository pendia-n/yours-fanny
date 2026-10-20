# Daily mix and funding operations

## Implemented in this release

- The New York calendar date seeds one reproducible draw. A probability >= 0.5
  selects two distinct Adventures and three shorts; otherwise one Adventure and
  four shorts. All five templates are distinct; future dates may reuse templates.
- The existing minutely scheduled maintenance publishes the new day's board at
  the first execution after New York midnight, not at a fixed UTC hour.
- D1 leases/snapshots retain a published day's board. This release does not
  replace already published quests or invalidate associated purchases.
- Short plays remain USD 2.99; Adventure becomes USD 11.99. Existing pending
  checkouts at old prices are rejected rather than silently reused.
- Existing D1 triggers allow at most three generation records per account per
  New York submission day, regardless of type, quest, outcome or quality.
  One paid purchase can create only one generation record.

## Funding recommendations only, not implemented here

Do not send a generation to OpenRouter hoping a later top-up will rescue it.
Reserve estimated credits before selling/dispatching work. Already accepted work
should wait durably with an explicit funding status and bounded wait policy;
new sales should stop when funds cannot be reserved. Do not block an HTTP request
or automatically resubmit a provider request with an ambiguous outcome.

GET https://openrouter.ai/api/v1/credits returns total_credits and total_usage.
The official reference currently requires a Management Key, not necessarily the
existing inference key. Store any such key only in Worker secrets, never browser
code, a public health response, source control or operational logs.
The account balance is not an atomic reservation and may be shared by other apps.

For a burst of 20 maximum-length Imagine jobs plus one maximum Adventure, the
previous token-cost estimate is 20 * 1.3608 + 8.01792 = 35.23392 credits.
Use an internal rounded reservation of 1.60 credits per short and 9.50 per
Adventure as a provisional safety budget, not a provider price guarantee.
The burst needs 41.50 reserved credits, plus a working buffer.

For that scale, a provisional rule is: at 50 unreserved credits, buy 50 more
credits, with explicit monthly cash limits and a low-balance sales gate. For low
traffic, a smaller reserve may be sufficient. Never depend on pending Stripe
payouts to Mercury arriving before generation needs to start.

A future dispatcher can use one Durable Object for atomic global reservations
and a small dispatch concurrency limit, D1 for the purchase/job ledger, existing
Workflows for durable waits/polling, and private R2 for source/output media.
Twenty-one HTTP requests do not require twenty-one simultaneous model calls.
Waiting changes timing and concurrency, not total model expenditure.

This release does not enable automatic top-ups, add a Management Key, query the
live balance, create a funding queue, or modify the no-voluntary-refund policy.

Sources checked:
- https://openrouter.ai/docs/api/api-reference/credits/get-remaining-credits
- https://openrouter.ai/docs/api/api-reference/api-keys/get-current-api-key
- https://developers.cloudflare.com/workflows/build/sleeping-and-retrying/
