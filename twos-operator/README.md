# Twos Operator

Operate a [Twos](https://www.twosapp.com) account through its MCP connector
and, when the connector can't express the change, a signed-in browser session:
reorder items, move a parent with its children, insert a note inside an
existing outline, tag, indent, apply a heading. Preserve item identity instead
of recreating entries.

> **Experimental.** A [Codex](https://developers.openai.com/codex) instruction
> skill, tested in one environment (below). The sibling skills
> [Sift](../sift) and [Prune](../prune) are Claude skills for account cleanup
> and don't share machinery with this one.

## What it is — and isn't

This is an **instruction skill**: a `SKILL.md` plus focused references that
tell an agent how Twos actually behaves under selection, focus, collapse,
drag and shortcut operations, and how to route between the connector and the
UI. It ships **no scripts** and installs **no tools**. It does not provide:

- browser control — the agent must already have a computer-use / browser tool
  and a Chrome session signed into `writethingsdown.com`;
- a Twos connector — the agent must already have the Twos MCP tools;
- any authorization — it acts only within the scope of the current request.

Codex environments differ. Desktop Codex exposed a computer-use tool during
testing; **CLI Codex may not have an equivalent**, and the MCP tool names vary
by host. The skill tells the agent to discover what's available and to follow
the environment's own tool documentation rather than assuming either surface.

## What's inside

| File | Role | Loaded when |
|---|---|---|
| `SKILL.md` | Routing (MCP vs UI), scope rules, verification, evidence policy | always |
| `references/ui.md` | Tested browser recipes: selection/focus, reorder, branch move, cross-list move, insert, indent, header, tag, search, Undo | UI work |
| `references/mcp.md` | Connector surface as schema-inspected, identity/minimal-update rules, readback pitfalls | connector work |
| `references/shortcuts.md` | Every captured account binding, by category, with tested/observed labels | a shortcut not in a recipe |
| `references/semantics.md` | Documentation-derived product rules (sublists, clone, sort, carry-over, reminders, trash) | unusual operations |
| `references/evidence.md` | Sanitized findings, the one validation run, unresolved cases | maintenance |
| `agents/openai.yaml` | Codex UI metadata | n/a |

## Prerequisites

- A Codex runtime that loads skills (see Install).
- The **Twos MCP connector** configured in that runtime, for reads and simple
  writes.
- For reorder / branch move / insert / formatting: a **computer-use or browser
  tool** and a Chrome tab signed into `writethingsdown.com`.
- Your account's keyboard bindings, if you'll drive shortcuts. The captured
  bindings are one account's settings; the skill asks the agent to confirm the
  relevant ones on first use.

## Install

Codex loads skills from a set of directories. As of this writing the
[official docs](https://developers.openai.com/codex/skills) list
`$HOME/.agents/skills` for personal skills and `<repo>/.agents/skills` for
repo-local ones; older installs use `~/.codex/skills`. Check the docs for your
version rather than trusting this paragraph.

Copy or symlink this folder into one of those locations, keeping the folder
name:

```bash
cp -R twos-operator "$HOME/.agents/skills/twos-operator"   # or ~/.codex/skills
```

Restart Codex if the skill doesn't appear. Codex's `$skill-installer` can also
fetch skills from a repository; its exact syntax is in the same docs.

## Invocation

Explicit: `$twos-operator` in the prompt. Implicit selection is enabled, so
Twos-operation requests should also route here on their own.

Examples:

- `$twos-operator move "Q3 goals" and its sub-items to the top of the Planning list, verify through MCP`
- `$twos-operator insert "call the vet" after "groceries" inside Saturday, same indent`
- `$twos-operator tag the three items I just mentioned with #followup, keep their existing tags`
- `$twos-operator make "Open questions" a header — UI only, don't touch anything else`

The skill honors explicit UI-only / MCP-only / verify-via-X instructions.

## Tested environment

- macOS, Chrome, `writethingsdown.com` (NewTwos web UI), 2026-09-13.
- Desktop Codex with a computer-use tool; Twos MCP connector for readback.
- One account, disposable test lists.

Not tested: Windows, Linux, mobile, native apps, other browsers, other
accounts' bindings, or any MCP host other than the one above.

## Evidence limits

Every recipe carries one of three labels: **tested** (exercised, readback
checked), **settings-observed** (binding seen in settings, not exercised), or
**documentation-derived**. One independent forward test passed (a four-item
branch move with MCP verification and Undo restore, ~45 s); that validates one
recipe, not the set. See [`references/evidence.md`](./references/evidence.md)
for what was established and what remains unresolved.

No behavioral test suite is included. Static checks (frontmatter, links,
sanitization) were run before publication; nothing here exercises a live
account.

## Safety posture

- No standing permission: the skill applies the current request's scope and
  adds nothing (tags, reminders, cleanup) because a recipe exists.
- Moves and formatting preserve original IDs; the agent never recreates items
  to simulate an operation.
- Stop after two failed attempts at the same operation and report.
- Connector deletion and UI Trash are treated as different things; the skill
  never uses deletion to implement a move.

## License

[MIT](../LICENSE), same as the rest of this repository.
