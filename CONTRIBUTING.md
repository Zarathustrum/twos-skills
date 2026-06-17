# Contributing

Thanks for helping improve these skills. They delete data permanently, so the bar
for changes is "obviously safe."

## Non-negotiable safety invariants

Do not weaken any of these:

- **Capture before delete.** `prune delete-plan` must refuse to plan deleting any
  list that lacks a local capture backup. No override.
- **Backup gate.** Deletion requires a recorded decision (`ack --done` or
  `ack --skip "..."`). No silent default.
- **Verify every delete**, and flag lists that survive a delete as
  `SUSPECT-LINKED` rather than assuming success.
- **Sift never deletes.** It only produces a review surface.

A PR that touches the delete path should explain how it preserves these.

## Running / testing without an account

The scripts are deterministic and operate on local files, so you can test them
offline by hand-writing the `raw/...` inputs a connector would produce. Each
script's header comments document the expected file paths. A good smoke test:

1. Write a `config.json` and a few `raw/get_list/<id>.json` fixtures.
2. Run the relevant subcommand and assert on its summary output and generated
   files (closure, manifest, HTML strikes, the gate's REFUSED path).

Keep fixtures synthetic — never commit real Twos data (the `.gitignore` excludes
the `*-store/` dirs for this reason).

## Style

- Plain Node ESM (v18+), no dependencies. Keep it that way unless there's a strong
  reason.
- Scripts do the work and print short summaries; the assistant (via `SKILL.md`)
  only orchestrates. Don't move logic into the model that a script can do
  deterministically.
- Match the existing terse comment style.

## Scope

These skills capture and remove lists. Merging, editing, or reorganizing lists is
out of scope — propose those as separate tools.
