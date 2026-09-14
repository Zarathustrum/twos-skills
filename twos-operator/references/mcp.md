# Twos connector use

Schema-inspected 2026-09-13; the exploration used readback only. **Supported by schema does not mean live write behavior was tested.** Discover the installed tool names and exact schema; prefixes vary by host. During testing the tools were exposed to Codex as `mcp__codex_apps__twos_*`; other hosts name the same connector differently.

## Surface and routing

| Family | Observed tools / capability |
|---|---|
| Read | search, fetch, list_lists, get_list, list_things, get_thing, list_tags, list_reminders |
| List writes | create_list(title, emoji); update_list(id, title, emoji, favorited, archived); delete_list |
| Item writes | create_thing(list_id, text, type, tabs, tags, url, completed); update_thing(id, text, type, tabs, tags, url, completed, canceled, favorited, list_id); delete_thing |
| Reminders | set_reminder, remove_reminder; read current schema for scheduling fields |

No insertion index, reorder, sublist or clone write fields were exposed. Use the UI for those intents. `update_thing(list_id=...)` supports a flat move but does not establish UI-equivalent descendant handling; use UI group selection for branch movement.

**Formatting fields vary by connector build.** The schema inspected through Codex on 2026-09-13 exposed no `header`, `bold` or `note` write fields; the claude.ai connector inspected on 2026-09-14 exposes `header`, `subheader`, `bold`, `italic`, `underline`, `quote`, `code` and `note` on `create_thing`, `update_thing` and `update_things`. Read the live schema: if the field is present, a formatting-only request is an ordinary field update (send only that field; read back `header`/`bold`, text, type, tabs and ID). If absent, use the UI recipe. Neither path was live write-tested through MCP.

`create_thing`/`update_thing` accepted **note**, while prose and read enums also used **none**. Follow the live callable write schema; do not send an enum copied from a read response. Choose todo for an actual task, dash for explicitly outlined notes; otherwise respect the requested/live default.

## Identity and minimal updates

- Search/list results locate candidates; fetch the actual list/item before a consequential identity-sensitive edit. Disambiguate repeated titles/text using destination, date and IDs.
- `today: true` is a day-list flag in observed data, not sufficient proof of today's date. Resolve exact requested day in the user's timezone; do not relabel a historical day or infer title from a flag.
- Send only fields intended to change. `tags` **replaces** the tag array: add by union with current tags, remove only requested tag. Do not auto-add a tag merely because earlier fixtures in the same session used one.
- Keep create operations serial when order/nesting matters. Use explicit tabs for a requested outline; parent first, then contiguous children. Before continuing an interrupted group, reread surrounding entries: another writer may have inserted a new parent.
- Inspect error/partial output before retrying. For uncertain creation, search/read the destination to avoid duplicates. Schema metadata alone is not proof of a working connection.

## Readback

`get_list` returned list, ordered things and reminders; `get_thing` returned the individual record. Responses may expose structured content plus duplicate JSON text: prefer structured content and emit only needed fields.

Check text, ID, list_id, type, tabs, tags and modified state as applicable. Readback also included header/bold/note/clone fields absent from write schemas; absence of an optional read field means unknown, not false. Structural operations need array order and adjoining indentation. Source/destination reads are independent and may be batched.

UI changes sometimes left `updated` unchanged; a later reorder updated timestamps on unselected items too. Timestamps alone establish neither success nor unintended content changes. Manual order persisted while list sort still said chronological. Do not resort the returned array by created/updated timestamps or retry based only on timestamps. If UI and connector disagree, refresh the affected state once and resolve the discrepancy before another write.

Deletion tools were described as permanent; UI documentation describes recoverable Trash. Do not treat them as equivalent, or use deletion to implement moves. Consult current tool semantics and the user's actual authorization before deleting.
