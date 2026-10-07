# Twos UI recipes

Tested: one account, macOS Chrome, writethingsdown.com, 2026-09-13. `Cmd`=Command, `Option`=Alt. Load the current computer-use API before operating. The API examples below show the call shape of one runtime (`cua`, as exposed to desktop Codex during testing); they are illustrations, not a contract. Follow your environment's actual computer-use documentation and substitute only documented calls. No hardcoded tab IDs, node indexes, coordinates or hidden application endpoints.

## Selection and focus — read before item actions

Clicking item **text edits it**. The right-edge circle selects it. In observed AX rows, the first unlabeled button selected and the second was the type menu; use the current row and screenshot if ambiguous. Selected rows show a count and an action toolbar.

- Editing → `Cmd+Shift+Return` selects that item and leaves editing. Known `cua` chord: `super+shift+Return`.
- From one selected row, `Cmd+Up/Down` extends selection; reversing shrinks the anchored selection. Tested parent + two Down presses selected three items.
- Click another row's selection button to add a nonadjacent item; no modifier required. Verify count and selected rows.
- `Cmd+Escape` clears selection; **OK** is the visible fallback.
- Expanded parent selected alone = one item; collapsed parent selected alone = parent plus hidden descendants. Tested separately before moving. Explicitly select all desired descendants for a branch; check count even when only the parent is visible.
- Selection does not mean text selection. Avoid item shortcuts while a text field still owns focus. For text-only formatting, see [product semantics](semantics.md).

## Create and populate

**Tested.** New List or `Cmd+Shift+N` creates immediately and navigates to the title editor. Observe navigation and focused title field; an early state may still show the previous page with an Unnamed list sidebar link. Do not create again.

Type title → Return → inline item editor. Type one item → Return saves and opens the next editor; repeat, then Escape. New items were `dash` in the test account; respect the live default unless a specific type is requested. Return behavior is configurable; if it inserts a newline, inspect the current control rather than blindly repeating. Task/checklist requests need todo type; headings and indentation do not turn a dash into a todo.

**Literal hashtags — tested in Mac Chrome, 2026-10-07.** Typing `#` can open tag autocomplete. While suggestions are open, Enter accepts the highlighted suggestion rather than saving the item. To preserve literal text such as `newsletters to sort #1`, press Escape to dismiss suggestions, then Enter to save. Verify the saved text and tags separately. Escape followed by the composer's Add button also worked; scope that button to the composer because the page can expose multiple Add controls.

## Reorder and move branches within a list

**Tested fast path:** establish selection → `Cmd+Shift+Option+Up/Down` moves selection to top/bottom. Relative order and tabs are preserved. Nonadjacent selections become a contiguous block; retained tabs may put them under a different parent. Verify actual hierarchy.

One-position `Cmd+Option+Up/Down` is **settings-observed, not exercised**. Inspect the result if used.

**Tested drag fallback:** locate the item's left handle from a fresh screenshot and drag to the desired insertion gap. Same-list single-row drags preserved identity. Expanded-parent drag moved just the parent in the test, leaving indented children behind. Selected-group and collapsed-parent dragging remain untested; prefer explicit selection + shortcut for boundary moves.

Do not change list sort preferences to force a reorder. A tested manual reorder still reported `sort: chronological`; trust verified current sequence, not sorting by creation time.

## Cross-list move

**Tested fast path:** select scope → `Cmd+Shift+M` → observe Move picker. Confirm Move mode, type destination fragment in the field if needed, inspect exact result, click destination. **Clicking destination commits the move immediately**, with a count/destination toast; there is no later Apply step.

- Explicit parent/children group appended at destination with relative indentation 0/1/1 and IDs intact.
- Single child moved without parent appended at tabs 0; source tabs 1 restored on Undo.
- Verify source absence, destination presence, order and tabs. For reminders or clones, read [product semantics](semantics.md) first; those states were absent from test fixtures.

**Tested alternative:** drag one item's handle onto a visible sidebar list. Sidebar scroll is independent of main content, and AX can include offscreen destinations. Screenshot/scroll before using coordinates. The move picker avoids that overhead.

The picker also exposes Copy, Clone, New list, date and day destinations. Those paths were inspected, not tested. Never substitute Copy/Clone for Move.

## Insert inside an existing outline

**Tested:** click the preceding item's text → observe its editable node → explicitly put caret after the full text → Return → type the new item → Escape. The new child inherited the preceding child's tabs 1 and appeared before the next child; original text and ID stayed intact.

Observed API form, using a freshly obtained editor index:

```javascript
await tab.selectText(editorIndex, existingFullText, {selectionType: "cursor_after"});
await tab.pressKey("Return");
await tab.typeText(newText);
await tab.pressKey("Escape");
await tab.getAXState();
```

Return splits at the caret. **Do not assume clicking text or `Cmd+Right` puts it at the end.** `Cmd+Right` failed to do so through the tested runtime. An accidental split required two Undo steps: first typed content, then split/new-item creation. Observe each Undo. If inserting a sibling rather than a child, adjust the inherited tabs explicitly and verify both surrounding items.

## Indent/outdent

**Tested:** click text to edit → Tab/Shift-Tab → Escape. Changes one level while preserving text/ID. Both worked although configurable Indent/Outdent bindings were unassigned. These are editor behaviors; Tab outside editing may move focus. Recheck hierarchy of following indented items after changing a parent level.

## Heading and tag

**Header tested:** select exactly intended item → `Cmd+Option+1`; menu fallback: More → Header → OK. Readback was header=true, bold=true, same type (`dash`), ID/text/tabs. It is not a list title or sublist. Immediate Undo restored header/bold false in the fixture.

**Existing tag tested:** select item → Tag → choose existing tag → Apply → OK. Tag option's AX text did not reflect checked state; screenshot showed checkbox state. Readback confirmed the chosen tag on the original item, without changing its text. The shortcut `Cmd+Shift+T` is settings-observed; menu route was exercised. Adding a tag must preserve other existing tags.

Other More controls observed: Photo, Star, Cancel, Link, Note, Remember, Google, Bold, Italic, Underline, Highlight, Text Color, Subheader, Quote, Code, Focus. Visibility is not proof of tested behavior or entitlement.

## Search and navigation

**Tested:** `Cmd+/` → observe focused search field → type query → Lists filter for list navigation → inspect destination title. Default All also matches item contents. Typing immediately after opening search was lost once; waiting for the state observation fixed it.

To close: focus search field, Escape clears a nonempty query; Escape again closes. Escape from the Lists filter button did not close search in the test. Avoid opening unrelated results merely because they match a broad term.

Side-panel/list-opening gestures are recorded in [shortcuts](shortcuts.md), but not exercised. Do not assume a second panel's list is the active keyboard target.

## Undo and verification

**Collapsed content — tested in Mac Chrome, 2026-10-07.** Browser DOM and accessibility inspection may omit collapsed descendants. Do not treat a lower rendered-row count as evidence of deletion. For preservation checks, expand the affected current-list branches and compare item IDs, text, order and indentation against the baseline. Do not expand linked-list destinations merely to count current-list items. When connector use is permitted, a complete list read can verify membership without changing collapse state. See [test evidence](evidence.md#october-7-2026-composer-and-rendered-content-checks).

**Tested same-session immediate Cmd+Z:** single-item keyboard/drag reorder, nonadjacent reorder, group/single-child cross-list move, heading format, text insertion and split. Inspect each result; no guarantee across reloads, after unrelated work, or for untested actions. Redo is settings-observed only.

Selection-toolbar four unlabeled icons visually read up/down/outdent/indent; they were not clicked. Prefer tested shortcuts instead of inferring an action from an index. On stale-page errors, reacquire state and target; never repeat New List or a write simply because its first observation lagged.
