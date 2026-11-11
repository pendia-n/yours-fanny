import { type Quest } from "../app/lib/domain";
import { base64url, digest, hmac } from "./crypto";
import { wakeFunding } from "./funding";
import { validateInputs, type Upload } from "./media";
import { automaticDuration, OUTPUT_POLICY_VERSION } from "./output-policy";
import { getQuest, questPrompt } from "./quests";
import { HttpError, type AppEnv } from "./types";

export type PreparedPlay = { uploadIds: string[]; rawText: string };
export type PaidPlay = { id: string; account_id: string; quest_id: string; purchase_day: string };

export const UPLOAD_UNREFERENCED = `
  NOT EXISTS (SELECT 1 FROM purchases p, json_each(p.prepared_upload_ids) j
    WHERE p.status IN ('pending','paid','reserved') AND j.value=uploads.id
      AND (p.status<>'reserved' OR p.expires_at>unixepoch()*1000))
  AND NOT EXISTS (SELECT 1 FROM generations g, json_each(g.upload_ids) j
    WHERE g.status NOT IN ('expired','service_failed') AND j.value=uploads.id)
`;

export function readPreparation(body: Record<string,unknown>): PreparedPlay {
  if (body.publicConsent !== true || body.rightsConsent !== true) throw new HttpError(400,"Confirm that you may use these materials and that the finished film will be public for 47 hours.");
  const ids = body.uploadIds;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 3 || ids.some(id=>typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id))) throw new HttpError(400,"Prepare the required materials first.");
  const rawText = typeof body.text === "string" ? body.text.trim() : "";
  if (rawText.length > 600) throw new HttpError(400,"Keep your optional idea under 600 characters.");
  return {uploadIds:ids,rawText};
}

export async function loadMaterials(env: AppEnv, accountId: string, ids: string[], validAfter?: number) {
  const uploads: Upload[] = [];
  for (const id of ids) {
    const row = await env.DB.prepare("SELECT * FROM uploads WHERE id=? AND account_id=?").bind(id,accountId).first<Upload>();
    if (!row || (validAfter !== undefined && row.expires_at <= validAfter)) throw new HttpError(400,"A prepared file is missing or expired.");
    uploads.push(row);
  }
  return uploads;
}

export async function referenceToken(env: AppEnv, generationId: string) {
  return base64url(await hmac(`reference:${generationId}`,env.YETZER_JWT_SECRET));
}

export async function queuePaidGeneration(env: AppEnv, purchase: PaidPlay, quest: Quest, prepared: PreparedPlay, uploads: Upload[]) {
  const input = validateInputs(quest,uploads);
  const duration = await automaticDuration(quest.kind,purchase.id,quest.id,input.sourceDuration);
  const id = crypto.randomUUID(), token = await referenceToken(env,id);
  try {
    await env.DB.prepare(`
      INSERT INTO generations(id,purchase_id,account_id,quest_id,submission_day,status,model,resolution,duration,raw_text,prompt,upload_ids,reference_token_hash,reference_expires_at,created_at,output_policy_version)
      SELECT ?,p.id,p.account_id,p.quest_id,p.purchase_day,'queued',?,?,?,?,?,?,?,0,?,?
      FROM purchases p WHERE p.id=? AND p.status='paid' AND NOT EXISTS (SELECT 1 FROM generations WHERE purchase_id=p.id)
    `).bind(id,quest.model,quest.resolution,duration,prepared.rawText,questPrompt({...quest,duration},prepared.rawText),
      JSON.stringify(prepared.uploadIds),await digest(token),Date.now(),OUTPUT_POLICY_VERSION,purchase.id).run();
  } catch (error) {
    if (String(error).includes("daily_submission_limit")) throw new HttpError(409,"You have already submitted three plays for this purchase day.");
    throw error;
  }
  const generation = await env.DB.prepare("SELECT id,status FROM generations WHERE purchase_id=?").bind(purchase.id).first<{id:string;status:string}>();
  if (!generation) throw new HttpError(409,"Payment must be verified before generation.");
  if (["queued","waiting_funds","funded"].includes(generation.status)) {
    try { await wakeFunding(env); }
    catch { /* The scheduled outbox wakes the funding coordinator if RPC is unavailable. */ }
  }
  return generation;
}

export async function queuePreparedPurchase(env: AppEnv, id: string) {
  const purchase = await env.DB.prepare("SELECT * FROM purchases WHERE id=? AND status='paid' AND prepared_upload_ids IS NOT NULL").bind(id)
    .first<PaidPlay & { prepared_upload_ids:string; prepared_text:string | null }>();
  if (!purchase) return;
  const uploadIds = JSON.parse(purchase.prepared_upload_ids) as string[];
  const uploads = await loadMaterials(env,purchase.account_id,uploadIds);
  const quest = await getQuest(env,purchase.quest_id);
  await queuePaidGeneration(env,purchase,quest,{uploadIds,rawText:purchase.prepared_text ?? ""},uploads);
}
