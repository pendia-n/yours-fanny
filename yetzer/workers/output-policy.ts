import type { QuestKind } from "../app/lib/domain";

export const OUTPUT_POLICY_VERSION = 2;
export const outputBounds = (kind: QuestKind) => kind === "adventure" ? { min: 15, max: 25 } : { min: 10, max: 15 };

export async function automaticDuration(kind: QuestKind, purchaseId: string, questId: string, sourceDuration?: number | null) {
  if (kind === "edit") {
    if (!sourceDuration || !Number.isFinite(sourceDuration) || sourceDuration < 10 || sourceDuration > 15) throw new Error("invalid_edit_source_duration");
    return Math.round(sourceDuration);
  }
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`yetzer-duration-v2:${purchaseId}:${questId}`));
  const value = new DataView(hash).getUint32(0);
  const { min, max } = outputBounds(kind);
  return min + Math.floor(value / 4294967296 * (max - min + 1));
}

export function validOutputDuration(input: { model: string; duration: number; output_policy_version?: number }, actual: number | null, sourceDuration?: number | null) {
  if (actual === null || !Number.isFinite(actual)) return false;
  const edit = input.model === "black-forest-labs/flux-video-edit";
  const adventure = input.model === "alibaba/wan-3.0";
  if ((input.output_policy_version ?? 1) < OUTPUT_POLICY_VERSION) {
    const max = adventure && input.duration <= 28 ? 28.05 : 30.05;
    return Math.abs(actual - input.duration) <= 1.05 && actual >= 9.95 && actual <= max && (!edit || actual <= 15.05);
  }
  const { min, max } = outputBounds(adventure ? "adventure" : "imagine");
  // Container timestamps can differ from an exact second by a single frame.
  return actual >= min - 0.05 && actual <= max + 0.05 && (!edit || (sourceDuration != null && Math.abs(actual - sourceDuration) <= 0.05));
}
