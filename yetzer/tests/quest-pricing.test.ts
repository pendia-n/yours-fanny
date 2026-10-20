import assert from "node:assert/strict";
import test from "node:test";
import { ROUTES, type Quest, type QuestKind } from "../app/lib/domain";
import { validateAudioDuration, validateInputs, type Upload } from "../workers/media";
import { currentPrice, getQuest } from "../workers/quests";
import type { AppEnv } from "../workers/types";

const env = { SHORT_PRICE_CENTS: "299", LONG_PRICE_CENTS: "1199" } as AppEnv;
const quest = (kind: QuestKind): Quest => ({
  id: kind, templateId: kind, day: "2026-10-05", title: kind,
  invitation: "", preparation: "", transformation: "", preserve: "",
  kind, duration: kind === "adventure" ? 28 : 15, priceCents: currentPrice(env, kind),
  ...ROUTES[kind],
});
const media = (kind: Upload["kind"], duration: number | null): Upload => ({
  kind, duration, width: kind === "video" ? 1280 : null,
  height: kind === "video" ? 720 : null,
} as Upload);

test("three short quests share one price; adventure has its own price", () => {
  for (const kind of ["edit", "perform", "imagine"] as const) assert.equal(currentPrice(env, kind), 299);
  assert.equal(currentPrice(env, "adventure"), 1199);
});

test("perform accepts 5-15 second audio while output remains 10-15 seconds", () => {
  assert.equal(validateInputs(quest("perform"), [media("image", null), media("audio", 12.4)]).duration, 12);
  assert.equal(validateInputs(quest("perform"), [media("image", null), media("audio", 5)]).duration, 10);
  assert.equal(validateInputs(quest("perform"), [media("image", null), media("audio", 5)], 15).duration, 15);
  assert.throws(() => validateInputs(quest("perform"), [media("image", null), media("audio", 5)], 9));
  assert.throws(() => validateInputs(quest("perform"), [media("image", null)]));
});

test("all audio-capable quests enforce the same 5-15 second range", () => {
  for (const kind of ["perform", "imagine", "adventure"] as const) {
    const inputs = kind === "perform" ? [media("image", null)] : [media("video", kind === "adventure" ? 30 : 15)];
    const output = kind === "adventure" ? 28 : 15;
    for (const duration of [5, 15]) assert.doesNotThrow(() => validateInputs(quest(kind), [...inputs, media("audio", duration)], output));
    for (const duration of [4.99, 15.01, 30]) assert.throws(() => validateInputs(quest(kind), [...inputs, media("audio", duration)], output), /audio must be 5-15 seconds/);
  }
});

test("upload audio validation rejects out-of-range and unreadable durations", () => {
  for (const duration of [5, 15]) assert.doesNotThrow(() => validateAudioDuration({ kind: "audio", duration }));
  for (const duration of [null, NaN, 0, 4.99, 15.01, Infinity]) assert.throws(() => validateAudioDuration({ kind: "audio", duration }));
  assert.doesNotThrow(() => validateAudioDuration({ kind: "video", duration: 30 }));
});

test("edit follows a 10-15 second source video", () => {
  assert.equal(validateInputs(quest("edit"), [media("video", 10)]).duration, 10);
  assert.equal(validateInputs(quest("edit"), [media("video", 15)]).duration, 15);
  assert.throws(() => validateInputs(quest("edit"), [media("video", 9)]));
});

test("imagine and adventure enforce their distinct ranges", () => {
  assert.equal(validateInputs(quest("imagine"), [media("video", 10)], 15).duration, 15);
  assert.throws(() => validateInputs(quest("imagine"), [media("video", 10)], 16));
  assert.throws(() => validateInputs(quest("adventure"), [media("video", 14)], 16));
  assert.equal(validateInputs(quest("adventure"), [media("video", 15)], 16).duration, 16);
  assert.equal(validateInputs(quest("adventure"), [media("video", 30)], 27).duration, 27);
  assert.equal(validateInputs(quest("adventure"), [media("video", 30)], 28).duration, 28);
  for (const duration of [29, 30, 31]) assert.throws(() => validateInputs(quest("adventure"), [media("video", 30)], duration));
});

test("saved Adventure quests expose the current price and capped output duration", async () => {
  const saved = { ...quest("adventure"), duration: 30, priceCents: 799 };
  const db = { prepare() { return { bind() { return this; }, async first() { return { snapshot: JSON.stringify(saved) }; } }; } };
  const loaded = await getQuest({ ...env, DB: db } as unknown as AppEnv, saved.id);
  assert.equal(loaded.priceCents, 1199);
  assert.equal(loaded.duration, 28);
});
