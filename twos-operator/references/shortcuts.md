# Twos account keyboard bindings

Source: https://writethingsdown.com/settings/keyboard-shortcuts
Observed in one signed-in NewTwos Chrome session on macOS, September 13, 2026. The settings page requires sign-in. These are configurable per-account bindings, not universal defaults; confirm the bindings a task needs on any other account before relying on them (see the first-use check in SKILL.md).

## Notation and context

Cmd=⌘; Shift=⇧; Option=⌥; Control=⌃; Return=⏎; Backspace=⌫; Space=␣. Unassigned means the page displayed “Assign.”

Identify the active list, intended item(s), selection, and editor focus before acting. Chrome or an input field may handle the same keys. Categories follow the settings page. Use [UI recipes](ui.md) for tested focus and selection requirements; a listed binding alone does not prove it works in every context.

- Thing actions: target the intended item(s). The row selection control exposes an action toolbar and selection count.
- Inline formatting: target the item or text selection as appropriate; exact whole-item versus selected-text behavior is not fully tested.
- List actions: confirm the intended list is active.
- Navigation/general: inspect results; browser shortcuts and input focus can affect routing.
- Modifier gestures: apply while dragging an item or clicking a list link.
- Refresh UI state after actions. Use focused connector verification when appropriate; preserve original IDs for moves/formatting.
- Listed bindings were read from settings. Most keyboard bindings have not been exercised.

## Thing actions

| Action | Keys |
|---|---|
| Complete/uncomplete | Cmd+D |
| Cancel/uncancel | Cmd+Shift+D |
| Star/unstar | Cmd+Shift+S |
| Move to list | Cmd+Shift+M |
| Move a copy to list | Cmd+Shift+Option+M |
| Duplicate thing | Cmd+Control+Option+D |
| Copy while dragging | Cmd+drag |
| Clone while dragging | Option+drag |
| Move to Today | Cmd+Shift+O |
| Move to Tomorrow | Cmd+Shift+P |
| Copy to Today | Cmd+Shift+Option+O |
| Copy to Tomorrow | Cmd+Shift+Option+P |
| Share | Cmd+E |
| Sublist (promote / undo) | Cmd+Shift+K |
| Open sublist | Cmd+. |
| Join | Cmd+J |
| Split | Cmd+Shift+J |
| Set reminder | Cmd+Shift+X |
| Memory | Cmd+Shift+Y |
| Focus timer | Cmd+Option+F |
| Google search | Cmd+Option+G |
| Ask AI | Cmd+Option+A |
| Thing info | Cmd+Shift+I |
| Move thing up | Cmd+Option+↑ |
| Move thing down | Cmd+Option+↓ |
| Move thing to top | Cmd+Shift+Option+↑ |
| Move thing to bottom | Cmd+Shift+Option+↓ |
| Delete | Backspace |
| Indent | Unassigned |
| Outdent | Unassigned |
| Select all in list | Cmd+A |
| Clear selection | Cmd+Esc |
| Extend selection up | Cmd+↑ |
| Extend selection down | Cmd+↓ |
| Select this thing | Cmd+Shift+Return |
| Select & extend up | Unassigned |
| Select & extend down | Unassigned |
| Copy text to clipboard | Cmd+C |
| Add hashtag | Cmd+Shift+T |
| Note | Cmd+Option+N |

Tested editor behavior: click existing item text → Tab / Shift+Tab → Escape indents/outdents one level, preserving ID/text. Both work despite the configurable commands being unassigned. Tab outside editing remains untested. Cmd+Shift+Return, selection extension, clear selection, boundary reorder and the Move picker were also exercised; see UI recipes.

Copy/duplicate are documented as independent objects; clone as synchronized appearances. Neither write path was live-tested. See [product semantics](semantics.md) before using modifier drags; Option-drag may fall back to Move without the required entitlement.

## Inline formatting

| Action | Keys |
|---|---|
| Header | Cmd+Option+1 |
| Subheader | Cmd+Option+2 |
| Quote | Cmd+Option+' |
| Code | Cmd+Option+C |
| Bold | Cmd+B |
| Italic | Cmd+I |
| Underline | Cmd+U |
| Strikethrough text | Cmd+Shift+Option+X |
| Inline code | Cmd+Shift+Option+E |
| Highlight | Cmd+Shift+H |
| Highlight color picker | Cmd+Shift+Option+H |
| Text color picker | Cmd+Shift+Option+F |
| Hyperlink | Cmd+Option+K |
| Strip hyperlink | Cmd+Shift+Option+K |
| Toggle link preview | Cmd+Shift+L |

Tested heading semantics: explicit item selection → Cmd+Option+1, or More → Header, preserved ID/text and produced header: true, bold: true, with type: "dash" unchanged. Other formatting bindings remain settings-observed. Whole-item vs selected-text behavior must be distinguished; header is not a list title or sublist.

## List actions

| Action | Keys |
|---|---|
| Search this list | Cmd+Option+/ |
| Share list | Cmd+Option+E |
| Delete list | Cmd+Option+Backspace |
| Expand / collapse all sublists | Cmd+Option+T |
| Bookmark / unbookmark list | Cmd+Option+B |
| Add list to another list | Cmd+Shift+U |
| Auto-sort list | Cmd+Option+Y |
| List settings | Cmd+Option+, |
| Go to parent list | Cmd+Option+. |
| Archive / unarchive list | Cmd+Shift+Option+A |

## Opening lists

| Destination | Gesture on list link |
|---|---|
| Side panel | Shift+click |
| Twos tab | Option+click |
| New browser tab | Cmd+click |

## Navigation

| Action | Keys |
|---|---|
| Toggle sidebar | Cmd+\ |
| Toggle side panel | Cmd+Option+\ |
| Open chat panel | Cmd+Shift+Option+C |
| Open timeline panel | Cmd+Shift+Option+T |
| Open list panel | Cmd+Shift+Option+L |
| Open outline panel | Cmd+Shift+Option+U |
| Open capture bar | Cmd+K |
| Expand input | Cmd+Shift+F |
| Search | Cmd+/ |
| New list | Cmd+Shift+N |
| Notifications | Cmd+Shift+A |
| Switch account (cycle) | Cmd+' |
| Go to nav position 1–9 | Cmd+1 through Cmd+9 respectively |
| Go to start view | Cmd+Shift+Space |
| Go to quick view | Cmd+Shift+0 |
| Go to settings | Cmd+, |
| Go back | Cmd+[ |
| Go forward | Cmd+] |
| Previous day | Cmd+Shift+← |
| Next day | Cmd+Shift+→ |

Navigation numbers identify positions, not fixed destinations. Observed sidebar: 1 Capture; 2 Lists; 3 Today; 4 Home; 5 Things; 6 Stars; 7 To-dos; 8 Feed. Position 9 was not shown. Recheck current mapping.

## General

| Action | Keys |
|---|---|
| Undo | Cmd+Z |
| Redo | Cmd+Shift+Z |

## Additional tested input flows and limits

- New List clicked → title editor: type title, Return → inline item editor.
- Inline new-item editor: type item, Return → saves item and opens next editor; Escape exits editing.
- These flows were tested through Chrome. Return at an existing caret splits a thing; explicit end-of-text anchoring inserts after it. Return behavior in multiline fields or other editor modes was not tested. Immediate Undo was exercised; Redo was only observed in settings.
- No shortcut settings were changed or saved during capture.
- Windows/Linux equivalents were not inspected. Do not mechanically replace Cmd with Control and claim verification.
