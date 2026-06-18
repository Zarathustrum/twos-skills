# Twos Sift

Find the Twos lists that match a criterion you describe — "looks personal",
"stale / untouched in a year", "work", "duplicates" — turn them into a
**browsable HTML review surface**, and track your progress by crossing out the
ones you've queued for removal.

> The front half of the prune workflow. **Sift** finds candidates; you curate
> them into a master list; **[twos-prune](../twos-prune)** captures + removes
> them. A Claude skill; plain-Node scripts; uses the claude.ai Twos connector.

## TL;DR

1. Give a criterion. A keyword prefilter buckets the obvious lists for free, and
   Claude judges the rest from their titles — sorting everything into buckets.
2. A script builds clickable HTML pages, grouped by bucket, with each list's
   one-line rationale.
3. You browse, and link the ones you want gone into **`Lists to prune`** (or
   `Lists to keep`) in the Twos app.
4. Re-run the build: anything in the prune list — **directly or via a parent
   container** — shows **struck through red**; kept lists show struck grey;
   everything else is still "to review". Repeat until you've triaged the account,
   then run twos-prune.

## How the work splits

Only the assistant can reach the Twos connector, so it makes the calls. The
script does enumeration planning, the **keyword prefilter**, the classification
cache, the prune/keep **closure walk**, and HTML generation. The single
model-driven step is judging the lists the prefilter didn't settle — by default
from their **titles**, in batches — into a bucket + a one-line rationale, all
**cached** so re-scans only touch new lists.

**On token cost (honest):** classification is the only model-driven step, and
it's kept cheap by two levers. A **keyword prefilter** (patterns the model
proposes once) auto-buckets the obvious titles deterministically — zero model
calls. The leftover **residue is judged from titles alone, in batches** (no
list-body reads). For a big account that's often a handful of messages instead of
hundreds of reads. The trade is precision: title-only sifting mislabels some
lists, which you catch on the review surface (nothing here deletes anything). Need
more precision? Drop the cheap flag to read a sample per list. Results are cached,
so re-scans only touch new lists.

## Cross-out semantics

A list is **struck red** if it is in the `Lists to prune` closure — itself, or
reachable through any chain of sub-list links under it (so a list inside a
container you queued is also struck). **Struck grey** if it's in the `Lists to
keep` closure. Otherwise it's live ("to review"). Decisions live in Twos (the two
master lists), so they travel with your account, and `build` always reflects
current state — rebuilding never loses your strikes.

## Store layout (`./twos-sift-store/`, override `TWOS_SIFT_STORE`)

```
config.json              criterion + prune/keep master ids + bucket names
prefilter.json           keyword patterns {match,no_match} the model proposes once
raw/list_index/<page>    saved list_lists pages (enumeration)
raw/verdicts/<id>.json   one classification verdict per list (the model's output)
raw/get_list/<id>.json   master + container sub-list reads (for the closure)
classifications.json     cached, deduped verdicts
prune-set.json / keep-set.json   transitive membership of each master
html/index.html + <bucket>.html  the browsable review surface
remaining-to-assess.json the still-undecided lists (drives your next pass)
```

To override the store location, set `TWOS_SIFT_STORE` for your shell:

```bash
export TWOS_SIFT_STORE=/path/to/store        # bash / zsh (macOS, Linux)
set TWOS_SIFT_STORE=C:\path\to\store          # Windows cmd.exe
$env:TWOS_SIFT_STORE = "C:\path\to\store"     # Windows PowerShell
```

## Commands

```bash
node scripts/sift.mjs prefilter           # free: auto-bucket obvious titles by keyword
node scripts/sift.mjs classify-plan --cheap  # judge the residue from titles (batched)
node scripts/sift.mjs ingest              # fold verdicts -> classifications.json
node scripts/sift.mjs closure             # walk prune/keep masters -> sets
node scripts/sift.mjs build               # generate html/ + remaining-to-assess
```

`classify-plan` without `--cheap` reads a sample per list (slower, more precise).

See `SKILL.md` for the fetch-and-save steps the assistant follows between these.

## Notes

- Classification is opinionated and can be wrong — the output is a review surface
  you correct, not an auto-action. Nothing is deleted here; removal is twos-prune.
- Buckets are configurable (default `match` / `uncertain` / `no-match`).
- Same sensitivity caveat as twos-prune: the store holds list metadata + your
  rationales; keep it private if the criterion is sensitive.

## License

Share freely. No warranty.
