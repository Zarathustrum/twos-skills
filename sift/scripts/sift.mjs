#!/usr/bin/env node
// sift.mjs — deterministic brains for Twos Sift (find/classify/browse/track).
//
// CONNECTOR-ONLY: the assistant makes the Twos calls and saves raw results; this
// script does enumeration planning, the classification cache, the prune/keep
// closure walk, and HTML generation with cross-out marks. The only model work is
// judging each list against the criterion (one cheap verdict per list).
//
// Subcommands:
//   prefilter            apply prefilter.json keyword patterns -> auto-verdicts (free)
//   classify-plan [--cheap]  list ids still needing a model verdict
//   ingest               raw/verdicts/* -> classifications.json (cached, deduped)
//   closure              walk prune/keep master list_ref graph -> prune-set/keep-set
//   build                classifications + sets -> html/ pages + remaining-to-assess
//
// Token-efficiency path: write prefilter.json {match:[...], no_match:[...]} (the
// model proposes it once from the criterion), run `prefilter` to auto-bucket the
// obvious titles for free, then `classify-plan --cheap` judges the RESIDUE from
// titles alone in batches (no body reads). Cheaper, more false positives — which
// the user catches on the browsable review surface.
//
// A list is struck RED if in the prune closure (itself or via a parent), GREY if
// in the keep closure, otherwise live.

import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORE = process.env.TWOS_SIFT_STORE || join(HERE, "..", "twos-sift-store");
const cmd = process.argv[2];
const flags = new Set(process.argv.slice(3).filter((a) => a.startsWith("--")));
const p = (...x) => join(STORE, ...x);
const readJSON = (f, d = null) => (existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : d);
const writeJSON = (f, o) => { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, JSON.stringify(o, null, 1)); };
const die = (m, c = 1) => { console.error(m); process.exit(c); };
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const cfg = () => readJSON(p("config.json")) || die("write twos-sift-store/config.json first (see SKILL.md)");
const things = (raw) => raw?.things || [];
const listMeta = (raw) => raw?.list || {};

// all lists the account knows about, from saved list_lists pages
function listIndex() {
  const dir = p("raw", "list_index");
  if (!existsSync(dir)) die("no raw/list_index/ — page list_lists and save first");
  const out = new Map();
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const res = readJSON(join(dir, f));
    const lists = res?.lists || res?.results || (Array.isArray(res) ? res : []);
    for (const l of lists) { const id = l.id || l._id; if (id) out.set(id, l); }
  }
  return out;
}

// Compile a pattern as a case-insensitive regex; fall back to literal substring.
const rx = (s) => { try { return new RegExp(s, "i"); } catch { return new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); } };

function alreadyClassified() {
  const done = new Set((readJSON(p("classifications.json"), []) || []).map((x) => x.id));
  if (existsSync(p("raw", "verdicts"))) for (const f of readdirSync(p("raw", "verdicts"))) if (f.endsWith(".json")) done.add(f.replace(/\.json$/, ""));
  return done;
}

// Deterministic, free: auto-bucket titles matching prefilter.json patterns.
// `match` takes precedence over `no_match` (wide-net bias toward inclusion).
function prefilter() {
  const c = cfg();
  const pf = readJSON(p("prefilter.json")) || die('write prefilter.json first: {"match":["regex|substr",...],"no_match":[...]} (model proposes it — see SKILL.md)');
  const idx = listIndex();
  const skip = new Set([c.prune_master_id, c.keep_master_id].filter(Boolean));
  const done = alreadyClassified();
  const M = (pf.match || []).map(rx), N = (pf.no_match || []).map(rx);
  let auto = 0, residue = 0;
  for (const [id, l] of idx) {
    if (skip.has(id) || done.has(id)) continue;
    const t = l.title || "";
    const mHit = M.find((r) => r.test(t)), nHit = N.find((r) => r.test(t));
    const bucket = mHit ? "match" : nHit ? "no-match" : null;
    if (bucket) {
      writeJSON(p("raw", "verdicts", `${id}.json`), { id, title: t, created: l.created || l.updated || "", item_count: l.item_count ?? null, bucket, rationale: `prefilter: /${(mHit || nHit).source}/` });
      auto++;
    } else residue++;
  }
  console.log(`Prefilter: auto-classified ${auto} by title | residue ${residue} left for the model`);
  console.log(residue ? `Next: \`classify-plan --cheap\` to judge the residue from titles.` : `Next: \`ingest\` then \`build\`.`);
}

function classifyPlan() {
  const c = cfg();
  const cheap = flags.has("--cheap");
  const idx = listIndex();
  const skip = new Set([c.prune_master_id, c.keep_master_id].filter(Boolean)); // don't classify scaffolding
  const done = alreadyClassified();
  const need = [...idx.keys()].filter((id) => !skip.has(id) && !done.has(id));
  console.log(`Account lists: ${idx.size} | already classified (cache+prefilter): ${done.size} | residue: ${need.length}`);
  if (!need.length) { console.log("Nothing left to classify. Run `ingest` then `build`."); return; }
  if (cheap) {
    console.log(`Judge these ${need.length} from TITLE ALONE, in batches (~40/message). Bias toward match/uncertain when unsure (false positives are fine; the user reviews them). Do NOT call get_list. Write raw/verdicts/<id>.json {id,title,created,item_count:null,bucket,rationale}:`);
  } else {
    console.log(`Classify these ${need.length} — get_list({id,max_text:1}), judge vs criterion, write raw/verdicts/<id>.json:`);
  }
  for (const id of need) console.log(`  ${id}  ${esc(idx.get(id).title || "")}`);
}

function ingest() {
  const dir = p("raw", "verdicts");
  if (!existsSync(dir)) die("no raw/verdicts/ yet");
  const byId = new Map((readJSON(p("classifications.json"), []) || []).map((c) => [c.id, c]));
  let added = 0;
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const v = readJSON(join(dir, f));
    if (v?.id) { if (!byId.has(v.id)) added++; byId.set(v.id, v); }
  }
  const all = [...byId.values()];
  writeJSON(p("classifications.json"), all);
  console.log(`Ingested. classifications: ${all.length} (+${added} new)`);
}

// BFS a master id over saved get_list list_ref edges. Returns {set, needed}.
function walk(rootId) {
  const have = new Map();
  const gdir = p("raw", "get_list");
  if (existsSync(gdir)) for (const f of readdirSync(gdir).filter((x) => x.endsWith(".json"))) {
    const id = f.replace(/\.json$/, ""); const raw = readJSON(join(gdir, f));
    have.set(id, things(raw).map((t) => t.list_ref).filter(Boolean));
  }
  const set = new Set(), needed = new Set(), visited = new Set(), q = [rootId];
  while (q.length) {
    const id = q.shift();
    if (visited.has(id)) continue; visited.add(id);
    if (!have.has(id)) { needed.add(id); if (id !== rootId) set.add(id); continue; }
    if (id !== rootId) set.add(id);
    for (const c of have.get(id)) if (!visited.has(c)) q.push(c);
  }
  return { set, needed };
}

function closure() {
  const c = cfg();
  const prune = walk(c.prune_master_id);
  const keep = c.keep_master_id ? walk(c.keep_master_id) : { set: new Set(), needed: new Set() };
  // Any member we have no raw for could be a container with more sub-lists, so
  // block until every reachable id has been fetched.
  const blocking = [...new Set([...prune.needed, ...keep.needed])];
  if (blocking.length) {
    console.log(`Closure needs full get_list for these (save to raw/get_list/<id>.json), then re-run:`);
    for (const id of blocking) console.log(`  ${id}`);
    process.exit(3);
  }
  writeJSON(p("prune-set.json"), [...prune.set]);
  writeJSON(p("keep-set.json"), [...keep.set]);
  console.log(`prune-set: ${prune.set.size} | keep-set: ${keep.set.size}`);
}

const STYLE = `body{font:15px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:0;color:#1a1a1a;background:#fafafa}
.wrap{max-width:1100px;margin:0 auto;padding:24px 20px 80px}h1{font-size:24px;margin:0 0 4px}.sub{color:#666;margin:0 0 18px}
.nav{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}.pill{border:1px solid #e2e2e2;border-radius:999px;background:#fff;padding:5px 11px;font-size:13px;text-decoration:none;color:#1456b8}
table{border-collapse:collapse;width:100%;background:#fff;border:1px solid #e2e2e2;border-radius:8px;overflow:hidden}
th,td{text-align:left;padding:8px 11px;border-bottom:1px solid #eee;vertical-align:top}th{background:#f3f3f3;font-size:12px;text-transform:uppercase;color:#666}
td.n,td.c{color:#888;white-space:nowrap;width:1%;font-variant-numeric:tabular-nums}a{color:#1456b8;text-decoration:none}a:hover{text-decoration:underline}
a.prune{text-decoration:line-through;color:#b4232a}a.keep{text-decoration:line-through;color:#9aa0a6}.why{color:#444}`;

function page(title, sub, navHtml, rowsHtml) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${STYLE}</style></head><body><div class="wrap"><h1>${esc(title)}</h1><p class="sub">${esc(sub)}</p><div class="nav">${navHtml}</div>${rowsHtml}</div></body></html>`;
}

function build() {
  const c = cfg();
  const all = readJSON(p("classifications.json"), []) || [];
  if (!all.length) die("no classifications.json — run classify + ingest first");
  const pruneSet = new Set(readJSON(p("prune-set.json"), []) || []);
  const keepSet = new Set(readJSON(p("keep-set.json"), []) || []);
  const buckets = c.buckets || ["match", "uncertain", "no-match"];
  const order = (b) => { const i = buckets.indexOf(b); return i < 0 ? 99 : i; };
  const groups = {};
  for (const x of all) (groups[x.bucket] ||= []).push(x);
  for (const k of Object.keys(groups)) groups[k].sort((a, b) => (a.created || "").localeCompare(b.created || ""));

  mkdirSync(p("html"), { recursive: true });
  const file = (b) => `${b.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.html`;
  const navItems = (active) => [["index.html", "All"], ...Object.keys(groups).sort((a, b) => order(a) - order(b)).map((b) => [file(b), `${b} (${groups[b].length})`])]
    .map(([href, label]) => `<a class="pill" href="${href}"${href === active ? ' style="font-weight:700"' : ""}>${esc(label)}</a>`).join("");

  const cls = (id) => pruneSet.has(id) ? "prune" : keepSet.has(id) ? "keep" : "";
  const rows = (items) => `<table><thead><tr><th>#</th><th>List</th><th>Items</th><th>Created</th><th>Why</th></tr></thead><tbody>` +
    items.map((x, i) => `<tr><td class="n">${i + 1}</td><td><a class="${cls(x.id)}" href="https://twosapp.com/${esc(x.id)}" target="_blank" rel="noopener">${esc(x.title || x.id)}</a></td><td class="c">${esc(x.item_count ?? "")}</td><td class="c">${esc((x.created || "").slice(0, 10))}</td><td class="why">${esc(x.rationale || "")}</td></tr>`).join("") +
    `</tbody></table>`;

  // per-bucket pages
  for (const b of Object.keys(groups)) writeFileSync(p("html", file(b)), page(`Twos Sift — ${b}`, c.criterion, navItems(file(b)), rows(groups[b])));
  // index = summary cards
  const struckP = all.filter((x) => pruneSet.has(x.id)).length, struckK = all.filter((x) => keepSet.has(x.id)).length;
  const summary = `<table><thead><tr><th>Bucket</th><th>Lists</th><th>Queued (prune)</th><th>Kept</th><th>To review</th></tr></thead><tbody>` +
    Object.keys(groups).sort((a, b) => order(a) - order(b)).map((b) => { const g = groups[b]; const pr = g.filter((x) => pruneSet.has(x.id)).length, ke = g.filter((x) => keepSet.has(x.id)).length; return `<tr><td><a href="${file(b)}">${esc(b)}</a></td><td class="c">${g.length}</td><td class="c">${pr}</td><td class="c">${ke}</td><td class="c">${g.length - pr - ke}</td></tr>`; }).join("") +
    `</tbody></table>`;
  writeFileSync(p("html", "index.html"), page("Twos Sift", `Criterion: ${c.criterion}`, navItems("index.html"), summary));

  const remaining = all.filter((x) => !pruneSet.has(x.id) && !keepSet.has(x.id));
  writeJSON(p("remaining-to-assess.json"), { stamp: new Date().toISOString(), criterion: c.criterion, count: remaining.length, lists: remaining.map((x) => ({ id: x.id, title: x.title, bucket: x.bucket })) });
  console.log(`Built html/ — ${all.length} lists | queued(prune) ${struckP} | kept ${struckK} | to review ${remaining.length}`);
  console.log(`-> ${p("html", "index.html")}`);
}

const run = { prefilter, "classify-plan": classifyPlan, ingest, closure, build };
if (!run[cmd]) die(`unknown command: ${cmd || "(none)"}\nsee SKILL.md`, 2);
run[cmd]();
