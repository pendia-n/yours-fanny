import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { RETENTION_MS } from "../app/lib/domain";
import { refundServiceFailure } from "./billing";
import { digest, hmac, base64url } from "./crypto";
import { inspectMp4, type Upload } from "./media";
import type { AppEnv } from "./types";
export type Generation = { id: string; purchase_id: string; account_id: string; quest_id: string; status: string; model: string; resolution: string; duration: number; prompt: string; upload_ids: string; provider_id: string | null; provider_submitted_at: number | null; r2_key: string | null; completed_at: number | null; expires_at: number | null; reference_expires_at: number; aspect?: string };
export async function referenceToken(env: AppEnv, generationId: string) { return base64url(await hmac(`reference:${generationId}`, env.YETZER_JWT_SECRET)); }
async function providerJson(env: AppEnv, path: string, body?: unknown) {
  const response = await fetch(`https://openrouter.ai/api/v1/${path}`, { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, "Content-Type": "application/json", "HTTP-Referer": env.APP_URL, "X-Title": "Yetzer" }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(body ? 60000 : 30000) });
  if (!response.ok) throw new Error(`provider_http_${response.status}`);
  return await response.json() as { id?: string; status: string; generation_id?: string; unsigned_urls?: string[]; usage?: { cost?: number } };
}
async function fetchOutput(env: AppEnv, providerId: string) {
  let url = `https://openrouter.ai/api/v1/videos/${encodeURIComponent(providerId)}/content?index=0`;
  for (let i = 0; i < 6; i++) {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port || !parsed.hostname.includes(".") || /^(\d+\.){3}\d+$/.test(parsed.hostname) || parsed.hostname.endsWith(".local") || parsed.hostname.endsWith(".internal")) throw new Error("unsafe_output_url");
    const response = await fetch(url, { headers: parsed.hostname === "openrouter.ai" ? { Authorization: `Bearer ${env.OPENROUTER_API_KEY}` } : {}, redirect: "manual", signal: AbortSignal.timeout(90000) });
    if ([301,302,303,307,308].includes(response.status)) { const next = response.headers.get("location"); if (!next) throw new Error("missing_download_redirect"); url = new URL(next,url).href; continue; }
    if (!response.ok || !response.body) throw new Error("provider_download_failed");
    return response;
  }
  throw new Error("too_many_download_redirects");
}
export async function limitedBytes(body: ReadableStream<Uint8Array>, limit: number) {
  const reader = body.getReader(), chunks: Uint8Array[] = []; let size = 0;
  while (true) { const item = await reader.read(); if (item.done) break; size += item.value.length; if (size > limit) { await reader.cancel(); throw new Error("media_too_large"); } chunks.push(item.value); }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.length; }
  return bytes;
}
export async function expireGeneration(env: AppEnv, generation: Pick<Generation,"id"|"r2_key"|"upload_ids">) {
  if (generation.r2_key) await env.MEDIA.delete(generation.r2_key);
  const ids = JSON.parse(generation.upload_ids) as string[];
  for (const id of ids) {
    const upload = await env.DB.prepare("SELECT r2_key FROM uploads WHERE id=?").bind(id).first<{ r2_key: string }>();
    if (upload) { await env.MEDIA.delete(upload.r2_key); await env.DB.prepare("DELETE FROM uploads WHERE id=?").bind(id).run(); }
  }
  await env.DB.prepare("UPDATE generations SET status='expired',r2_key=NULL,raw_text='',prompt='',upload_ids='[]',reference_expires_at=0 WHERE id=?").bind(generation.id).run();
}
export class GenerationWorkflow extends WorkflowEntrypoint<AppEnv, { generationId: string }> {
  async run(event: WorkflowEvent<{ generationId: string }>, step: WorkflowStep) {
    const id = event.payload.generationId;
    const load = () => this.env.DB.prepare("SELECT * FROM generations WHERE id=?").bind(id).first<Generation>();
    const initial = await step.do("load-generation", async () => { const row = await load(); if (!row) throw new Error("generation_missing"); return row; });
    try {
      const providerId = await step.do("submit-once", { retries: { limit: 0, delay: "1 second", backoff: "constant" }, timeout: "2 minutes" }, async () => {
        const current = await load(); if (!current) throw new Error("generation_missing");
        if (current.provider_id) return current.provider_id;
        // Persist the attempt before network I/O. A crash or timeout is ambiguous,
        // not permission to purchase a second provider generation.
        const claim = await this.env.DB.prepare("UPDATE generations SET status='submitting',provider_submitted_at=? WHERE id=? AND provider_submitted_at IS NULL RETURNING id").bind(Date.now(),id).first();
        if (!claim) throw new Error("submission_ambiguous");
        if (!this.env.OPENROUTER_API_KEY) throw new Error("provider_not_configured");
        const uploads: Upload[] = [];
        for (const uploadId of JSON.parse(current.upload_ids)) { const row = await this.env.DB.prepare("SELECT * FROM uploads WHERE id=? AND account_id=?").bind(uploadId,current.account_id).first<Upload>(); if (!row) throw new Error("source_missing"); uploads.push(row); }
        const token = await referenceToken(this.env,id);
        const references = uploads.map(upload => ({ type: `${upload.kind}_url`, [`${upload.kind}_url`]: { url: `${this.env.APP_URL}/api/references/${id}/${upload.id}?token=${encodeURIComponent(token)}` } }));
        const video = uploads.find(u => u.kind === "video");
        const result = await providerJson(this.env,"videos", { model: current.model, prompt: current.prompt, duration: current.duration, resolution: current.resolution, aspect_ratio: video && video.width! < video.height! ? "9:16" : "16:9", input_references: references });
        if (!result.id) throw new Error("submission_ambiguous");
        await this.env.DB.prepare("UPDATE generations SET provider_id=?,provider_generation_id=?,status='provider_pending' WHERE id=?").bind(result.id,result.generation_id ?? null,id).run();
        return result.id;
      });
      let finished = false;
      for (let i = 0; i < 120; i++) {
        await step.sleep(`wait-${i}`, "30 seconds");
        const status = await step.do(`poll-${i}`, { retries: { limit: 3, delay: "5 seconds", backoff: "exponential" } }, () => providerJson(this.env,`videos/${encodeURIComponent(providerId)}`));
        if (["failed","cancelled","expired"].includes(status.status)) throw new Error("provider_failed");
        if (status.status !== "completed") continue;
        await step.do("record-completion", async () => {
          const now = Date.now();
          await this.env.DB.prepare("UPDATE generations SET status='saving',provider_cost=?,completed_at=COALESCE(completed_at,?),expires_at=COALESCE(expires_at,?) WHERE id=?").bind(status.usage?.cost ?? null,now,now + RETENTION_MS,id).run();
        });
        finished = true; break;
      }
      if (!finished) throw new Error("provider_timeout");
      const delivered = await step.do("save-and-verify-r2", { retries: { limit: 8, delay: "30 seconds", backoff: "exponential" }, timeout: "5 minutes" }, async () => {
        const row = await load(); if (!row || !row.expires_at || row.expires_at <= Date.now()) throw new Error("delivery_expired");
        const user = await this.env.DB.prepare("SELECT username FROM accounts WHERE id=?").bind(row.account_id).first<{ username: string }>(); if (!user) throw new Error("account_missing");
        const key = `${user.username}/generations/${id}/film.mp4`;
        const existing = await this.env.MEDIA.head(key);
        if (!existing) {
          const output = await fetchOutput(this.env,providerId);
          const bytes = await limitedBytes(output.body!,50 * 1024 * 1024);
          const info = inspectMp4(bytes);
          const shortSide = Math.min(info.width ?? 0,info.height ?? 0);
          if (info.kind !== "video" || shortSide !== Number.parseInt(row.resolution) || !info.duration || Math.abs(info.duration-row.duration)>1.05 || info.duration<9.95 || info.duration>30.05 || (row.model.includes("flux-video-edit") && info.duration>15.05)) throw new Error("provider_output_invalid");
          const hash = await crypto.subtle.digest("SHA-256",bytes);
          await this.env.MEDIA.put(key,bytes,{ httpMetadata: { contentType: "video/mp4", cacheControl: "private, no-store" }, sha256: hash, customMetadata: { accountId: row.account_id, generationId: id, expiresAt: String(row.expires_at) } });
        }
        const stored = await this.env.MEDIA.head(key);
        if (!stored || stored.size === 0 || stored.customMetadata?.generationId !== id) throw new Error("storage_verification_failed");
        await this.env.DB.prepare("UPDATE generations SET status='completed',r2_key=?,reference_expires_at=0 WHERE id=?").bind(key,id).run();
        return { key, expiresAt: row.expires_at };
      });
      await step.sleepUntil("expire-after-47-hours",delivered.expiresAt);
      await step.do("delete-expired-media",async () => expireGeneration(this.env,{ id,r2_key:delivered.key,upload_ids:initial.upload_ids }));
    } catch (error) {
      const row = await load();
      if (row?.status === "completed" || row?.status === "expired") throw error;
      const code = row?.provider_submitted_at && !row.provider_id ? "submission_ambiguous" : row?.status === "saving" ? "delivery_failed" : "provider_failed";
      await step.do("mark-service-failure",async () => { await this.env.DB.prepare("UPDATE generations SET status='service_failed',error_code=?,reference_expires_at=0 WHERE id=?").bind(code,id).run(); });
      await step.do("refund-service-failure",{ retries: { limit: 8, delay: "1 minute", backoff: "exponential" } },async () => refundServiceFailure(this.env,initial.purchase_id,code));
      return { status: "service_failed", code };
    }
  }
}
