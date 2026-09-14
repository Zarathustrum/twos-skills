---
name: twos-operator
description: "Operate Twos lists and items through its MCP connector or a signed-in browser session, especially reordering, moving branches, inserting nested notes, tagging, and formatting. Use for Twos UI/MCP operations on an authorized target; not for deciding what to write or for bulk list cleanup."
---

# Twos Operator

Use the shortest supported operation that preserves the user's intended list structure and item identity. This is an instruction-only operations skill for Twos/NewTwos at writethingsdown.com. It ships no scripts and does not supply browser control or a Twos connector; it assumes the environment already provides whichever of those the task needs.

## Choose the route

Honor explicit UI, Chrome, MCP, and verification choices. Otherwise:

| Intent | Preferred route | Read |
|---|---|---|
| Search/read; ordinary creation; supported text/type/tag/state updates | MCP when available | [Connector](references/mcp.md) |
| Reorder; insert between existing items; move a branch | Browser UI | [UI recipes](references/ui.md) |
| Heading/bold/rich formatting | MCP if the live write schema exposes the field (`header`, `bold`, ...); otherwise browser UI | [Connector](references/mcp.md), then [UI recipes](references/ui.md) |
| Move one flat item to a list, with no placement constraint | MCP; UI if already easier in context | Relevant route above |
| Shortcut not in a recipe | Account binding reference | [Shortcuts](references/shortcuts.md) |
| Copy/clone, sublist, day/reminder, sorting or hidden-content semantics | Inspect relevant product rule before acting | [Product semantics](references/semantics.md) |

Read only the relevant references. Do not load the full manual or both tool surfaces for every task. This skill has no dependency on any other Twos skill or CLI. When it runs inside a larger workflow (a review, an interview, a drafting step), that workflow owns what gets written and when; this skill performs the already-authorized operations without changing that workflow.

## Establish the target and scope

- Resolve the actual list and item(s), reusing current context when unambiguous. Same text can identify different records. Date-list identity needs the real date/title and ID; `today: true` alone is insufficient.
- Preserve original items for moves, reorder and formatting. Do not recreate entries, rewrite a whole list, or fabricate timestamps to simulate order.
- A branch is a parent plus its contiguous deeper-indented descendants, up to the next item at the parent's level or above. Match intended membership against actual order; indentation alone does not prove parentage after a move.
- **Collapse affects selection:** in the tested UI, selecting an expanded parent selected only itself; selecting a collapsed parent included its hidden descendants. For branch moves, explicitly select the complete group or its collapsed parent and check selection count. For parent-only edits, expand and check count one.

## Execute and verify proportionately

Use the environment's current browser-control documentation and tools. Bind the user's intended browser/session; existing handles and accessibility indexes are transient. Browser instructions are not a substitute for live tool documentation.

**First use on a new account:** keyboard bindings are per-account settings, and the ones recorded here came from one account. Before the first shortcut-driven mutation on an account this skill has not operated, confirm the specific bindings the task will use, either by reading them at `writethingsdown.com/settings/keyboard-shortcuts` (signed in) or by exercising them once on a disposable item and observing the result. Check only what the task needs; a full shortcut audit per invocation is not required. Labeled menu controls are the fallback when a binding is missing or differs.

Batch deterministic steps within a known editor or selection mode. Observe after opening a modal/navigation and before typing into its field; early input can be lost. Prefer known shortcuts or labeled controls; screenshots are for geometry or state missing from the accessibility tree.

For a simple update, read back the affected fields. For order/hierarchy changes, verify resulting sequence and indentation; for cross-list moves, verify source and destination with preserved IDs. Use MCP when identity or hidden fields matter, or when requested; a clear UI result need not always pay for a second tool surface. Never equate an unchanged `updated` timestamp with failure.

After an uncertain write, read before retrying. For an unintended recent UI change, Undo one step and inspect; one user action can create multiple undo entries. Do not blindly repeat writes or undo unknown history. Stop after two failed attempts at the same operation and report the concrete blocker.

The skill carries no standing permission to mutate sample or personal lists. Apply the current request's scope; do not add tags, reminders, sharing, settings changes or extra cleanup merely because a recipe exists. Report outcome and material verification limits briefly.

## Evidence

Recipes marked tested were exercised in one signed-in account through macOS Chrome on 2026-09-13. Settings-observed bindings and documentation-only behavior are labeled separately. Recheck when live state disagrees; do not extrapolate to mobile, native apps, Windows/Linux, or another account. [Evidence and unresolved cases](references/evidence.md) is for maintenance, not routine loading.
