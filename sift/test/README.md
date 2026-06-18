# Sift classification regression

Sift's only model-driven step is the title→bucket classification. These fixtures
pin its expected behaviour so "tested on model X" is a checkable claim, not a
comment.

## Run

1. Feed a fixture's `lists[]` titles to the model using the **exact**
   `classify-plan --cheap` instruction (judge from the title alone; `no-match`
   only on a positive non-fit signal; vague/might-fit → `uncertain`, never
   `no-match`).
2. Collect the model's verdicts as either a directory of `<id>.json` files
   (`{id,bucket,...}` — the skill's real `raw/verdicts/` output) or one JSON
   array of `{id,bucket}`.
3. Grade:
   ```bash
   node score.mjs fixtures/personal-private.json <verdicts-dir-or-file>
   node score.mjs fixtures/throwaway-scratch.json <verdicts-dir-or-file>
   ```
   Pass (exit 0) = every pinned title's bucket is within its `accept` set **and**
   zero **wide-net violations** (no list dropped into `no-match` when `no-match`
   isn't accepted — the failure the cheap-path prompt guards against).

## Fixtures

- **personal-private.json** — clean criterion, strong answer key. The gate: clear
  private titles must be `match`, contentless titles must not be `no-match`, work
  titles must not be `match`.
- **throwaway-scratch.json** — fuzzy criterion, deliberately permissive key. A
  *variance probe*, not a strict accuracy gate: it pins only the defensible
  invariants (contentless/ephemeral → not `no-match`; sensitive/ongoing → not
  `match`) and leaves the contestable middle unconstrained. This is the fixture
  that exposed pre-tightening over-confidence.

`accept` semantics: an item whose `accept` lists all three buckets is unconstrained
(coverage only). Genuinely ambiguous titles get wide accept sets on purpose — the
test asserts invariants, not a single "true" bucket on contestable cases.

## Validation record

- **2026-06-18** — cheap path, Opus 4.8 and Sonnet 4.6:
  - `personal-private.json`: both **35/35** within-accept, **0** wide-net violations.
  - `throwaway-scratch.json` (shipped/tightened prompt): both **26/26**, **0**
    wide-net violations. Cross-model agreement rose **25/39 → 34/39** vs the older
    prompt, which left Opus with 1 wide-net violation (`Sprint 24 backlog`). The
    tightening pulled Opus's over-confident `no-match` calls into `uncertain`;
    Sonnet already complied.
