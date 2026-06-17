#!/usr/bin/env node
// prune.mjs — deterministic brains for the Twos Pruner workflow.
//
// CONNECTOR-ONLY MODEL: the assistant (Claude) is the only thing that can reach
// the Twos MCP connector, so IT makes the tool calls and saves each raw result
// into the store. This script never calls Twos — it only processes local files
// and prints compact summaries, so the assistant does no heavy parsing itself.
//
// The assistant saves connector results here (see SKILL.md for exact steps):
//   raw/get_list/<id>.json   full get_list payload  {list, things, reminders}
//   raw/fresh/<id>.json      get_list(max_text:1) payload (freshness counts)
//   raw/after/<id>.json      post-delete verify: the get_list payload, or {"gone":true}
//   raw/scan/<id>.json       get_list(max_text:1) of every surviving list (for refs)
//
// Subcommands:
//   closure-step                walk known list_ref links; report ids still to fetch
//   capture                     raw/get_list -> json/ + md/ + manifest.json
//   freshness                   compare raw/fresh counts to manifest -> approved set
//   ack --done | --skip "why"   record the insurance-backup decision (gate input)
//   delete-plan [--canary|--all]  GATED: emit delete order, or REFUSE
//   delete-record               raw/after -> deletion-log.json (deleted/suspect-linked)
//   refs                        raw/scan -> dangling-refs.json
//   zip                         bundle the store

import {
  mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync, copyFileSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORE = process.env.TWOS_PRUNE_STORE || join(HERE, "..", "twos-prune-store");
const argv = process.argv.slice(2);
const cmd = argv[0];
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const positional = argv.slice(1).filter((a) => !a.startsWith("--"));

const p = (...x) => join(STORE, ...x);
const readJSON = (f, d = null) => (existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : d);
const writeJSON = (f, o) => { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, JSON.stringify(o, null, 1)); };
const slug = (s) => (s || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "untitled";
const die = (msg, code = 1) => { console.error(msg); process.exit(code); };

// raw get_list payload helpers (defensive about shape)
const meta = (raw) => raw?.list || {};
const things = (raw) => raw?.things || [];
const refsOf = (raw) => things(raw).map((t) => t.list_ref).filter(Boolean);
const rawIds = () => (existsSync(p("raw", "get_list")) ? readdirSync(p("raw", "get_list")).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")) : []);
const loadRaw = (id) => readJSON(p("raw", "get_list", `${id}.json`));

// --- closure-step ------------------------------------------------------------
function closureStep() {
  const cfg = readJSON(p("config.json"));
  if (!cfg?.master_id) die("No config.json. Save the master list first (see SKILL.md `init`).");
  const have = new Map();
  for (const id of rawIds()) { const r = loadRaw(id); have.set(id, { title: meta(r).title || id, count: things(r).length, refs: refsOf(r) }); }

  const visited = new Set();
  const reachable = [];
  const needed = new Set();
  const queue = [cfg.master_id];
  while (queue.length) {
    const id = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    if (!have.has(id)) { needed.add(id); continue; }
    if (id !== cfg.master_id) reachable.push(id);
    for (const c of have.get(id).refs) if (!visited.has(c)) queue.push(c);
  }

  if (needed.size) {
    console.log(`Closure incomplete. Fetch FULL get_list for these and save to raw/get_list/<id>.json:`);
    for (const id of needed) console.log(`  ${id}`);
    console.log(`\nThen run \`closure-step\` again.`);
    process.exit(3);
  }
  const lists = reachable.map((id) => ({ id, title: have.get(id).title, count: have.get(id).count }));
  writeJSON(p("closure.json"), { root: cfg.master_id, stamp: new Date().toISOString(), lists });
  console.log(`Closure complete: ${lists.length} lists under the master.`);
  for (const l of lists) console.log(`  ${l.id}  ${String(l.count).padStart(4)}  ${l.title}`);
  console.log(`\n-> ${p("closure.json")}  (review/confirm scope, then \`capture\`)`);
}

// --- capture -----------------------------------------------------------------
function renderMd(m, ts) {
  const fm = ["---", `id: ${m.id}`, `title: ${JSON.stringify(m.title || "")}`, `created: ${m.created ?? ""}`,
    `item_count: ${ts.length}`, "source: twos", "---", "", `# ${m.title || m.id}`, ""];
  const body = ts.map((t) => {
    const pad = "  ".repeat(Math.max(0, t.tabs || 0));
    let line = t.type === "todo" ? `${pad}- [${t.completed ? "x" : " "}] ${t.text ?? ""}`
      : t.type === "number" ? `${pad}1. ${t.text ?? ""}`
      : (t.type === "bullet" || t.type === "dash") ? `${pad}- ${t.text ?? ""}`
      : `${pad}${t.text ?? ""}`;
    if (t.favorited) line += " ⭐";
    if (t.url) line += ` ([link](${t.url}))`;
    if (t.list_ref) line += `  ↳ sub-list: ${t.list_ref}`;
    if (t.tags?.length) line += " " + t.tags.map((x) => `#${x}`).join(" ");
    return line;
  });
  return fm.join("\n") + body.join("\n") + "\n";
}

function capture() {
  const c = readJSON(p("closure.json"));
  if (!c) die("No closure.json. Run `closure-step` to completion first.");
  const missing = c.lists.filter((l) => !existsSync(p("raw", "get_list", `${l.id}.json`)));
  if (missing.length) die(`Missing full get_list for: ${missing.map((m) => m.id).join(", ")}\nFetch them and save to raw/get_list/ first.`);
  mkdirSync(p("json"), { recursive: true });
  const manifest = { stamp: new Date().toISOString(), root: c.root, count: 0, lists: [] };
  let totalItems = 0, empties = 0;
  for (const { id } of c.lists) {
    const raw = loadRaw(id);
    const m = { ...meta(raw), id };
    const ts = things(raw);
    const jsonRel = join("json", `${id}.json`);
    const mdRel = join("md", `${slug(m.title)}-${id.slice(-6)}.md`);
    writeJSON(p(jsonRel), { list: m, things: ts, reminders: raw?.reminders || [] });
    mkdirSync(dirname(p(mdRel)), { recursive: true });
    writeFileSync(p(mdRel), renderMd(m, ts));
    if (ts.length === 0) empties++;
    totalItems += ts.length;
    manifest.lists.push({ id, title: m.title || id, item_count: ts.length, json: jsonRel, md: mdRel });
  }
  manifest.count = manifest.lists.length;
  writeJSON(p("manifest.json"), manifest);
  console.log(`Captured ${manifest.count} lists / ${totalItems} items -> ${STORE}`);
  console.log(empties ? `WARNING: ${empties} list(s) captured with 0 items — verify before deleting.` : `All captures non-empty.`);
}

// --- freshness ---------------------------------------------------------------
function freshness() {
  const m = readJSON(p("manifest.json"));
  if (!m) die("No manifest.json. Run `capture` first.");
  const rows = []; let pass = 0, mismatch = 0, gone = 0, need = 0;
  for (const l of m.lists) {
    const fr = readJSON(p("raw", "fresh", `${l.id}.json`));
    let status, live = null;
    if (fr === null) { status = "NEEDS-FETCH"; need++; }
    else if (fr.gone) { status = "GONE"; gone++; }
    else { live = things(fr).length; status = live === l.item_count ? "PASS" : "MISMATCH"; if (status === "PASS") pass++; else mismatch++; }
    rows.push({ id: l.id, title: l.title, captured: l.item_count, live, status });
    if (status !== "PASS") console.log(`  ${status}  ${l.id}  cap=${l.item_count} live=${live ?? "-"}  ${l.title}`);
  }
  writeJSON(p("freshness-report.json"), { stamp: new Date().toISOString(), rows });
  writeJSON(p("delete-approved.json"), rows.filter((r) => r.status === "PASS").map((r) => r.id));
  console.log(`\nPASS ${pass} | MISMATCH ${mismatch} | GONE ${gone} | NEEDS-FETCH ${need} -> approved ${pass}`);
  if (need) console.log(`Fetch get_list(max_text:1) for NEEDS-FETCH ids into raw/fresh/<id>.json, then re-run.`);
}

// --- ack (backup-decision gate input) ----------------------------------------
function ack() {
  if (flags.has("--done")) writeJSON(p("ack.json"), { backup: "done", note: positional[0] || "full backup/export confirmed", stamp: new Date().toISOString() });
  else if (flags.has("--skip")) writeJSON(p("ack.json"), { backup: "skipped", note: positional[0] || "(no reason given)", stamp: new Date().toISOString() });
  else die(`Usage: ack --done ["note"]   OR   ack --skip "I am okay skipping backup: <reason>"`, 2);
  console.log(`Recorded: ${JSON.stringify(readJSON(p("ack.json")))}`);
}

// --- delete-plan (THE GATE) --------------------------------------------------
function deletePlan() {
  const refusals = [];
  const manifest = readJSON(p("manifest.json"));
  const approved = readJSON(p("delete-approved.json"), []);
  const ackRec = readJSON(p("ack.json"));
  const log = readJSON(p("deletion-log.json"), { deleted: [] });
  const doneSet = new Set((log.deleted || []).map((d) => d.id));

  if (!manifest) refusals.push("no manifest.json — run `capture`.");
  if (!approved.length) refusals.push("nothing approved for deletion — run `freshness`.");
  // Per-list capture backup is MANDATORY and cannot be waived.
  const noBackup = approved.filter((id) => !existsSync(p("json", `${id}.json`)));
  if (noBackup.length) refusals.push(`missing local capture backups (cannot delete without backup): ${noBackup.join(", ")}`);
  // Insurance/full-backup decision is REQUIRED but may be an explicit skip.
  if (!ackRec) refusals.push(`no backup decision on record. Either back up first then \`ack --done\`, or run \`ack --skip "I am okay skipping backup: <reason>"\`.`);

  if (refusals.length) {
    console.error("REFUSED TO PLAN DELETION:");
    for (const r of refusals) console.error("  - " + r);
    process.exit(2);
  }

  let targets = approved.filter((id) => !doneSet.has(id));
  if (flags.has("--canary")) targets = targets.slice(0, 1);
  if (!targets.length) { console.log("Nothing left to delete (all approved already deleted)."); return; }

  console.log(`Backup decision: ${ackRec.backup}${ackRec.backup === "skipped" ? ` (${ackRec.note})` : ""}`);
  console.log(`Approved & backed up. Delete these ${targets.length} list(s) IN ORDER:`);
  for (const id of targets) console.log(`  ${id}`);
  console.log(`\nFor EACH id above:`);
  console.log(`  1) call delete_list({id})`);
  console.log(`  2) call get_list({id, max_text:1}); on "not found" save {"gone":true} to raw/after/<id>.json, else save the payload there`);
  console.log(`Then run \`delete-record\`. (Tip: start with \`delete-plan --canary\` and verify one before \`--all\`.)`);
}

// --- delete-record -----------------------------------------------------------
function deleteRecord() {
  const manifest = readJSON(p("manifest.json"));
  const approved = readJSON(p("delete-approved.json"), []);
  const log = readJSON(p("deletion-log.json"), { stamp: new Date().toISOString(), mechanism: "mcp delete_list", deleted: [], suspect_linked: [] });
  const titleOf = (id) => manifest?.lists.find((l) => l.id === id)?.title || id;
  const seen = new Set([...log.deleted.map((d) => d.id), ...log.suspect_linked.map((d) => d.id)]);
  let added = 0;
  for (const id of approved) {
    if (seen.has(id)) continue;
    const after = readJSON(p("raw", "after", `${id}.json`));
    if (after === null) continue; // not verified yet
    if (after.gone || (!after.list && !after.things)) { log.deleted.push({ id, title: titleOf(id), stamp: new Date().toISOString() }); console.log(`  DELETED  ${id}  ${titleOf(id)}`); }
    else { log.suspect_linked.push({ id, title: titleOf(id) }); console.log(`  SUSPECT-LINKED  ${id}  ${titleOf(id)}  (still readable after delete — likely a list you don't own; unlink in the app)`); }
    added++;
  }
  writeJSON(p("deletion-log.json"), log);
  console.log(`\nRecorded ${added} new. Totals: deleted ${log.deleted.length} | suspect-linked ${log.suspect_linked.length} | approved ${approved.length}`);
}

// --- refs --------------------------------------------------------------------
function refs() {
  const manifest = readJSON(p("manifest.json"));
  const log = readJSON(p("deletion-log.json"), { deleted: [] });
  const removed = new Set([...(manifest?.lists || []).map((l) => l.id), ...(log.deleted || []).map((d) => d.id)]);
  const dir = p("raw", "scan");
  if (!existsSync(dir)) die("No raw/scan/. Fetch get_list(max_text:1) for every surviving list into raw/scan/<id>.json first.");
  const dangling = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const raw = readJSON(join(dir, f)); const host = f.replace(/\.json$/, "");
    for (const t of things(raw)) if (t.list_ref && removed.has(t.list_ref)) dangling.push({ in_list: host, in_title: meta(raw).title || host, thing: t.id, points_to: t.list_ref });
  }
  writeJSON(p("dangling-refs.json"), { stamp: new Date().toISOString(), dangling });
  console.log(`Dangling sub-list references to removed lists: ${dangling.length}`);
  for (const d of dangling.slice(0, 40)) console.log(`  in "${d.in_title}" -> ${d.points_to}`);
}

// --- zip ---------------------------------------------------------------------
function zip() {
  const out = p(`twos-prune-store-${new Date().toISOString().slice(0, 10)}.zip`);
  if (existsSync(out)) rmSync(out);
  execFileSync("zip", ["-r", "-q", out, ".", "-x", "*.zip"], { cwd: STORE });
  console.log(`Bundled -> ${out}`);
}

// --- dispatch ----------------------------------------------------------------
const run = { "closure-step": closureStep, capture, freshness, ack, "delete-plan": deletePlan, "delete-record": deleteRecord, refs, zip };
if (!run[cmd]) die(`unknown command: ${cmd || "(none)"}\nsee SKILL.md for the procedure`, 2);
run[cmd]();
