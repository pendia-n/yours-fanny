import { schedule, submissionDeadline, type Quest } from "../app/lib/domain";
import { equal, hmac } from "./crypto";
import { serviceReadiness } from "./quests";
import { HttpError, json, boundedText, type Account, type AppEnv } from "./types";
export type Purchase = { id: string; account_id: string; quest_id: string; purchase_day: string; status: string; price_cents: number; checkout_id: string | null; checkout_url: string | null; payment_intent: string | null; expires_at: number; created_at: number };
export async function stripe(env: AppEnv, path: string, values?: Record<string, string>, idempotencyKey?: string) {
  if (!env.STRIPE_SECRET_KEY) throw new HttpError(503, "Payments are not available yet.");
  const response = await fetch(`https://api.stripe.com/v1/${path}`, { method: values ? "POST" : "GET", headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, ...(values ? { "Content-Type": "application/x-www-form-urlencoded" } : {}), ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) }, body: values ? new URLSearchParams(values) : undefined, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new HttpError(502, "Payment service is temporarily unavailable. Your purchase has not been granted.", "payment_service");
  return await response.json() as Record<string, any>;
}
export async function createCheckout(env: AppEnv, user: Account, quest: Quest, requestId: string) {
  const time = schedule();
  if (!serviceReadiness(env).salesReady) throw new HttpError(503, "Purchases are not open yet. Generation and payment services must be configured first.");
  if (!time.purchase || time.day !== quest.day) throw new HttpError(409, "Today's purchase window is closed.");
  if (!/^[0-9a-f-]{36}$/.test(requestId)) throw new HttpError(400, "Provide a UUID requestId for this purchase.");
  let purchase = await env.DB.prepare("SELECT * FROM purchases WHERE id=?").bind(requestId).first<Purchase>();
  if (purchase && (purchase.account_id !== user.id || purchase.quest_id !== quest.id)) throw new HttpError(409, "This purchase reference is already in use.");
  if (purchase?.checkout_url && purchase.status === "pending") return { url: purchase.checkout_url, purchaseId: purchase.id };
  if (purchase && purchase.status !== "reserved") throw new HttpError(409, "This purchase is already being processed. Check My plays.");
  if (!purchase) {
    try { await env.DB.prepare("INSERT INTO purchases(id,account_id,quest_id,purchase_day,status,price_cents,created_at,expires_at) VALUES(?,?,?,?,'reserved',?,?,?)").bind(requestId, user.id, quest.id, time.day, quest.priceCents, time.now, submissionDeadline(time.day)).run(); }
    catch (e) { if (String(e).includes("daily_purchase_limit")) throw new HttpError(409, "You can buy up to three plays per New York day."); throw e; }
  }
  const session = await stripe(env, "checkout/sessions", {
    mode: "payment", success_url: `${env.APP_URL}/plays?purchase=${requestId}`, cancel_url: `${env.APP_URL}/quests/${quest.id}?checkout=cancelled`,
    client_reference_id: requestId, "metadata[purchase_id]": requestId,
    "line_items[0][price_data][currency]": "usd", "line_items[0][price_data][unit_amount]": String(quest.priceCents),
    "line_items[0][price_data][product_data][name]": `Yetzer: ${quest.title}`,
    "line_items[0][price_data][product_data][description]": `One creative submission. ${quest.kind === "adventure" ? "15-30" : "10-15"}-second output. Download within 47 hours of completion.`,
    "metadata[quest_title]": quest.title,
    "line_items[0][quantity]": "1", expires_at: String(Math.floor(Date.now() / 1000) + 1800),
  }, `yetzer-checkout-${requestId}`);
  if (typeof session.url !== "string" || !session.url.startsWith("https://checkout.stripe.com/")) throw new HttpError(502, "Checkout did not return a usable link.");
  await env.DB.prepare("UPDATE purchases SET status='pending',checkout_id=?,checkout_url=? WHERE id=? AND status='reserved'").bind(session.id, session.url, requestId).run();
  return { url: session.url, purchaseId: requestId };
}
export async function refundServiceFailure(env: AppEnv, purchaseId: string, code: string) {
  const purchase = await env.DB.prepare("SELECT * FROM purchases WHERE id=?").bind(purchaseId).first<Purchase>();
  if (!purchase || purchase.status === "refunded") return;
  await env.DB.prepare("UPDATE purchases SET status='refunding',failure_code=? WHERE id=?").bind(code, purchaseId).run();
  if (!purchase.payment_intent || !env.STRIPE_SECRET_KEY) return;
  const refundAmount = Math.round(purchase.price_cents / 2);
  const refund = await stripe(env, "refunds", { payment_intent: purchase.payment_intent, amount: String(refundAmount), "metadata[purchase_id]": purchaseId, "metadata[refund_percent]": "50" }, `yetzer-service-refund-${purchaseId}`);
  await env.DB.prepare("UPDATE purchases SET status=?,refund_id=? WHERE id=?").bind(refund.status === "succeeded" ? "refunded" : "refunding", refund.id, purchaseId).run();
}
export async function stripeWebhook(request: Request, env: AppEnv) {
  if (!env.STRIPE_WEBHOOK_SECRET) throw new HttpError(503, "Payment verification is not configured.");
  const raw = await boundedText(request,262144);
  const parts = (request.headers.get("stripe-signature") ?? "").split(",").map(s => s.split("="));
  const timestamp = parts.find(([k]) => k === "t")?.[1];
  if (!timestamp || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw new HttpError(400, "Invalid webhook timestamp.");
  const signature = await hmac(`${timestamp}.${raw}`, env.STRIPE_WEBHOOK_SECRET);
  const valid = parts.filter(([k,v]) => k === "v1" && /^[a-f0-9]{64}$/.test(v)).some(([,v]) => equal(signature, Uint8Array.from(v.match(/../g)!, h => parseInt(h,16))));
  if (!valid) throw new HttpError(400, "Invalid webhook signature.");
  const event = JSON.parse(raw), session = event.data?.object;
  if (await env.DB.prepare("SELECT 1 FROM webhook_events WHERE id=?").bind(event.id).first()) return json({ received: true });
  if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type) && session?.payment_status === "paid") {
    const id = session.metadata?.purchase_id;
    const purchase = typeof id === "string" ? await env.DB.prepare("SELECT * FROM purchases WHERE id=?").bind(id).first<Purchase>() : null;
    if (!purchase || session.client_reference_id !== id || session.amount_total !== purchase.price_cents || session.currency !== "usd" || (purchase.checkout_id && purchase.checkout_id !== session.id)) throw new HttpError(400, "Payment does not match its purchase.");
    if (!purchase.checkout_id) await env.DB.prepare("UPDATE purchases SET checkout_id=? WHERE id=? AND checkout_id IS NULL").bind(session.id,id).run();
    const paidAt = Number(event.created) * 1000;
    const paidWindow = schedule(paidAt);
    await env.DB.prepare("UPDATE purchases SET payment_intent=?,paid_at=? WHERE id=? AND payment_intent IS NULL").bind(session.payment_intent,paidAt,id).run();
    if (!paidWindow.purchase || paidWindow.day !== purchase.purchase_day || Date.now() >= purchase.expires_at || purchase.status === "expired") {
      await refundServiceFailure(env, id, "payment_outside_window");
    } else {
      await env.DB.prepare("UPDATE purchases SET status='paid' WHERE id=? AND status IN ('pending','reserved')").bind(id).run();
    }
  }
  if (["checkout.session.expired", "checkout.session.async_payment_failed"].includes(event.type) && session?.id) {
    await env.DB.prepare("UPDATE purchases SET status='expired' WHERE checkout_id=? AND status IN ('pending','reserved') AND payment_intent IS NULL").bind(session.id).run();
  }
  if (event.type === "refund.updated" && session?.status === "succeeded") await env.DB.prepare("UPDATE purchases SET status='refunded' WHERE refund_id=?").bind(session.id).run();
  await env.DB.prepare("INSERT OR IGNORE INTO webhook_events(id,type,processed_at) VALUES(?,?,?)").bind(event.id,event.type,Date.now()).run();
  return json({ received: true });
}
