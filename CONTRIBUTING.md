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

## Classification regression (Sift)

Sift's only model-driven step is the title→bucket classification. `sift/test/`
pins its expected behaviour against golden fixtures so prompt or model changes are
checkable. Feed a fixture's titles to the model with the `classify-plan --cheap`
instruction, collect the verdicts, then grade:

```bash
node sift/test/score.mjs sift/test/fixtures/personal-private.json <verdicts>
```

A change to the classification prompt must keep `personal-private.json` at full
within-accept with zero wide-net violations on every model you claim support for,
and must not introduce wide-net violations on `throwaway-scratch.json`. See
`sift/test/README.md`.

## Execution trial (Prune)

Prune has no model judgement — its model surface is procedural: follow the gates in
order, save each connector result to the right path, and stop on anomalies. To
validate a model on the permanent-delete path, `prune/test/` drives it through a
synthetic store with planted anomalies (a freshness MISMATCH and a SUSPECT-LINKED
list), then asserts the outcome:

```bash
node prune/test/seed-trial.mjs /tmp/trial   # stage a clean store
# drive a model subagent through the procedure (see prune/test/README.md)
node prune/test/check.mjs /tmp/trial         # PASS = all gate/anomaly invariants held
```

A model is "validated for Prune" only if `check.mjs` PASSes across a few runs (it's
a stochastic agent, not a pure function). See `prune/test/README.md`.

## Style

- Plain Node ESM (v18+), no dependencies. Keep it that way unless there's a strong
  reason.
- Scripts do the work and print short summaries; the assistant (via `SKILL.md`)
  only orchestrates. Don't move logic into the model that a script can do
  deterministically.
- Match the existing terse comment style.

## Scope

**Sift and Prune** capture and remove lists. Merging, editing, or reorganizing
lists is out of scope for them — don't add it there.

**Operator** (`twos-operator/`) is where editing and reorganizing live. It is an
instruction-only Codex skill with no scripts and no delete path. When changing
it, keep each recipe's evidence label (tested / settings-observed /
documentation-derived) accurate, and don't promote an observed binding to
"tested" without exercising it on a disposable list and checking readback.
Record new findings in `twos-operator/references/evidence.md` without personal
paths, account details, or live object IDs.
