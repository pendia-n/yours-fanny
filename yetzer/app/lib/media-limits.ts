import type { QuestKind } from "./domain";

export function mediaDurationError(kind: string, duration: number | null, questKind?: QuestKind) {
  if (kind !== "video" && kind !== "audio") return null;
  const min = kind === "audio" ? 5 : questKind === "adventure" ? 15 : 10;
  const max = kind === "audio" ? 15 : questKind && questKind !== "adventure" ? 15 : 30;
  return duration === null || !Number.isFinite(duration) || duration < min || duration > max
    ? `Your ${kind} must be ${min}-${max} seconds long.` : null;
}
