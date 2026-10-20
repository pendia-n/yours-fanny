import test from "node:test";
import assert from "node:assert/strict";
import { dailyAdventureProbability, dailySelection, dayOffset, nyInstant, schedule } from "../app/lib/domain";
import { QUEST_CATALOG } from "../app/lib/quest-catalog";

test("probability below .5 draws one Adventure; .5 and above draw two distinct Adventures", () => {
  for (const [probability,count] of [[0,1],[0.499999,1],[0.5,2],[0.999999,2]]) {
    const selected=dailySelection(QUEST_CATALOG,"2026-10-22",probability);
    assert.equal(selected.length,5);
    assert.equal(selected.filter(q=>q.kind==="adventure").length,count);
    assert.equal(new Set(selected.map(q=>q.id)).size,5);
  }
});
test("date draw is stable across retries and never mutates the pool", () => {
  const before=JSON.stringify(QUEST_CATALOG);
  const counts=new Set<number>();
  for(let i=0;i<365;i++) {
    const day=dayOffset("2026-10-22",i),p=dailyAdventureProbability(day);
    assert.ok(p>=0&&p<1);
    const selected=dailySelection(QUEST_CATALOG,day);
    assert.deepEqual(selected,dailySelection(QUEST_CATALOG,day));
    const count=selected.filter(q=>q.kind==="adventure").length;
    assert.equal(count,p>=0.5?2:1);
    counts.add(count);
  }
  assert.equal(counts.size,2);
  assert.equal(JSON.stringify(QUEST_CATALOG),before);
});
test("daily release date changes at New York midnight in summer and winter", () => {
  for(const day of ["2026-10-22","2026-11-03"]) {
    const midnight=nyInstant(day,0);
    assert.equal(schedule(midnight-1).day,dayOffset(day,-1));
    assert.equal(schedule(midnight).day,day);
  }
});
