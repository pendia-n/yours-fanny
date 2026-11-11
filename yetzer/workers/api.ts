import { canSubmitPurchase, schedule, type Quest } from "../app/lib/domain";
import { authApi, currentAccount, publicUser, rateLimit, requireAccount } from "./auth";
import { createCheckout, expireOutdatedCheckouts, stripe, stripeWebhook, type Purchase } from "./billing";
import { digest } from "./crypto";
import { expireGeneration, limitedBytes, type Generation } from "./generation";
import { loadMaterials, queuePaidGeneration, queuePreparedPurchase, readPreparation, UPLOAD_UNREFERENCED } from "./fulfillment";
import { wakeFunding } from "./funding";
import { inspectMedia, validateUploadDuration, validateInputs } from "./media";
import { ensureDaily, getQuest, serviceReadiness } from "./quests";
import { assertMutationOrigin, HttpError, json, readJson, textField, type AppEnv } from "./types";

async function streamObject(request: Request, env: AppEnv, key: string, attachment?: string) {
  const object = await env.MEDIA.get(key, { range: request.headers });
  if (!object) throw new HttpError(410, "This media file is no longer available.");
  const headers = new Headers({ "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream", "Cache-Control": "private, no-store", "Accept-Ranges": "bytes", "X-Content-Type-Options": "nosniff", "Content-Disposition": attachment ? `attachment; filename="${attachment}"` : "inline" });
  const range = object.range;
  if (range && "offset" in range && "length" in range && range.offset !== undefined && range.length !== undefined) {
    headers.set("Content-Range", `bytes ${range.offset}-${range.offset + range.length - 1}/${object.size}`);
    headers.set("Content-Length",String(range.length));
    return new Response(object.body,{ status:206,headers });
  }
  headers.set("Content-Length",String(object.size));
  return new Response(object.body,{ headers });
}
export async function manifestation(env: AppEnv) {
  const rows = await env.DB.prepare("SELECT g.id,g.quest_id,g.completed_at,g.expires_at,g.views,a.username,q.snapshot FROM generations g JOIN accounts a ON a.id=g.account_id JOIN daily_quests q ON q.id=g.quest_id WHERE g.status='completed' AND g.expires_at>? AND g.r2_key IS NOT NULL ORDER BY q.day DESC,q.position ASC,g.views DESC,g.completed_at DESC,g.id ASC").bind(Date.now()).all<{ id:string; quest_id:string; completed_at:number; expires_at:number; views:number; username:string; snapshot:string }>();
  const groups = new Map<string, { quest:Quest; films: Omit<typeof rows.results[number],"snapshot">[] }>();
  for (const row of rows.results) { if (!groups.has(row.quest_id)) groups.set(row.quest_id,{ quest:JSON.parse(row.snapshot),films:[] }); const {snapshot,...film}=row; groups.get(row.quest_id)!.films.push(film); }
  return [...groups.values()];
}
export async function myPlays(env: AppEnv, accountId: string) {
  const rows = await env.DB.prepare("SELECT p.id,p.quest_id,p.purchase_day,p.status,p.price_cents,p.created_at,p.expires_at,p.failure_code,p.checkout_url,p.prepared_upload_ids IS NOT NULL AS auto_submit,g.id AS generation_id,g.status AS generation_status,g.completed_at,g.expires_at AS media_expires_at,g.error_code,g.raw_text,q.snapshot FROM purchases p JOIN daily_quests q ON q.id=p.quest_id LEFT JOIN generations g ON g.purchase_id=p.id WHERE p.account_id=? ORDER BY p.created_at DESC LIMIT 100").bind(accountId).all<Record<string,any>>();
  return rows.results.map(({snapshot,...row})=>({ ...row,quest:JSON.parse(snapshot) as Quest,canSubmit:row.status === "paid" && !row.auto_submit && canSubmitPurchase(row.purchase_day),canDownload:row.generation_status === "completed" && row.media_expires_at>Date.now() }));
}
export async function handleApi(request: Request, env: AppEnv): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (path === "/api/webhooks/stripe" && request.method === "POST") return stripeWebhook(request,env);
  if (!["GET","HEAD"].includes(request.method)) assertMutationOrigin(request,env);
  const auth = await authApi(request,env,path); if (auth) return auth;
  if (path === "/api/health" && request.method === "GET") {
    const count = await env.DB.prepare("SELECT COUNT(*) AS count FROM quest_templates").first<{count:number}>();
    return json({ ok:count?.count === 220,questCount:count?.count, ...serviceReadiness(env), schedule:schedule() });
  }
  if (path === "/api/quests" && request.method === "GET") return json({ quests:await ensureDaily(env),schedule:schedule(),...serviceReadiness(env) });
  if (path === "/api/manifestation" && request.method === "GET") return json({ groups:await manifestation(env) });
  if (path === "/api/plays" && request.method === "GET") { const user = await requireAccount(request,env); return json({ plays:await myPlays(env,user.id) }); }
  if (path === "/api/purchases" && request.method === "POST") {
    const user = await requireAccount(request,env), body = await readJson(request);
    await rateLimit(env,`purchase:${user.id}`,10,60000);
    const quest=await getQuest(env,textField(body,"questId",100)),prepared=readPreparation(body);
    const materials=await loadMaterials(env,user.id,prepared.uploadIds,Date.now()+3600000);
    validateInputs(quest,materials);
    return json(await createCheckout(env,user,quest,textField(body,"requestId",36),prepared),201);
  }
  if (path === "/api/uploads" && request.method === "POST") {
    const user = await requireAccount(request,env);
    const questId = new URL(request.url).searchParams.get("questId");
    const quest = questId ? await getQuest(env,questId) : undefined;
    const window = schedule();
    if (!window.purchase || quest && quest.day !== window.day) {
      const tickets = await env.DB.prepare("SELECT purchase_day FROM purchases WHERE account_id=? AND status='paid'" + (quest ? " AND quest_id=?" : "")).bind(...(quest ? [user.id,quest.id] : [user.id])).all<{purchase_day:string}>();
      if (!tickets.results.some(ticket=>canSubmitPurchase(ticket.purchase_day))) throw new HttpError(409,"Material uploads are closed now (New York time). Check opening hours before preparing your files.");
    }
    await rateLimit(env,`upload:${user.id}`,15,3600000);
    const reserved = await env.DB.prepare("SELECT COUNT(*) AS count FROM uploads WHERE account_id=? AND expires_at>?").bind(user.id,Date.now()).first<{count:number}>();
    if ((reserved?.count ?? 0)>=12) throw new HttpError(429,"You have enough prepared materials. Remove an unused upload before adding another.");
    const length = Number(request.headers.get("content-length"));
    if (!request.body || length>40*1024*1024) throw new HttpError(413,"Keep each file under 40 MB.");
    const bytes = await limitedBytes(request.body,40*1024*1024), info = inspectMedia(bytes);
    validateUploadDuration(info,quest?.kind);
    if (info.kind === "image" && bytes.length>10*1024*1024) throw new HttpError(413,"Keep images under 10 MB.");
    const id = crypto.randomUUID(), key = `${user.username}/uploads/${id}`;
    await env.MEDIA.put(key,bytes,{ httpMetadata:{contentType:info.contentType,cacheControl:"private, no-store"} });
    try { await env.DB.prepare("INSERT INTO uploads(id,account_id,kind,r2_key,content_type,size,duration,width,height,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)").bind(id,user.id,info.kind,key,info.contentType,bytes.length,info.duration,info.width,info.height,Date.now(),Date.now()+48*3600000).run(); }
    catch (e) { await env.MEDIA.delete(key); throw e; }
    return json({ id,...info,size:bytes.length },201);
  }
  const uploadDelete = path.match(/^\/api\/uploads\/([a-f0-9-]+)$/);
  if (uploadDelete && request.method === "DELETE") {
    const user = await requireAccount(request,env);
    const row = await env.DB.prepare(`DELETE FROM uploads WHERE id=? AND account_id=? AND ${UPLOAD_UNREFERENCED} RETURNING r2_key`).bind(uploadDelete[1],user.id).first<{r2_key:string}>();
    if (row) await env.MEDIA.delete(row.r2_key);
    else if (await env.DB.prepare("SELECT 1 FROM uploads WHERE id=? AND account_id=?").bind(uploadDelete[1],user.id).first()) throw new HttpError(409,"This material is attached to a checkout or play.");
    return json({ok:true});
  }
  const submit = path.match(/^\/api\/plays\/([a-f0-9-]+)\/submit$/);
  if (submit && request.method === "POST") {
    const user = await requireAccount(request,env), body = await readJson(request);
    if (!env.OPENROUTER_API_KEY) throw new HttpError(503,"Video generation is not configured yet. No play has been consumed.");
    const purchase = await env.DB.prepare("SELECT * FROM purchases WHERE id=? AND account_id=?").bind(submit[1],user.id).first<Purchase>();
    if (!purchase) throw new HttpError(404,"Purchase not found.");
    const previous = await env.DB.prepare("SELECT id,status FROM generations WHERE purchase_id=?").bind(purchase.id).first();
    if (previous) return json({ generation:previous,alreadySubmitted:true });
    if (purchase.status !== "paid") throw new HttpError(409,"Payment must be verified before you can submit.");
    if (purchase.prepared_upload_ids) {
      await queuePreparedPurchase(env,purchase.id);
      return json({ generation:await env.DB.prepare("SELECT id,status FROM generations WHERE purchase_id=?").bind(purchase.id).first(),alreadySubmitted:true },202);
    }
    if (!canSubmitPurchase(purchase.purchase_day)) throw new HttpError(409,"Submission is closed for this purchase.");
    const prepared = readPreparation(body), quest = await getQuest(env,purchase.quest_id);
    const uploads = await loadMaterials(env,user.id,prepared.uploadIds,Date.now()+3600000);
    return json({generation:await queuePaidGeneration(env,purchase,quest,prepared,uploads)},202);
  }
  const ref = path.match(/^\/api\/references\/([a-f0-9-]+)\/([a-f0-9-]+)$/);
  if (ref && request.method === "GET") {
    const token = new URL(request.url).searchParams.get("token") ?? "";
    const row = await env.DB.prepare("SELECT * FROM generations WHERE id=? AND reference_token_hash=? AND reference_expires_at>?").bind(ref[1],await digest(token),Date.now()).first<Generation>();
    if (!row || !(JSON.parse(row.upload_ids) as string[]).includes(ref[2])) throw new HttpError(403,"This material link expired.");
    const upload = await env.DB.prepare("SELECT r2_key FROM uploads WHERE id=? AND account_id=?").bind(ref[2],row.account_id).first<{r2_key:string}>();
    if (!upload) throw new HttpError(404,"Material unavailable.");
    return streamObject(request,env,upload.r2_key);
  }
  const film = path.match(/^\/api\/films\/([a-f0-9-]+)\/(stream|download|view)$/);
  if (film) {
    const row = await env.DB.prepare("SELECT * FROM generations WHERE id=? AND status='completed' AND expires_at>?").bind(film[1],Date.now()).first<Generation>();
    if (!row?.r2_key) throw new HttpError(410,"This film is no longer available. Films stay for 47 hours.");
    if (film[2] === "view" && request.method === "POST") {
      const user=await requireAccount(request,env);
      await rateLimit(env,`view:${user.id}`,30,60000);
      if(user.id !== row.account_id) await env.DB.prepare("UPDATE generations SET views=views+1 WHERE id=? AND status='completed' AND expires_at>?").bind(row.id,Date.now()).run();
      return json({ok:true});
    }
    if (request.method === "GET" && film[2] === "download") { const user=await requireAccount(request,env); if(user.id !== row.account_id) throw new HttpError(403,"Only the creator can download this film."); return streamObject(request,env,row.r2_key,`yetzer-${row.id}.mp4`); }
    if (request.method === "GET" && film[2] === "stream") return streamObject(request,env,row.r2_key);
  }
  throw new HttpError(404,"This API route was not found.");
}
export async function maintenance(env: AppEnv) {
  const prepared = await env.DB.prepare("SELECT id FROM purchases WHERE status='paid' AND prepared_upload_ids IS NOT NULL ORDER BY paid_at LIMIT 25").all<{id:string}>();
  for (const row of prepared.results) {
    try { await queuePreparedPurchase(env,row.id); }
    catch { console.warn("Paid play could not be queued",row.id); }
  }
  if (await env.DB.prepare("SELECT 1 FROM generations WHERE status IN ('queued','waiting_funds','funded') LIMIT 1").first()) {
    try { await wakeFunding(env); } catch { /* The next maintenance tick will try again. */ }
  }
  await ensureDaily(env);
  const expired = await env.DB.prepare("SELECT id,r2_key,upload_ids FROM generations WHERE status <> 'expired' AND expires_at<=? LIMIT 50").bind(Date.now()).all<Generation>();
  for (const row of expired.results) await expireGeneration(env,row);
  const uploads = await env.DB.prepare(`SELECT id,r2_key FROM uploads WHERE expires_at<=? AND ${UPLOAD_UNREFERENCED} LIMIT 50`).bind(Date.now()).all<{id:string;r2_key:string}>();
  for (const row of uploads.results) { await env.MEDIA.delete(row.r2_key); await env.DB.prepare("DELETE FROM uploads WHERE id=?").bind(row.id).run(); }
  await env.DB.batch([env.DB.prepare("DELETE FROM rate_limits WHERE expires_at<?").bind(Date.now()-86400000),env.DB.prepare("DELETE FROM recovery_tickets WHERE expires_at<?").bind(Date.now())]);
  await env.DB.prepare("UPDATE generations SET raw_text='',prompt='',upload_ids='[]' WHERE status='service_failed' AND created_at<?").bind(Date.now()-48*3600000).run();
  if(env.STRIPE_SECRET_KEY) {
    await expireOutdatedCheckouts(env);
    const stale=await env.DB.prepare("SELECT * FROM purchases WHERE status IN ('pending','reserved') AND created_at<? LIMIT 10").bind(Date.now()-35*60000).all<Purchase>();
    for(const row of stale.results) {
      if(!row.checkout_id) continue;
      try { const session=await stripe(env,`checkout/sessions/${encodeURIComponent(row.checkout_id)}`); if(session.status === "expired" && session.payment_status !== "paid") await env.DB.prepare("UPDATE purchases SET status='expired' WHERE id=? AND status IN ('reserved','pending') AND payment_intent IS NULL").bind(row.id).run(); } catch { /* Never release a possibly paid reservation on a network error. */ }
    }
  }
}
