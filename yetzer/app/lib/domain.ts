export type QuestKind = "edit" | "perform" | "imagine" | "adventure";
export type Theme = "light" | "dark" | "dim";
export type User = { id: string; username: string; hasPasscode: boolean; passwordChangedAt: number | null };
export type Quest = {
  id: string; templateId: string; day: string; title: string; invitation: string;
  preparation: string; transformation: string; preserve: string; kind: QuestKind;
  duration: number; priceCents: number; model: string; resolution: string;
};
export const ROUTES = {
  edit: { model: "black-forest-labs/flux-video-edit", resolution: "720p", label: "Change the scene", requires: ["video"] },
  perform: { model: "heygen/heygen-video-1", resolution: "768p", label: "Bring your voice", requires: ["image", "audio"] },
  imagine: { model: "bytedance/seedance-2.0-mini", resolution: "720p", label: "A little impossible", requires: ["video"] },
  adventure: { model: "bytedance/seedance-2.5", resolution: "720p", label: "Take the long way", requires: ["video"] },
} as const;
export const TIME_ZONE = "America/New_York";
export const RETENTION_MS = 47 * 60 * 60 * 1000;
export function nyParts(at = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(at);
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  return { day: `${get("year")}-${get("month")}-${get("day")}`, weekday: get("weekday"), minute: Number(get("hour")) * 60 + Number(get("minute")) };
}
export function schedule(at = Date.now()) {
  const p = nyParts(at);
  const purchase = p.weekday === "Fri" ? p.minute < 930 : p.weekday === "Sat" ? false : p.minute < 1260;
  const submit = p.weekday === "Fri" ? p.minute < 960 : p.weekday === "Sat" ? p.minute >= 1260 && p.minute < 1410 : p.minute < 1410;
  return { ...p, purchase, submit, now: at, timezone: TIME_ZONE };
}
export function dayOffset(day: string, count: number) {
  return new Date(Date.parse(`${day}T12:00:00Z`) + count * 86400000).toISOString().slice(0, 10);
}
export function nyInstant(day: string, minute: number) {
  const target = Date.parse(`${day}T00:00:00Z`) + minute * 60000;
  let guess = target + 4 * 3600000;
  for (let i = 0; i < 3; i++) {
    const local = nyParts(guess);
    const represented = Date.parse(`${local.day}T00:00:00Z`) + local.minute * 60000;
    guess += target - represented;
  }
  return guess;
}
export function submissionDeadline(purchaseDay: string) {
  const weekday = nyParts(nyInstant(purchaseDay, 720)).weekday;
  return nyInstant(weekday === "Fri" ? dayOffset(purchaseDay, 1) : purchaseDay, 1410);
}
export function canSubmitPurchase(purchaseDay: string, at = Date.now()) {
  return schedule(at).submit && at >= nyInstant(purchaseDay, 0) && at < submissionDeadline(purchaseDay);
}
export function formatNY(at: number) {
  return new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(at);
}
export function money(cents: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100); }
export function validUsername(value: string) { return /^[A-Za-z][A-Za-z0-9_]{2,23}$/.test(value); }
export function validPassword(value: string) { return value.length >= 7 && value.length <= 18 && /[A-Za-z]/.test(value) && /[0-9]/.test(value); }
export function validPasscode(value: string) { return /^[a-z0-9]{8}$/.test(value); }

// A fresh day-seeded shuffle: unique within a day, eligible again tomorrow.
export function dailySelection<T>(all: T[], day: string): T[] {
  if (all.length !== 220) throw new Error("The quest catalogue must contain exactly 220 entries.");
  const deck = [...all];
  let seed = 2166136261;
  for (const c of day) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619) >>> 0;
  for (let i = deck.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1); [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, 5);
}
