import assert from "node:assert/strict";
import test from "node:test";
import { questContinuation } from "../app/lib/domain";

test("login and signup can resume a selected quest", () => {
  const id = "2026-11-09_adventure-015";
  assert.equal(questContinuation(id), "/quests/" + id);
});

test("missing or unsafe continuation values fall back to the quest board", () => {
  for (const value of [null, "", "//example.org", "https://example.org", "../terms", "2026-11-09_edit-010?next=//example.org"]) {
    assert.equal(questContinuation(value), "/quests");
  }
});
