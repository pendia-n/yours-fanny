import type { AppEnv } from "./types";
import { ROUTES } from "../app/lib/domain";

export const FUNDING_RECHECK_MS = 10_000;
export const SETTLEMENT_GRACE_MS = 60_000;
const MICROS = 1_000_000;

export function estimateFundingMicros(model: string, seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 1 || seconds > 30) throw new Error("invalid_funding_duration");
  switch (model) {
    case ROUTES.edit.model: return Math.ceil(seconds) * 30_000;
    case ROUTES.perform.model: return seconds * 50_000;
    // Reserve room for the longest allowed reference, not a claim about the final bill.
    case ROUTES.imagine.model: return (seconds + 15) * 45_360;
    // Budget at the undiscounted OpenRouter output rate.
    case ROUTES.adventure.model: return seconds * 100_000;
    default: throw new Error("unknown_funding_model");
  }
}

export async function openRouterCreditMicros(key: string | undefined): Promise<number> {
  if (!key) throw new Error("openrouter_management_key_missing");
  const res = await fetch("https://openrouter.ai/api/v1/credits", {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    signal: AbortSignal.timeout(5_000),
    redirect: "error",
  });
  if (!res.ok) throw new Error(`openrouter_balance_${res.status}`);
  const { data } = await res.json() as { data?: { total_credits?: unknown; total_usage?: unknown } };
  if (typeof data?.total_credits !== "number" || typeof data.total_usage !== "number" ||
      !Number.isFinite(data.total_credits) || !Number.isFinite(data.total_usage) ||
      data.total_credits < 0 || data.total_usage < 0) throw new Error("openrouter_balance_invalid");
  return Math.max(0,Math.round(data.total_credits * MICROS) - Math.round(data.total_usage * MICROS));
}

export type FundableGeneration = { id: string; model: string; duration: number; funding_attempt: number };

export async function runFundingPass(env: AppEnv) {
  const checkedAt = Date.now();
  const pending = (await env.DB.prepare("SELECT id, model, duration, funding_attempt FROM generations WHERE status IN ('queued','waiting_funds') AND provider_submitted_at IS NULL AND (funding_release_at IS NULL OR funding_release_at<=?) ORDER BY created_at, id LIMIT 25").bind(checkedAt).all<FundableGeneration>()).results;
  if (pending.length) {
    let balance: number | undefined;
    try { balance = await openRouterCreditMicros(env.OPENROUTER_MANAGEMENT_KEY); }
    catch { /* An unavailable balance is not permission to dispatch a paid request. */ }
    for (const row of pending) {
      const hold = estimateFundingMicros(row.model,row.duration);
      // One atomic update accounts for all in-flight holds, including concurrent work.
      const granted = balance === undefined ? null : await env.DB.prepare(`
        UPDATE generations SET status='funded', funding_micros=?, funding_release_at=NULL
        WHERE id=? AND status IN ('queued','waiting_funds') AND provider_submitted_at IS NULL
          AND ? >= ? + COALESCE((SELECT SUM(funding_micros) FROM generations
            WHERE funding_micros>0 AND (funding_release_at IS NULL OR funding_release_at>?)),0)
        RETURNING id
      `).bind(hold,row.id,balance,hold,checkedAt).first();
      if (!granted) await env.DB.prepare("UPDATE generations SET status='waiting_funds' WHERE id=? AND status='queued' AND provider_submitted_at IS NULL").bind(row.id).run();
    }
  }
  const funded = (await env.DB.prepare("SELECT id, funding_attempt FROM generations WHERE status='funded' ORDER BY created_at,id LIMIT 25").all<Pick<FundableGeneration,"id"|"funding_attempt">>()).results;
  for (const row of funded) {
    try {
      await env.GENERATION.create({ id:`${row.id}-funds-${row.funding_attempt}`, params:{generationId:row.id,fundingAttempt:row.funding_attempt} });
    } catch { /* Keep the funded row for the next pass if dispatch fails. */ }
  }
  return !!(await env.DB.prepare("SELECT 1 FROM generations WHERE status IN ('queued','waiting_funds','funded') AND provider_submitted_at IS NULL LIMIT 1").first());
}

export async function wakeFunding(env: AppEnv) {
  await env.FUNDING.getByName("openrouter-account").wake();
}

export async function requeueRejectedSubmission(env: AppEnv, id: string, attempt: number) {
  await env.DB.prepare("UPDATE generations SET status='waiting_funds',provider_submitted_at=NULL,reference_expires_at=0,funding_micros=0,funding_release_at=?,funding_attempt=funding_attempt+1 WHERE id=? AND status='submitting' AND provider_id IS NULL AND funding_attempt=?").bind(Date.now()+FUNDING_RECHECK_MS,id,attempt).run();
  try { await wakeFunding(env); } catch { /* The outbox will wake the coordinator. */ }
}
