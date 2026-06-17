# Twos Pruner

A safe, repeatable way to **prune your Twos lists** — capture the lists you've
marked for removal into a durable local backup, verify the backup, then
permanently delete them. Driven by an AI assistant, with deterministic local
scripts doing the brains and a hard backup gate in front of every delete.

> A Claude skill, but the scripts are plain Node and work with any assistant that
> has the Twos connector.

## TL;DR

- You keep one **master list** in Twos (e.g. `Lists to prune`) and link the lists
  you want gone into it.
- Run the prune pass. It walks every list linked under the master (to any depth),
  **backs them up losslessly**, verifies, then **deletes** them — canary first,
  each deletion verified, all logged.
- **Nothing is deleted that isn't backed up first**, and the script refuses to
  proceed until you've either done a full backup or explicitly accepted skipping
  it. Repeat whenever your master list grows.

## Connector-only by design

This uses the **claude.ai Twos connector** — the one you already have. There's no
separate CLI or self-hosted server to install. Because only the assistant can
reach the connector, the assistant makes the Twos calls; the scripts never touch
Twos. The assistant saves each raw result to a file and runs `scripts/prune.mjs`,
which does all the graph-walking, rendering, diffing, gating, and logging.

**On token cost:** pulling a list's contents out of Twos has to pass through the
connector once — that's the floor, and it's unavoidable for any backup. What this
design avoids is the expensive part: the assistant never *parses or reasons over*
those payloads. It dumps them to files and reads only short script summaries
("captured 60 lists / 1570 items", "approved 59"). Structural steps use
`max_text:1`, so they're nearly free.

## Safety model

1. **Capture before delete** — every targeted list is dumped to lossless JSON
   (source of truth) + readable Markdown + a manifest, *before any deletion*. The
   delete step **refuses** to plan removing anything that lacks a capture backup.
2. **Backup gate** — before deleting you must record a decision: a full
   backup/export was done (`ack --done`), or you explicitly accept skipping it
   (`ack --skip "..."`). No decision → no deletion.
3. **Insurance export (optional, manual)** — the public connector has **no export
   tool**, so a full-account snapshot is a manual step in the Twos app. Recommended
   but waivable via the gate above; the per-list capture is the real backup.
4. **Freshness check** — each list is re-read live and compared to its capture;
   anything changed is skipped.
5. **Canary** — delete one list first, verify it's gone and its backup is intact.
6. **Verify + log** — every deletion is verified and written to `deletion-log.json`.
7. **Deletion is permanent.**

## How it works

The target set is the **transitive closure** of `list_ref` sub-list links under
your master list — so a link to a "container" list pulls in everything it links
to, recursively. That mirrors how people organize Twos: a hub of "stuff to remove"
pointing at many others.

Store layout (`./twos-prune-store/`, override with `TWOS_PRUNE_STORE`):

```
config.json          master list id + name
raw/get_list/<id>    raw connector results the assistant saved (full)
raw/fresh|after|scan raw results for freshness / delete-verify / ref-scan
closure.json         the computed kill list (review before capturing)
json/<id>.json       lossless per-list backup (source of truth)
md/<slug>-<id>.md    human-readable render
manifest.json        index of the capture
freshness-report.json / delete-approved.json
ack.json             the recorded backup decision (gate input)
deletion-log.json    audit trail (deleted / suspect-linked)
dangling-refs.json   leftover pointers to deleted lists (optional cleanup)
```

## Commands (run by the assistant; you read summaries)

```bash
node scripts/prune.mjs closure-step             # walk list_ref; report ids to fetch
node scripts/prune.mjs capture                  # raw -> lossless json + md + manifest
node scripts/prune.mjs freshness                # compare live counts -> approved set
node scripts/prune.mjs ack --done               # OR: ack --skip "reason"
node scripts/prune.mjs delete-plan --canary     # GATED: emit one, or REFUSE
node scripts/prune.mjs delete-record            # classify verify results -> log
node scripts/prune.mjs delete-plan --all        # the rest, once canary is clean
node scripts/prune.mjs refs                     # find dangling pointers (optional)
node scripts/prune.mjs zip                      # bundle the store
```

See `SKILL.md` for the exact fetch-and-save steps the assistant follows.

## Known gotchas

- **Linked lists you don't own can't be deleted, only unlinked.** `delete_list`
  reports success and `get_list` returns not-found, but the list may persist in
  your app. Flagged as `SUSPECT-LINKED`; unlink it in the Twos app.
- **Dangling references**: deleting a list leaves `list_ref` pointers to it in any
  list that linked to it (cosmetic). `refs` finds them.
- **Sensitive content**: the local store is full plaintext — keep it off cloud
  sync and store it encrypted at rest.

## Limitations / non-goals

- Captures and removes; it doesn't merge, edit, or reorganize lists.
- No automated full-account export (the connector lacks an export tool) — that
  insurance step is manual.
- Tool return shapes are handled defensively but may need tweaks as the Twos
  connector evolves; `create_list` (used only to make the master list) is the one
  call not yet verified against a live account.

## License

Share freely. No warranty — deletion is irreversible; use the safety steps.
