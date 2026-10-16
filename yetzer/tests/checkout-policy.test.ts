import assert from "node:assert/strict";
import test from "node:test";
import { createCheckout, markServiceFailure } from "../workers/billing";
import { ROUTES, type Quest, type QuestKind } from "../app/lib/domain";
import type { Account, AppEnv } from "../workers/types";

const quest = (kind: QuestKind): Quest => ({
  id: `2026-10-19_${kind}`, templateId: kind, day: "2026-10-19", title: "A playful scene",
  invitation: "", preparation: "", transformation: "", preserve: "", kind,
  duration: kind === "adventure" ? 30 : 15, priceCents: kind === "adventure" ? 799 : 299,
  ...ROUTES[kind],
});
function environment(existing: unknown = null) {
  const writes: { sql: string; values: unknown[] }[] = [];
  const env = {
    APP_URL: "https://www.yetzer.lol", SALES_ENABLED: "true",
    OPENROUTER_API_KEY: "test-only", STRIPE_SECRET_KEY: "test-only", STRIPE_WEBHOOK_SECRET: "test-only",
    DB: { prepare(sql: string) {
      let values: unknown[] = [];
      return { bind(...args: unknown[]) { values = args; return this; },
        async first() { return existing; }, async run() { writes.push({ sql, values }); return {}; } };
    } },
  } as unknown as AppEnv;
  return { env, writes };
}

test("Checkout labels Yetzer on the page and PaymentIntent with the new ticket prices", async t => {
  t.mock.method(Date, "now", () => Date.parse("2026-10-19T16:00:00Z"));
  const requests: URLSearchParams[] = [];
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.equal(url, "https://api.stripe.com/v1/checkout/sessions");
    assert.equal(init.method, "POST");
    requests.push(new URLSearchParams(init.body as URLSearchParams));
    return Response.json({ id: "cs_test", url: "https://checkout.stripe.com/test" });
  });
  for (const kind of ["edit", "perform", "imagine", "adventure"] as const) {
    const { env } = environment(), q = quest(kind), id = crypto.randomUUID();
    await createCheckout(env, { id: "account-test" } as Account, q, id);
    const fields = requests.at(-1)!;
    assert.equal(fields.get("mode"), "payment");
    assert.equal(fields.get("line_items[0][price_data][unit_amount]"), String(q.priceCents));
    assert.equal(fields.get("line_items[0][price_data][product_data][name]"), `Yetzer: ${q.title}`);
    assert.equal(fields.get("metadata[app]"), "yetzer");
    assert.equal(fields.get("payment_intent_data[metadata][app]"), "yetzer");
    assert.equal(fields.get("payment_intent_data[metadata][purchase_id]"), id);
    assert.equal(fields.get("payment_intent_data[metadata][quest_kind]"), kind);
    assert.equal(fields.get("payment_intent_data[metadata][refund_policy]"), "no_voluntary_refunds");
    assert.equal(fields.get("payment_intent_data[description]"), `Yetzer: ${q.title}`);
    assert.match(fields.get("custom_text[submit][message]")!, /No refunds.*technical failure/);
  }
  assert.equal(requests.length, 4);
});

test("an old pending checkout is not reused at a newly displayed price", async t => {
  t.mock.method(Date, "now", () => Date.parse("2026-10-19T16:00:00Z"));
  t.mock.method(globalThis, "fetch", async () => { throw new Error("No Stripe request expected"); });
  const q = quest("edit"), id = crypto.randomUUID();
  const { env } = environment({ id, account_id: "account-test", quest_id: q.id, price_cents: 699, status: "pending", checkout_url: "https://checkout.stripe.com/old" });
  await assert.rejects(createCheckout(env, { id: "account-test" } as Account, q, id), /earlier ticket price/);
});

test("service failures record a terminal purchase status without issuing a Stripe refund", async t => {
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw new Error("No refund request expected"); });
  const { env, writes } = environment();
  await markServiceFailure(env, "purchase-test", "delivery_failed");
  assert.equal(fetch.mock.callCount(), 0);
  assert.equal(writes.length, 1);
  assert.match(writes[0].sql, /status='service_failed'/);
  assert.match(writes[0].sql, /refund_id IS NULL/);
  assert.deepEqual(writes[0].values, ["delivery_failed", "purchase-test"]);
});
