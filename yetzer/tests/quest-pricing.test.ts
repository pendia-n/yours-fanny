import assert from "node:assert/strict";
import test from "node:test";
import { ROUTES, type Quest, type QuestKind } from "../app/lib/domain";
import { validateInputs, type Upload } from "../workers/media";
import { currentPrice } from "../workers/quests";
import type { AppEnv } from "../workers/types";

const env = { SHORT_PRICE_CENTS: "699", LONG_PRICE_CENTS: "1499" } as AppEnv;
const quest = (kind: QuestKind): Quest => ({
  id: kind, templateId: kind, day: "2026-10-05", title: kind,
  invitation: "", preparation: "", transformation: "", preserve: "",
  kind, duration: kind === "adventure" ? 30 : 15, priceCents: currentPrice(env, kind),
  ...ROUTES[kind],
});
const media = (kind: Upload["kind"], duration: number | null): Upload => ({
  kind, duration, width: kind === "video" ? 1280 : null,
  height: kind === "video" ? 720 : null,
} as Upload);

test("three short quests share one price; adventure has its own price", () => {
  for (const kind of ["edit", "perform", "imagine"] as const) assert.equal(currentPrice(env, kind), 699);
  assert.equal(currentPrice(env, "adventure"), 1499);
});

test("perform requires image and 10-15 second audio, not video", () => {
  assert.equal(validateInputs(quest("perform"), [media("image", null), media("audio", 12.4)]).duration, 12);
  assert.throws(() => validateInputs(quest("perform"), [media("image", null)]));
  assert.throws(() => validateInputs(quest("perform"), [media("image", null), media("audio", 9)]));
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
  assert.throws(() => validateInputs(quest("adventure"), [media("video", 30)], 31));
});
