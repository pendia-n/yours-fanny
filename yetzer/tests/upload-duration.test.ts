import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateUploadDuration } from "../workers/media";
import { mediaDurationError } from "../app/lib/media-limits";

test("upload video strictly accepts 10-30 seconds, rejects two minutes and invalid timing", () => {
  for (const duration of [10, 15, 28, 30]) assert.doesNotThrow(()=>validateUploadDuration({kind:"video",duration}));
  for (const duration of [0, 9.999, 30.001, 31, 120, NaN, Infinity, null]) assert.throws(()=>validateUploadDuration({kind:"video",duration}), /10-30 seconds/);
});
test("all audio uploads strictly accept 5-15 seconds", () => {
  for (const duration of [5, 10, 15]) assert.doesNotThrow(()=>validateUploadDuration({kind:"audio",duration}));
  for (const duration of [4.999, 15.001, 16, 120, NaN, null]) assert.throws(()=>validateUploadDuration({kind:"audio",duration}), /5-15 seconds/);
});
test("quest-specific video limits apply immediately at upload", () => {
  for (const kind of ["edit","perform","imagine"] as const) {
    assert.equal(mediaDurationError("video",10,kind),null);
    assert.equal(mediaDurationError("video",15,kind),null);
    assert.throws(()=>validateUploadDuration({kind:"video",duration:16},kind), /10-15 seconds/);
  }
  assert.throws(()=>validateUploadDuration({kind:"video",duration:14},"adventure"), /15-30 seconds/);
  assert.doesNotThrow(()=>validateUploadDuration({kind:"video",duration:30},"adventure"));
});
test("server duration validation precedes R2 writes and client validation precedes network upload", () => {
  const api=readFileSync(new URL("../workers/api.ts",import.meta.url),"utf8");
  assert.ok(api.indexOf("validateUploadDuration(info,quest?.kind)")<api.indexOf("await env.MEDIA.put(key,bytes"));
  const page=readFileSync(new URL("../app/routes/page.tsx",import.meta.url),"utf8");
  assert.ok(page.indexOf("await checkSelectedMedia(file,kind,q.kind)")<page.indexOf("fetch(`/api/uploads?questId="));
  assert.ok(page.includes("!formOpen?<Notice>"));
  assert.ok(page.includes("async function upload(file:File,kind:string){if(!formOpen)return;"));
});
