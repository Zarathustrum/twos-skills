---
name: twos-sift
description: >
  Find Twos lists matching a natural-language criterion (e.g. "looks personal",
  "stale/untouched", "work", "duplicates"), classify them into a browsable HTML
  review surface, and track progress by crossing out lists you've queued for
  removal. The front half of the prune workflow: Sift finds candidates, you
  curate them into a master list, then twos-prune removes them. Works with the
  claude.ai Twos connector; deterministic scripts do enumeration, HTML, and
  cross-out tracking — only the per-list judgement uses the model.
---

# Twos Sift

Find → classify → browse → track. Sift turns "show me the lists that look like X"
into a set of clickable HTML pages, and keeps them crossed out as you queue lists
into your prune master list. Pairs with **twos-prune** (which does the removal).

## Work split

Only YOU can reach the Twos connector, so YOU make the calls. The script does
enumeration planning, the classification cache, HTML generation, the closure
walk, and the cross-out marking. The **only** model judgement is classifying each
list against the criterion — and that's deliberately cheap: title + a short
`max_text:1` sample → a one-line verdict.

State lives under `./twos-sift-store/` (override `TWOS_SIFT_STORE` — bash:
`export TWOS_SIFT_STORE=…`; Windows cmd: `set TWOS_SIFT_STORE=…`; PowerShell:
`$env:TWOS_SIFT_STORE = "…"`). You save connector results to:

| You call | Save to |
|---|---|
| `list_lists({page})` (each page) | `raw/list_index/<page>.json` |
| `get_list({id})` for the prune/keep masters + their container sub-lists | `raw/get_list/<id>.json` |
| classification verdict you write per list | `raw/verdicts/<id>.json` |

A verdict file is: `{"id","title","created","item_count","bucket","rationale"}`
where `bucket` is one of the configured buckets (default: `match`, `uncertain`,
`no-match`).

## Setup

Write `twos-sift-store/config.json`:
```json
{
  "criterion": "lists that look personal or private",
  "prune_master_id": "<id of 'Lists to prune'>",
  "keep_master_id": "<id of 'Lists to keep' (optional)>",
  "buckets": ["match", "uncertain", "no-match"]
}
```

## Procedure

0. **Model check (do this first).** Read your own model tier from your system
   context. Sift's one model step — the title classification — is tuned and tested
   on **Opus and Sonnet** (they agree on clean criteria; on fuzzy ones Sonnet
   actually hedges more faithfully to the wide-net rule). If you cannot confirm
   you're on an **Opus- or Sonnet-tier** model (e.g. you're on Haiku or can't tell),
   say this to the user once, then continue by default:
   > Heads-up: Sift's classification is tested on Opus and Sonnet. On a smaller or
   > unknown model the candidate list may come out noisier — more mislabels to sort
   > through. It's still safe (Sift never deletes; you review every list before
   > twos-prune removes anything), just more review work. Switch to Opus or Sonnet
   > for a validated pass, or say "continue" to proceed as-is.

   If you're on Opus or Sonnet, skip this silently — no message.
1. **Enumerate.** Page `list_lists` until empty, saving each page to
   `raw/list_index/<page>.json`.
2. **Prefilter (recommended — free, big token saver).** Propose a `prefilter.json`
   from the criterion plus a glance at the titles, and save it:
   ```json
   { "match": ["therap", "settlement", "\\bDr\\.?\\b"], "no_match": ["grocery", "sprint", "standup"] }
   ```
   Patterns are case-insensitive regex/substrings against the title; `match` wins
   over `no_match` (wide-net bias). Run `node scripts/sift.mjs prefilter` — it
   auto-buckets every obvious title with **no model calls**, leaving only a
   residue.
3. **Classify the residue.** `node scripts/sift.mjs classify-plan --cheap` — judge
   the remaining titles **from the title alone, in batches (~40/message)**, biasing
   toward `match`/`uncertain`: use `no-match` **only when the title gives a positive
   reason it does NOT fit the criterion**; if it's vague or merely *might* fit, use
   `uncertain`, never `no-match` (false positives are fine — the user reviews them).
   Write `raw/verdicts/<id>.json` per list. Don't call `get_list`.
   - *Higher precision, higher cost:* drop `--cheap` to instead read a sample per
     list (`get_list({id, max_text:1})`) before judging. Use only when titles are
     too vague to sift on.
   Then `node scripts/sift.mjs ingest` — folds verdicts into `classifications.json`
   (cached, deduped).
4. **Closure.** To know what's already queued, fetch the masters' sub-list graph:
   `get_list({id})` for `prune_master_id` (and `keep_master_id` if set), save to
   `raw/get_list/`. Run `node scripts/sift.mjs closure`; it lists any container
   ids still to fetch — fetch + save + re-run until "complete". Produces
   `prune-set.json` / `keep-set.json` (transitive `list_ref` membership).
5. **Build.** `node scripts/sift.mjs build` — generates `html/index.html` +
   one page per bucket. A list is **struck red** if it's in the prune closure
   (itself or via a parent), **struck grey** if in the keep closure, otherwise
   live. Also writes `remaining-to-assess.json` (classified but not yet decided).
6. **Loop.** Open `html/index.html`, scan the un-struck (still-to-review) lists,
   and for each decision link it into `Lists to prune` or `Lists to keep` in the
   Twos app. Re-run steps 4–5 (closure + build) to refresh the strikes. Repeat.
7. **Hand off.** When you've queued what you want, run **twos-prune** against
   `Lists to prune` to capture + remove them.

## Notes / honest constraints

- Classification is the one model-driven step, so it's the token cost. The
  prefilter + `--cheap` path keeps it small: the prefilter auto-buckets obvious
  titles for free, and the residue is judged from titles in batches — often a
  handful of messages for a whole account, with no list-body reads. Results are
  cached, so re-scans only touch new lists.
- The cost buys speed for false positives: title-only sifting mislabels some lists
  (vague titles like "Misc"). That's intended — you catch them on the review
  surface, and nothing here deletes anything. For a low-stakes, higher-precision
  pass, drop `--cheap`.
- Re-running `build` regenerates the HTML from current Twos state, so strikes are
  always current; there's nothing to lose by rebuilding.
