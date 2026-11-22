# Foundation Implementation Plan (Thread 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A running app skeleton: database with migrations, first-run admin setup, login/logout, sessions, roles, audit log and a base web layout that later threads plug into.

**Architecture:** A single Node package. `server/` holds an Express API on SQLite (better-sqlite3, synchronous). `web/` holds a React + Vite SPA, built to `web/dist` and served by the same Express server. Sessions are opaque random tokens stored in SQLite and sent as an httpOnly cookie.

**Tech Stack:** Node 22, TypeScript, Express 4, better-sqlite3, bcryptjs, React 18, Vite 5, React Router 6, Vitest, supertest, tsx.

**Spec:** `docs/superpowers/specs/2026-11-22-ledger-design.md`

## Global Constraints

- Amounts are always whole dollars stored as INTEGER (no floats anywhere).
- Roles are exactly `admin`, `officer` and `member`, ranked admin > officer > member.
- Member ranks are exactly: President, VP, Treasurer, Sgt at Arms, Enforcer, Member, Prospect.
- Nothing is hard-deleted from financial tables; changes go to `audit_log`.
- Config comes only from env: `PORT` (default `3000`), `DB_PATH` (default `./data/ledger.db`), `NODE_ENV`.
- Migrations are numbered SQL files in `server/migrations/`. Reserved numbers: `0001` foundation, `0002` ledger, `0003` roster, `0004` hauls, `0005` loans. Other threads must not reuse these.
- Scripts: `npm run dev`, `npm run build`, `npm start`, `npm test`.

## Review Focus

1. **Setup after the first user exists**: `POST /api/setup` must return 409 once any user exists. Otherwise anyone could create an admin. (Test in Task 3.)
2. **Login error leaks**: an unknown username and a wrong password must return the same 401 body. (Test in Task 3.)
3. **Disabled users**: a user with `active = 0` can't log in, and their existing sessions stop working. (Test in Task 3.)
4. **Missing data folder**: when the `DB_PATH` directory doesn't exist on first run, it gets created instead of crashing. (Test in Task 1.)
5. **Expired sessions**: sessions older than 30 days are rejected. (Test in Task 2.)

---

## File Structure

```
package.json, tsconfig.json, vitest.config.ts, .env.example
server/migrations/0001_foundation.sql
server/src/db.ts            openDb, runMigrations
server/src/roles.ts         Role, roleAtLeast
server/src/audit.ts         logAudit
server/src/auth/password.ts hashPassword, verifyPassword
server/src/auth/sessions.ts createSession, getSessionUser, destroySession
server/src/auth/middleware.ts requireAuth, requireRole
server/src/routes/auth.ts   /api/setup, /api/auth/*
server/src/app.ts           createApp(db)
server/src/index.ts         entry point
server/test/*.test.ts
web/index.html, web/src/main.tsx, web/src/api.ts, web/src/AuthContext.tsx,
web/src/pages/Login.tsx, web/src/pages/Setup.tsx, web/src/Layout.tsx
```

---

### Task 1: Scaffold and database

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.env.example`, `server/src/db.ts`, `server/migrations/0001_foundation.sql`
- Test: `server/test/db.test.ts`

**Interfaces:**
- Produces: `openDb(path: string): Database` (runs migrations, enables `foreign_keys` and WAL, creates the parent dir); `runMigrations(db: Database): void` (applies `server/migrations/*.sql` in filename order, tracked in a `schema_migrations(name TEXT PRIMARY KEY, applied_at TEXT)` table). `':memory:'` is supported for tests.

The schema for `0001_foundation.sql`:
- `members(id INTEGER PK, name TEXT NOT NULL UNIQUE, rank TEXT NOT NULL CHECK(rank IN (...7 ranks)), status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')), joined_on TEXT, notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`
- `users(id INTEGER PK, username TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','officer','member')), member_id INTEGER REFERENCES members(id), active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`
- `sessions(token TEXT PK, user_id INTEGER NOT NULL REFERENCES users(id), created_at TEXT NOT NULL)`
- `audit_log(id INTEGER PK, user_id INTEGER REFERENCES users(id), action TEXT NOT NULL, entity TEXT NOT NULL, entity_id INTEGER, before_json TEXT, after_json TEXT, at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`

- [ ] **Step 1: Init the package.** Run `npm init`, install the stack listed above, and add the four scripts. `dev` runs the server with `tsx watch` plus Vite with an `/api` proxy to `:3000`.
- [ ] **Step 2: Write failing tests** in `server/test/db.test.ts`:
  - `applies migrations once`: `openDb(':memory:')`, then calling `runMigrations` again doesn't throw, and `schema_migrations` has exactly 1 row.
  - `creates missing data directory`: `openDb(join(tmp,'a/b/ledger.db'))` and the file exists.
  - `rejects bad rank`: inserting a member with rank `'King'` throws.
- [ ] **Step 3: Run** `npm test`. Expected: FAIL (module not found).
- [ ] **Step 4: Implement** `db.ts` and the migration.
- [ ] **Step 5: Run** `npm test`. Expected: PASS.
- [ ] **Step 6: Commit** `feat: scaffold project and database migrations`.

### Task 2: Roles, passwords, sessions, audit

**Files:**
- Create: `server/src/roles.ts`, `server/src/auth/password.ts`, `server/src/auth/sessions.ts`, `server/src/audit.ts`
- Test: `server/test/auth-core.test.ts`

**Interfaces:**
- Consumes: `openDb`.
- Produces:
  - `type Role = 'admin' | 'officer' | 'member'`; `roleAtLeast(role: Role, min: Role): boolean`
  - `hashPassword(pw: string): Promise<string>` (bcryptjs, cost 12); `verifyPassword(pw: string, hash: string): Promise<boolean>`
  - `type SessionUser = { id: number; username: string; role: Role; memberId: number | null }`
  - `createSession(db, userId: number): string` (32 random bytes, hex); `getSessionUser(db, token: string): SessionUser | null` (returns null if the token is missing, older than 30 days, or the user is inactive); `destroySession(db, token: string): void`
  - `logAudit(db, e: { userId: number | null; action: string; entity: string; entityId?: number; before?: unknown; after?: unknown }): void`

- [ ] **Step 1: Write failing tests:**
  - `roleAtLeast`: `('admin','officer')` → true, `('member','officer')` → false, `('officer','officer')` → true.
  - `password round-trip`: verify the correct password → true, a wrong one → false.
  - `session lifecycle`: create → get returns the user; destroy → get returns null.
  - `expired session`: set `created_at` to 31 days ago → null.
  - `inactive user session`: set `users.active = 0` → null.
  - `audit writes JSON`: `logAudit` with `before: {a:1}` stores `'{"a":1}'`.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** the four modules.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: roles, password hashing, sessions, audit log`.

### Task 3: API — setup, login, logout, me

**Files:**
- Create: `server/src/auth/middleware.ts`, `server/src/routes/auth.ts`, `server/src/app.ts`, `server/src/index.ts`
- Test: `server/test/auth-api.test.ts` (supertest against `createApp(openDb(':memory:'))`)

**Interfaces:**
- Consumes: everything from Task 2.
- Produces:
  - `createApp(db: Database): Express`. Mounts JSON parsing, cookie parsing, `/api/health` → `{ok:true}`, and the auth routes. In production it serves `web/dist` with an SPA fallback. Later threads add routers through a `registerRoutes(app, db)` call in `app.ts`, with one line per feature router.
  - `requireAuth` sets `req.user: SessionUser`, or returns 401 `{error:'Not logged in'}`. `requireRole(min: Role)` returns 403 `{error:'Not allowed'}`.
  - Cookie: `sid`, httpOnly, sameSite `lax`, `secure` when `NODE_ENV=production`, maxAge 30 days.
  - Routes:
    - `GET /api/setup` → `{needed: boolean}`
    - `POST /api/setup {username, password, memberName, rank}` → creates the member, an admin user and a session; 201 `{user}`. Returns 409 `{error:'Already set up'}` if any user exists. Password must be at least 8 chars, else 400.
    - `POST /api/auth/login {username, password}` → 200 `{user}` plus the cookie, or 401 `{error:'Invalid username or password'}`.
    - `POST /api/auth/logout` → 204 and clears the cookie.
    - `GET /api/auth/me` → `{user}`, or 401.
  - Setup and login each write an audit row.

- [ ] **Step 1: Write failing tests:**
  - `setup creates first admin`: GET setup → `needed:true`; POST → 201 with `user.role === 'admin'`; GET → `needed:false`.
  - `setup blocked after first user` → 409.
  - `short password rejected` → 400.
  - `login success sets cookie`, then `me` with that cookie → 200.
  - `unknown user and wrong password give identical 401 bodies`.
  - `inactive user cannot log in` → 401.
  - `logout invalidates session`: `me` → 401 afterwards.
  - `requireRole`: mount a test route with `requireRole('officer')`; a member gets 403 and an officer gets 200.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** the middleware, routes, `createApp` and `index.ts` (reads env, calls `openDb(DB_PATH)` then `listen(PORT)`).
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: setup and auth API`.

### Task 4: Web shell — setup, login, layout

**Files:**
- Create: `web/index.html`, `web/vite.config.ts`, `web/src/main.tsx`, `web/src/api.ts`, `web/src/AuthContext.tsx`, `web/src/Layout.tsx`, `web/src/pages/Setup.tsx`, `web/src/pages/Login.tsx`, `web/src/pages/Placeholder.tsx`
- Test: manual run (below). UI tests are not required in this thread.

**Interfaces:**
- Consumes: the Task 3 routes.
- Produces:
  - `api<T>(path: string, opts?: RequestInit): Promise<T>`. Uses JSON, `credentials:'include'`, and throws `Error(body.error)` when the response isn't ok.
  - `useAuth(): { user: SessionUser | null; login; logout; refresh }`.
  - `Layout` shows the club name "The Brotherhood MC", nav links (Dashboard, Ledger, Hauls, Loans, Roster, Admin), the user's name and role, and Logout. The Admin link only appears for admins. Every route except setup and login is inside `Layout` and redirects to `/login` when there's no user.
  - Routes: `/setup` (shown automatically when `GET /api/setup` says needed), `/login`, and `/`, `/ledger`, `/hauls`, `/loans`, `/roster`, `/admin` rendering `Placeholder` with the page name. Later threads replace these placeholders.
  - Dark theme, readable on a phone (nav collapses below 640px).

- [ ] **Step 1: Build the pages and context.**
- [ ] **Step 2: Verify:** `npm run build && rm -f /tmp/t.db && DB_PATH=/tmp/t.db NODE_ENV=production npm start`, then in a browser (Playwright is OK):
  - Visiting `/` lands on `/setup`. Completing setup lands on Dashboard.
  - Logging out lands on `/login`. A wrong password shows "Invalid username or password". The correct one shows Dashboard.
  - At 375px wide there's no horizontal scroll.
- [ ] **Step 3: Run** `npm test`. Expected: still PASS.
- [ ] **Step 4: Commit** `feat: web shell with setup, login and layout`.

### Task 5: README run instructions and PR

- [ ] **Step 1:** Add "Run locally" to `README.md`: Node 22, `npm install`, `npm run dev` (opens :5173), `npm run build && npm start` (:3000), where data lives (`DB_PATH`), and "back up by copying the .db file while the app is stopped".
- [ ] **Step 2:** Run `npm test && npm run build`. Expected: both succeed.
- [ ] **Step 3:** Commit `docs: run instructions`, push the thread branch, and open a PR into `main`. Don't merge: wait for Kris's "mwr" or "tc" and follow the lock in `CLAUDE.md`.
