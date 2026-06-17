# Twos Skills — Sift & Prune

Two [Claude](https://claude.com/claude-code) skills that work together to clean up
a [Twos](https://www.twosapp.com) account safely: **Sift** finds and helps you
review lists by a criterion you describe; **Prune** backs the chosen ones up
locally and permanently removes them. They run through the **claude.ai Twos
connector** — no separate app, CLI, or server.

```
Sift:  criterion → classify → browsable HTML (red = queued, grey = kept, plain = to review)
         → you link lists into "Lists to prune" / "Lists to keep" in the Twos app
Prune: "Lists to prune" → capture (lossless backup) → verify → delete (gated, logged)
```

## The two skills

| | What it does | Folder |
|---|---|---|
| **[Sift](./sift)** | Find lists matching a natural-language criterion ("looks personal", "stale", "work", "duplicates"), classify them into a clickable HTML review surface, and cross out the ones you've queued. | [`/sift`](./sift) |
| **[Prune](./prune)** | Walk the lists you queued, back each up losslessly (JSON + Markdown), verify, then delete — canary first, every removal verified and logged. | [`/prune`](./prune) |

You can use them together (the usual flow) or independently.

## Why it's safe

- **Capture before delete, always.** Prune refuses to *plan* deleting any list it
  hasn't backed up — enforced in code, not a comment.
- **Backup gate.** Before deleting you must record a decision: a full
  backup/export was done, or you explicitly accept skipping it.
- **Canary first**, every deletion verified, full audit log. **Deletion is
  permanent.**
- Sift never deletes — it only builds a review surface you control.

## Why it's cheap on tokens

Only the assistant can reach the connector, so it makes the calls — but it doesn't
*reason over* the data. Deterministic local scripts do the graph-walking,
rendering, diffing, gating, and logging; the assistant reads only short summaries.
Sift adds a free keyword **prefilter** and judges the rest **from titles in
batches**, so a whole account is usually a handful of messages. See each skill's
README for the honest cost details.

## Install

These are Claude skills — each folder has a `SKILL.md`. Drop `sift/` and `prune/`
into your Claude skills directory (or point your skills config at them), then ask
Claude to *"sift my Twos lists"* or *"prune my Twos lists"*. You need the **Twos
connector** enabled in claude.ai. The scripts are plain Node (v18+), no
dependencies.

## Known limits & gotchas

- The Twos connector has **no export tool**, so the optional full-account backup
  is a manual step in the app (Settings → export). The per-list capture is the
  real safety net.
- **Lists shared from another user can't be deleted, only unlinked** — Prune flags
  these as `SUSPECT-LINKED`; unlink them in the app.
- Deleting a list leaves cosmetic dangling `list_ref` pointers in lists that
  referenced it.
- The local store holds your list contents in plaintext — keep it private and off
  cloud sync if your lists are sensitive.

## Contributing

Issues and PRs welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md). The one rule:
don't weaken the safety invariants (capture-before-delete, the backup gate,
delete verification).

## License

[MIT](./LICENSE). No warranty — deletion is irreversible; use the safety steps.
