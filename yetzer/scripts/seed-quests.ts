import { writeFileSync } from "node:fs";
import { QUEST_CATALOG } from "../app/lib/quest-catalog.ts";
const quote = (value: string | number) => typeof value === "number" ? String(value) : `'${value.replaceAll("'", "''")}'`;
const sql = QUEST_CATALOG.map(q => `INSERT OR IGNORE INTO quest_templates(id,title,invitation,preparation,transformation,preserve,kind,duration) VALUES(${[q.id,q.title,q.invitation,q.preparation,q.transformation,q.preserve,q.kind,q.duration].map(quote).join(",")});`).join("\n");
writeFileSync(new URL("../migrations/0002_quests.sql", import.meta.url), `-- Generated from the immutable authored catalogue; 220 quests.\n${sql}\n`);
console.log(`Prepared ${QUEST_CATALOG.length} unique authored quests.`);
