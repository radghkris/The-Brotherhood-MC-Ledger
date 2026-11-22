# Handoff — The Brotherhood MC Ledger

Paste or attach this to start the project's coordinator in a new session or Claude project.

## What this is

A clean-slate ledger app for The Brotherhood MC, which is starting back up. It replaces
Kris's old Excel sheet (not imported; balance starts at $0). The app runs locally first and
can be hosted later for several users on different computers.

- Repo: `radghkris/The-Brotherhood-MC-Ledger` (default branch `main`)
- Design (approved 2026-11-22): `docs/superpowers/specs/2026-11-22-ledger-design.md`
- Thread 1 plan: `docs/superpowers/plans/2026-11-22-foundation.md`
- Workflow rules: `CLAUDE.md`. Merge lock: `CURRENTLY_WORKING.md`

## Decisions made

- Approach: a self-contained web app with its own database (Kris picked option 1 of 3).
- Stack: Node 22 + TypeScript + Express + SQLite (better-sqlite3) + React/Vite. Docker for
  hosting later.
- Roles: `admin` (President and Treasurer), `officer` (adds entries), `member` (view only:
  balance, ledger, own cuts and loans).
- Whole dollars only. When a haul split has leftover dollars, they stay with the MC. The
  MC takes 1 cut by default.
- Entries are voided, never deleted. Every change goes to `audit_log`. Every entry needs
  received-by and approved-by.
- A withdrawal can't take the balance below $0 without Admin confirmation.
- Migration numbers are reserved per thread: 0001 foundation, 0002 ledger, 0003 roster,
  0004 hauls, 0005 loans.

## Working rules (from Kris's preferences)

- Coordinator plans, splits work into threads and queues merges. It doesn't write product
  code. Coordinator model: Haiku, low effort.
- Thread models: docs on Haiku-Med, coding on Sonnet-Med, Blender rendering on Opus-Med.
- **"mwr"** = merge when ready, nothing else. Merge the clean PR under the
  `CURRENTLY_WORKING.md` lock.
- **"tc"** in a thread = "tell the coordinator I'm ready to merge," and it counts as the mwr
  go-ahead. The thread messages the coordinator. The coordinator checks the lock and tells
  threads to merge one at a time. Threads don't poll the lock. After merging and releasing
  the lock, the thread reports back.
- No PRs are created unless the work calls for one: each thread opens exactly one.

## Build plan and status

| # | Thread | Depends on | Status |
|---|--------|------------|--------|
| 1 | Foundation: scaffold, DB, auth/sessions, roles, web shell | — | **In progress** (session `session_01P2hfnae3BRaxgkbT7Cbqcr`, branch `claude/thread-1-foundation`) |
| 2 | Ledger: entries, running balance, void, audit, CSV/Excel export | 1 | Not started; needs a plan |
| 3 | Roster and users: members, ranks, user admin | 1 | Not started; needs a plan |
| 4 | Haul splitter: preview, post deposit and payouts to the ledger | 2, 3 | Not started |
| 5 | Loans: either direction, repayments, outstanding balances | 2, 3 | Not started |
| 6 | Dashboard, backup download, Dockerfile, hosting guide | 2–5 | Not started |

Threads 2 and 3 can run in parallel once 1 merges.

## Next steps for the coordinator

1. Wait for Thread 1's PR. When Kris says "tc" there, check the lock and tell it to merge.
2. After Thread 1 merges, write plans for Threads 2 and 3 (superpowers:writing-plans, saved
   to `docs/superpowers/plans/`), get Kris's OK, and start them as Sonnet-Med sessions.
3. Keep the status table in this file and in `CLAUDE.md` current.

## Merge lock state

`CURRENTLY_WORKING.md`: **FREE**, queue empty.
