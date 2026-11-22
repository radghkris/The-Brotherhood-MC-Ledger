# The Brotherhood MC Ledger

A clean-slate ledger app for The Brotherhood MC: transactions, running balance, haul
splitting, member loans and the club roster. It runs locally first and can be hosted
later for several users on different computers.

## Project structure (multi-thread)

This project is run by a **coordinator** session plus **work threads**.

- **Coordinator**: plans the work, splits it into threads, and queues merges. It does not
  write product code.
- **Threads**: each one owns one task on its own branch and opens one PR.

### Thread models

| Work | Model / effort |
|------|----------------|
| Coordinator | Haiku, low |
| Basic documentation | Haiku, medium |
| Coding | Sonnet, medium |
| Blender rendering | Opus, medium |

These stay as listed unless Kris says otherwise.

### Merge lock (`CURRENTLY_WORKING.md`)

Only one merge into `main` happens at a time. The lock is `CURRENTLY_WORKING.md` at the
repo root.

1. A thread finishes its PR and gets the go-ahead: Kris says **"mwr"** (merge when ready)
   or **"tc"** (tell the coordinator I'm ready to merge).
2. On "tc", the thread tells the coordinator its PR is ready. Threads do **not** poll the
   lock on a timer.
3. The coordinator checks the lock. If it's free, the coordinator tells the thread to merge.
   If it isn't, the coordinator queues the PR.
4. The thread takes the lock by writing its name, PR and time into `CURRENTLY_WORKING.md`,
   then merges (after rebasing or updating on `main` and re-running the tests).
5. The thread releases the lock by resetting the file to `Status: FREE`, then reports back
   to the coordinator.
6. The coordinator starts the next queued merge.

"mwr" always means merge when ready and nothing else.

## Status

- Design: `docs/superpowers/specs/` (pending approval)
- Stack: not chosen yet; see the design doc.
