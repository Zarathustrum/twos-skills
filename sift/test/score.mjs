#!/usr/bin/env node
// score.mjs — grade a model's Sift classification against a fixture answer key.
//
// Usage: node score.mjs <fixture.json> <verdicts>
//   <fixture.json>  a fixtures/*.json key: {criterion, buckets, lists:[{id,title,accept}]}
//   <verdicts>      EITHER a dir of raw/verdicts/<id>.json files ({id,bucket,...},
//                   the skill's real output) OR a single JSON file holding an array
//                   of {id,bucket}.
//
// Pass = every PINNED list's bucket is within its `accept` set. A list whose accept
// lists all buckets is unconstrained (coverage only, never fails). Also reports
// wide-net violations: a list put in no-match when no-match isn't accepted — the
// failure mode the cheap-path prompt guards against. Exit 1 on any failure.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const [fixturePath, verdictsPath] = process.argv.slice(2);
if (!fixturePath || !verdictsPath) { console.error("usage: node score.mjs <fixture.json> <verdicts-dir-or-file>"); process.exit(2); }

const fx = JSON.parse(readFileSync(fixturePath, "utf8"));

const produced = new Map();
const st = existsSync(verdictsPath) ? statSync(verdictsPath) : null;
if (!st) { console.error(`no such verdicts path: ${verdictsPath}`); process.exit(2); }
if (st.isDirectory()) {
  for (const f of readdirSync(verdictsPath).filter((x) => x.endsWith(".json"))) {
    const v = JSON.parse(readFileSync(join(verdictsPath, f), "utf8"));
    if (v?.id) produced.set(v.id, v.bucket);
  }
} else {
  for (const v of JSON.parse(readFileSync(verdictsPath, "utf8"))) if (v?.id) produced.set(v.id, v.bucket);
}

let pinned = 0, withinAccept = 0, missing = 0, wideNetViol = 0;
const fails = [];
for (const l of fx.lists) {
  const got = produced.get(l.id);
  if (got == null) { missing++; fails.push(`${l.id} "${l.title}" — MISSING verdict`); continue; }
  const accept = l.accept || fx.buckets;
  const constrained = accept.length < fx.buckets.length;
  if (constrained) { pinned++; if (accept.includes(got)) withinAccept++; else fails.push(`${l.id} "${l.title}" — got ${got}, accept [${accept.join("|")}]`); }
  if (got === "no-match" && !accept.includes("no-match")) wideNetViol++;
}

console.log(`fixture: ${fx.criterion}`);
console.log(`lists ${fx.lists.length} | pinned ${pinned} | within-accept ${withinAccept}/${pinned} | missing ${missing} | wide-net violations ${wideNetViol}`);
for (const f of fails) console.log(`  FAIL ${f}`);
process.exit(fails.length ? 1 : 0);
