import test from "node:test";
import assert from "node:assert/strict";
import { schedule } from "../app/lib/domain";
import { playBlockers } from "../app/lib/play-readiness";

const prepared = {
  paid: false, busy: "", required: ["video"], uploaded: ["video"],
  rights: true, consent: true, serviceReady: true, questDay: "2026-10-17",
  window: schedule(Date.parse("2026-10-17T22:21:52+08:00")),
};
test("screenshot: prepared Adventure is blocked by Saturday sales, not optional files", () => {
  const reasons = playBlockers(prepared);
  assert.equal(reasons.length, 1);
  assert.match(reasons[0], /Saturday purchases are closed all day/);
  assert.match(reasons[0], /Oct 18/);
});
test("Sunday opening allows a prepared current quest without image, audio or extra text", () => {
  assert.deepEqual(playBlockers({ ...prepared, questDay: "2026-10-18", window: schedule(Date.parse("2026-10-18T12:00:00+08:00")) }), []);
});
test("old quest remains unavailable after the new day opens", () => {
  assert.match(playBlockers({ ...prepared, window: schedule(Date.parse("2026-10-18T04:00:00Z")) })[0], /purchase day has ended/);
});
test("upload and consent blockers explain every remaining requirement", () => {
  const reasons = playBlockers({ ...prepared, window: { day: prepared.questDay, purchase: true, submit: true }, busy: "upload", uploaded: [], rights: false, consent: false });
  assert.equal(reasons.length, 4);
  assert.match(reasons[0], /still uploading/);
  assert.match(reasons[1], /required video/);
});
test("paid submission uses submission window rather than purchase window", () => {
  assert.deepEqual(playBlockers({ ...prepared, paid: true, window: { day: prepared.questDay, purchase: false, submit: true } }), []);
});
