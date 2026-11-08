---
name: whenmeets-verify
description: Run DayMeet's project verification before committing, when asked to verify changes, or when a task requests /verify in this repository.
---

# DayMeet verification

Read `.claude/commands/verify.md` from the repository root and follow its current procedure. It is the shared workflow for Claude and Codex; do not copy its steps here.

Run `npm run verify` from the repository root. If the user requested build verification, also run `npm run build` in the foreground after verification passes. Report actual results and unresolved blockers. Do not weaken checks, add lint suppressions, or update warning limits to make a failure pass.
