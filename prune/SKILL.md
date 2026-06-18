---
name: twos-prune
description: >
  Safely PRUNE lists from a Twos account — capture the lists you've marked into a
  durable local backup, verify, then permanently delete them, repeatably. Use when
  someone wants to remove, cull, archive, or clean up Twos lists (especially
  sensitive ones) without losing data. Works with the claude.ai Twos connector;
  YOU make the connector calls and deterministic scripts do all the parsing, so it
  stays cheap on tokens. Deletion is permanent and gated behind a backup check.
---

# Twos Pruner

A repeatable **capture → verify → prune** loop for Twos lists. The user marks
lists for removal by linking them into a master list; this skill backs them up
losslessly, then deletes them — with a hard backup gate, a canary, per-list
verification, and an audit log.

## How the work is split (and why it's cheap on tokens)

Only YOU can reach the Twos connector, so YOU make every `mcp__...Twos__*` call.
But you do NOT parse or reason over the results — you **save each raw result to a
file** and run `scripts/prune.mjs`, which does all the graph-walking, rendering,
diffing, gating, and logging, and prints a short summary you read. For large
`get_list` results the harness already saves the JSON to a file — just move that
file to the path below instead of pasting it into your reply.

State + your saved results live under `./twos-prune-store/` (override with
`TWOS_PRUNE_STORE` — bash: `export TWOS_PRUNE_STORE=…`; Windows cmd: `set
TWOS_PRUNE_STORE=…`; PowerShell: `$env:TWOS_PRUNE_STORE = "…"`). You save
connector results to these exact paths:

| You call | Save the raw JSON to |
|---|---|
| `get_list({id})` (full)            | `raw/get_list/<id>.json` |
| `get_list({id, max_text:1})` for freshness | `raw/fresh/<id>.json` |
| post-delete `get_list({id, max_text:1})`   | `raw/after/<id>.json` (or `{"gone":true}` if not-found) |
| `get_list({id, max_text:1})` for the ref scan | `raw/scan/<id>.json` |

## Hard rules

- **Capture before delete. Always.** `delete-plan` will REFUSE to plan deleting
  any list that lacks a local capture backup — non-negotiable, no override.
- **Backup decision is required.** Before deleting, the user must either confirm a
  full backup/export was done (`ack --done`) or explicitly accept skipping it
  (`ack --skip "..."`). `delete-plan` REFUSES until one is on record.
- **Deletion is permanent.** Confirm the closure (count + titles) with the user
  and get an explicit go before deleting.
- **Canary first**, verify, then the rest. Stop and report on any anomaly; never
  retry a delete more than once.

## Procedure

0. **Model check (do this first).** Read your own model tier from your system
   context. Pruner was tuned and tested on **Opus**, and it permanently deletes
   lists. The hard gates (capture-before-delete, the backup gate, the canary) are
   enforced in the script, so they hold on any model — but executing the steps in
   order, saving each raw result to the right path, stopping on anomalies, and
   confirming the closure with the user before deleting are the model's job. If you
   cannot confirm you're an **Opus-tier** model (Sonnet, Haiku, or can't tell), say
   this once, then continue by default:
   > Heads-up: this skill permanently deletes lists and was tuned on Opus. Its
   > code-enforced gates (capture-before-delete, backup, canary) hold on any model,
   > but the careful step-by-step execution around them was tuned on Opus — on a
   > smaller model, follow each confirmation closely, or switch to Opus for this
   > run, since deletion is irreversible.

   If you *are* Opus-tier, skip this silently — no message.
1. **Master list.** Ask the user for the master "lists to prune" list (they create
   it in Twos and link the lists they want gone into it). Resolve its id with
   `search`/`list_lists`, then write `twos-prune-store/config.json`:
   `{"master_id":"<id>","master_name":"<name>"}`.
2. **Build the closure** (transitive `list_ref` walk):
   - `get_list({id: master})`, save to `raw/get_list/<id>.json`.
   - `node scripts/prune.mjs closure-step` — it prints any ids still to fetch.
     `get_list` each (full), save, re-run until it prints "Closure complete".
   - Show the user the closure (count + titles). Get a go. This is the kill list.
3. **Insurance backup (manual — the connector has no export tool).** Recommend the
   user trigger a full export in the Twos app (Settings → export) for a complete
   account snapshot. Then record the decision:
   - `node scripts/prune.mjs ack --done`  (they backed up / exported), or
   - `node scripts/prune.mjs ack --skip "I am okay skipping backup: <reason>"`.
4. **Capture** (lossless `json/` + readable `md/` + manifest):
   `node scripts/prune.mjs capture` — confirm every list captured, none empty.
5. **Freshness.** For each captured id, `get_list({id, max_text:1})` → save to
   `raw/fresh/<id>.json`. Then `node scripts/prune.mjs freshness`. Only lists whose
   live count matches the capture are approved; report MISMATCH/GONE.
6. **Canary.** `node scripts/prune.mjs delete-plan --canary`. If it prints REFUSED,
   STOP and resolve the reason. Otherwise it lists one id — `delete_list({id})`,
   then `get_list({id, max_text:1})` and save the outcome to `raw/after/<id>.json`
   (`{"gone":true}` on not-found). `node scripts/prune.mjs delete-record`. Confirm
   DELETED + backup intact before continuing.
7. **Prune the rest.** `node scripts/prune.mjs delete-plan --all` → for each id,
   `delete_list` + save the `raw/after/<id>.json` verify result. Then
   `node scripts/prune.mjs delete-record`.
8. **Report** from `manifest.json` + `deletion-log.json`. Then offer:
   - `refs` — enumerate all surviving lists (`list_lists` pages + `get_list`
     max_text:1 each → `raw/scan/<id>.json`), then `node scripts/prune.mjs refs`
     to find dangling pointers to removed lists.
   - `node scripts/prune.mjs zip` — bundle the store for safekeeping.

## Gotchas to warn the user about

- **Linked lists you don't own can't be deleted, only unlinked.** `delete_list`
  reports success and `get_list` returns not-found, but the list may still appear
  in the app. `delete-record` flags these as **SUSPECT-LINKED** — unlink them in
  the Twos app manually.
- **Dangling references.** Deleting a list leaves `list_ref` pointers to it in any
  list that linked to it (including the master list). Cosmetic; `refs` lists them.
- **Sensitive content** — the local store is full plaintext. Keep it off cloud
  sync and store it encrypted at rest.
