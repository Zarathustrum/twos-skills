# Evidence and maintenance

Evidence date: 2026-09-13 Pacific / 2026-09-14 UTC. Environment: one signed-in Twos/NewTwos account in macOS Chrome, driven by desktop Codex with a computer-use tool, plus the Twos MCP connector for readback. All exploration writes used the browser UI on disposable test lists; connector schemas were inspected and MCP reads verified identity, fields and order. No benchmark establishes daily-use speed.

Evidence levels: **tested** = exercised through UI with observed outcome/readback; **settings-observed** = binding or control seen, action not necessarily exercised; **documentation-derived** = source claim, not a live guarantee. Preserve this distinction when updating a recipe.

## What the exploration established

Findings that shaped the recipes, in the order they were discovered:

1. Collapse state changes selection scope: an expanded parent selected alone was one item; a collapsed parent selected alone included its hidden descendants. Moving an expanded parent by shortcut or drag left its indented children behind.
2. Branch membership is contiguous order plus deeper indentation; preserving a numeric `tabs` value does not by itself preserve parentage after a move.
3. Explicit parent+children selection moved as a group within and across lists with IDs, relative order and indentation intact.
4. A lone child moved across lists landed at top level with its ID intact; Undo restored position and indentation.
5. Insertion depends on exact caret placement; Return splits at the caret; `Cmd+Right` did not reliably reach end-of-text through the tested runtime; explicit end anchoring worked and the new item inherited indentation.
6. Focus governs shortcuts: `Cmd+Shift+Return` left editing for selection; `Cmd+Up/Down` extended or shrank selection; typing immediately after opening global search was lost once.
7. Editor Tab/Shift-Tab changed indentation despite unassigned Indent/Outdent bindings in settings.
8. Header produced `header: true` and `bold: true` on the same record without changing text, type, indentation or ID.
9. Same-session immediate Undo reversed every tested reorder, move, format and insert/split; an accidental split followed by typing needed two Undo steps.
10. `updated` timestamps are not evidence: some UI changes left them unchanged; one reorder changed timestamps on unselected items.
11. MCP was schema-inspected, not comprehensively write-tested: no reorder/index/header/bold fields; `tags` replaces the array; write enums accepted `note` where reads showed `none`.
12. Connector deletion was described as permanent; UI Trash is documented as recoverable. The two are not equivalent.

## Validation run

One independent forward test, 2026-09-13: a fresh agent received only this skill and the task "move a parent and its three children to the top of a disposable test list through Chrome, verify through MCP, then restore the original state," with no prior conversation or intended solution.

Result: passed in roughly 45 seconds. It loaded `SKILL.md`, `ui.md` and `mcp.md` only; explicitly selected four items; preserved IDs, relative order, indentation and substantive fields; Undo restored the complete MCP readback exactly. Six browser round trips, seven UI actions, four MCP reads, no screenshots, no retries.

This is a single successful execution of one recipe. It is not a speed benchmark and does not validate the other recipes.

## Public sources

[Documentation](https://writethingsdown.com/docs) and the [account shortcuts page](https://writethingsdown.com/settings/keyboard-shortcuts) (requires sign-in). Visiting account settings is not permission to change them.

## Unresolved

Selected-group drag, collapsed-parent drag, Shift-click ranges, side-panel focus/moves, sublist promotion/reversal, completion propagation, reminders/day moves, copy/clone, reload/offline recovery, Windows/Linux bindings, mobile and native apps. Discover only what the current authorized task needs. A test-list name is not permanent mutation permission.

## Extending the evidence

Use an authorized disposable list, record its live baseline and expected result, then verify IDs, order and fields. Useful cases: move expanded/collapsed branch; insert a middle child; add a tag without removing existing tags; cross-list child vs branch; Undo an accidental split; obey explicit UI-only/MCP-only routing. Measure cold setup separately from repeated action latency. A successful test of one case is not proof of the rest.

## October 7, 2026: composer and rendered-content checks

Tested through Chrome control at twosapp.com on macOS, using synthetic content in a newly created disposable list. These are operating procedures, not workarounds for the separately observed movement defect.

- **Literal hashtags:** With tag suggestions open for `TEST enter hashtag #1`, Enter selected the first suggestion, removed `#1` from the draft, and did not save an item. Saving that draft produced the selected tag. Escape followed by Enter, and Escape followed by the composer Add button, each saved literal `#1` text without a tag. Suggestion names and order are account-specific.
- **Rendered content:** An eight-item fixture showed six DOM rows after collapsing a parent with two children. Selecting that parent counted three items. Expanding it restored the same eight IDs, sequence, text and indentation. Rendered row counts measure visible content, not complete list membership.

These tests do not establish behavior on other platforms or a connection to rollover Copy or the fixed July Move defect.
