# Brotherhood MC Ledger — Design

Status: **Draft, awaiting Kris's approval**

## Intent

The club is starting back up and needs a ledger. The old one was an Excel sheet Kris built
(not in this repo). It worked for one person on one computer, but it mixed loans into the
general log, worked haul splits out off to the side, and couldn't be shared. The new
ledger starts clean, at a $0 balance with no history. It runs on Kris's computer first and
can later be hosted so other members can use it from different computers.

## What the old sheet did (carry forward)

- A transaction log: date, description, deposit, withdrawal, memo, received by, approved
  by, and a running balance.
- A haul splitter: haul ÷ (member cuts + MC cuts) = per-cut amount. The MC takes 1 cut.
  There were notes like "Tonight's take was $X, per cut was Y."
- A roster: President, VP, Treasurer, Sgt at Arms, Enforcers, Prospects.
- Loans and investments to and from members, which had to be tracked by hand.

## Goals

1. **Ledger**: record deposits and withdrawals, with a live running balance.
2. **Haul splitter**: enter a night's take, pick who was there, and get the per-cut
   amount. One click posts it to the ledger (the deposit plus each member's payout).
3. **Loans**: per-member loans in either direction (club → member or member → club),
   with repayments and an outstanding balance always visible.
4. **Roster**: members with rank and status (Prospect, Member, Officer roles, Inactive).
5. **Users and roles**: logins so several people can use it.
6. **Local now, hosted later**: the same app, with no rebuild needed to go online.

## Non-goals (for now)

- Real banking, payment integration or taxes.
- Mobile apps (the web UI should still work on a phone).
- Importing the old spreadsheet (clean slate).
- Inventory or product tracking.

## Anti-goals (failure even if it "works")

- Entries silently edited or deleted. The books must be trustworthy, so changes are
  logged and entries are voided, never erased.
- A member without the right role being able to move money.
- Losing the data. Backups and export must exist from the first release.

## Approaches considered

1. **Self-contained web app with its own database. CHOSEN by Kris.** It runs locally,
   and the same build deploys to a small host later. Data stays under the club's control.
2. Web page plus a hosted database service (e.g. Supabase). Online from day one, but the
   data sits on a third-party account and running purely locally is awkward.
3. Desktop app. Simple for one person, but a poor fit for several users on different
   computers.

## Design

### Stack (coordinator's call)

- **Server**: Node.js 22 + TypeScript + Express.
- **Database**: SQLite, stored as a single file, which makes backups easy. Access goes
  through a thin query layer, so a move to Postgres later stays possible.
- **Frontend**: React + Vite + TypeScript, served by the same server.
- **Auth**: username and password (bcrypt hashes), with session cookies.
- **Packaging**: `npm start` locally, plus a Dockerfile for hosting later.
- **Tests**: Vitest for the logic and the API.

### Data model

- `members`: name, rank (President, VP, Treasurer, Sgt at Arms, Enforcer, Member,
  Prospect), status (active/inactive), joined date, notes.
- `users`: login tied to a member (optional), role, password hash.
- `entries`: date, description, type (deposit/withdrawal), amount (whole dollars,
  integer), category, memo, received_by (member), approved_by (member), created_by
  (user), voided flag plus a void reason, and links to a haul or loan if it came from one.
- `hauls`: date, total, MC cuts (default 1), participants, per-cut amount (rounded down;
  the remainder stays with the MC), note.
- `loans`: member, direction, principal, date, note. Repayments are entries linked to
  the loan. Outstanding = principal − repayments.
- `audit_log`: who did what and when, with before and after values.

### Roles

| Role | Can do |
|------|--------|
| Admin (e.g. President, Treasurer) | Everything, including managing users and voiding entries |
| Officer | Add entries, hauls and loans |
| Member | View the balance, the ledger, their own cuts and their own loans |

### Screens

- **Dashboard**: current balance, recent entries, open loans, last haul.
- **Ledger**: a filterable table (date range, member, category) with a running balance,
  an add-entry form, a void action, and CSV/Excel export.
- **Haul splitter**: total, participants checklist, MC cuts → per cut (preview), then
  post it.
- **Loans**: a list per member with outstanding amounts, plus add a loan and record a
  repayment.
- **Roster**: members, ranks and status.
- **Admin**: users and roles, backup download.

### Rules

- Amounts are whole dollars. Withdrawals can't take the balance below $0 unless an Admin
  confirms.
- Every entry needs received-by and approved-by, matching the old sheet's discipline.
- Voided entries stay visible (struck through) and are left out of the balance.

## Build plan (threads)

These are coding threads, Sonnet-Med. They merge one at a time via `CURRENTLY_WORKING.md`.

1. **Foundation**: project scaffold, database and migrations, auth/sessions, roles, base
   layout. *(Must merge first.)*
2. **Ledger**: entries, running balance, void, audit log, export.
3. **Roster and users**: members, ranks, user admin.
4. **Haul splitter**: preview, plus posting to the ledger.
5. **Loans**: loans, repayments, outstanding balances.
6. **Dashboard, backup and deploy**: dashboard, backup download, Dockerfile, hosting
   guide (Haiku-Med for the docs part).

Threads 2 and 3 can run in parallel after 1. Threads 4 and 5 come after 2 and 3. Thread 6
comes last.

## Left to the builder

Styling details, component library choice, exact file layout, and migration tooling.
