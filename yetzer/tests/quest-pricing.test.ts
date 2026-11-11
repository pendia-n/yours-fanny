import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { ROUTES, type Quest, type QuestKind } from "../app/lib/domain";
import { validateAudioDuration, validateInputs, type Upload } from "../workers/media";
import { currentPrice, getQuest } from "../workers/quests";
import { automaticDuration, validOutputDuration } from "../workers/output-policy";
import type { AppEnv } from "../workers/types";

const env = { SHORT_PRICE_CENTS: "299", LONG_PRICE_CENTS: "599" } as AppEnv;
const quest = (kind: QuestKind): Quest => ({
  id: kind, templateId: kind, day: "2026-10-05", title: kind,
  invitation: "", preparation: "", transformation: "", preserve: "",
  kind, duration: kind === "adventure" ? 25 : 15, priceCents: currentPrice(env, kind), ...ROUTES[kind],
});
const media = (kind: Upload["kind"], duration: number | null): Upload => ({
  kind, duration, width: kind === "video" ? 1280 : null, height: kind === "video" ? 720 : null,
} as Upload);

test("shorts cost 299 cents and Adventure costs 599 cents", () => {
  for (const kind of ["edit", "perform", "imagine"] as const) assert.equal(currentPrice(env, kind), 299);
  assert.equal(currentPrice(env, "adventure"), 599);
});
test("perform requires image and 5-15 second audio without choosing output length", () => {
  for (const length of [5, 12.4, 15]) assert.doesNotThrow(() => validateInputs(quest("perform"), [media("image", null), media("audio", length)]));
  assert.throws(() => validateInputs(quest("perform"), [media("image", null)]));
});
test("all audio-capable quests enforce the same 5-15 second range", () => {
  for (const kind of ["perform", "imagine", "adventure"] as const) {
    const inputs = kind === "perform" ? [media("image", null)] : [media("video", kind === "adventure" ? 30 : 15)];
    for (const duration of [5, 15]) assert.doesNotThrow(() => validateInputs(quest(kind), [...inputs, media("audio", duration)]));
    for (const duration of [4.99, 15.01, 30]) assert.throws(() => validateInputs(quest(kind), [...inputs, media("audio", duration)]), /audio must be 5-15 seconds/);
  }
});
test("invalid audio is rejected", () => {
  for (const duration of [null, NaN, 0, 4.99, 15.01, Infinity]) assert.throws(() => validateAudioDuration({ kind: "audio", duration }));
});
test("source bounds remain independent of automatic output length", () => {
  assert.equal(validateInputs(quest("edit"), [media("video", 12.4)]).sourceDuration, 12.4);
  assert.throws(() => validateInputs(quest("edit"), [media("video", 9)]));
  assert.throws(() => validateInputs(quest("imagine"), [media("video", 16)]));
  assert.throws(() => validateInputs(quest("adventure"), [media("video", 14)]));
  assert.equal(validateInputs(quest("adventure"), [media("video", 30)]).sourceDuration, 30);
});
test("automatic duration is stable and spans only the inclusive route bounds", async () => {
  for (const kind of ["perform", "imagine", "adventure"] as const) {
    const values = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const duration = await automaticDuration(kind, `purchase-${i}`, "quest-1");
      assert.equal(duration, await automaticDuration(kind, `purchase-${i}`, "quest-1"));
      assert.ok(Number.isInteger(duration) && duration >= (kind === "adventure" ? 15 : 10) && duration <= (kind === "adventure" ? 25 : 15));
      values.add(duration);
    }
    assert.equal(values.size, kind === "adventure" ? 11 : 6);
  }
  assert.equal(await automaticDuration("edit", "purchase", "quest", 12.4), 12);
});
test("new output validation accepts in-range model timing, rejects out-of-range timing", () => {
  for (const kind of ["perform", "imagine", "adventure"] as const) {
    const min = kind === "adventure" ? 15 : 10, max = kind === "adventure" ? 25 : 15;
    const row = { model: ROUTES[kind].model, duration: min, output_policy_version: 2 };
    for (const duration of [min, max, min + 0.4]) assert.ok(validOutputDuration(row, duration));
    for (const duration of [null, NaN, Infinity, min - 0.1, max + 0.1]) assert.ok(!validOutputDuration(row, duration));
  }
  const edit = { model: ROUTES.edit.model, duration: 12, output_policy_version: 2 };
  assert.ok(validOutputDuration(edit, 12.4, 12.4));
  assert.ok(!validOutputDuration(edit, 14, 12.4));
});
test("legacy in-flight outputs retain their original validation", () => {
  assert.ok(validOutputDuration({ model: ROUTES.adventure.model, duration: 28, output_policy_version: 1 }, 28));
  assert.ok(validOutputDuration({ model: ROUTES.adventure.model, duration: 25, output_policy_version: 1 }, 26));
  assert.ok(!validOutputDuration({ model: ROUTES.adventure.model, duration: 25, output_policy_version: 2 }, 26));
});
test("saved Adventure quests use Wan and current discounted pricing", async () => {
  const saved = { ...quest("adventure"), model: "bytedance/seedance-2.5", duration: 30, priceCents: 1199 };
  const db = { prepare() { return { bind() { return this; }, async first() { return { snapshot: JSON.stringify(saved) }; } }; } };
  const loaded = await getQuest({ ...env, DB: db } as unknown as AppEnv, saved.id);
  assert.equal(loaded.priceCents, 599);
  assert.equal(loaded.duration, 25);
  assert.equal(loaded.model, "alibaba/wan-3.0");
});
test("UI removes duration controls and the API ignores client-selected timing", () => {
  const page = readFileSync(new URL("../app/routes/page.tsx", import.meta.url), "utf8");
  const api = readFileSync(new URL("../workers/api.ts", import.meta.url), "utf8");
  const fulfillment = readFileSync(new URL("../workers/fulfillment.ts", import.meta.url), "utf8");
  assert.doesNotMatch(page, /Output duration|setDuration|15-28|One 15-28 second Adventure/);
  assert.match(page, /50% off Adventure/);
  assert.doesNotMatch(api, /body\.duration/);
  assert.ok(fulfillment.includes("automaticDuration(quest.kind,purchase.id,quest.id,input.sourceDuration)"));
  assert.match(fulfillment, /output_policy_version/);
});
