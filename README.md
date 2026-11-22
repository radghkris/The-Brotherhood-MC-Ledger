# The Brotherhood MC Ledger

The club ledger: deposits and withdrawals, running balance, haul splits, member loans and
the roster. It's a work in progress; see `CLAUDE.md` for how the project is run.

## Run locally

Requires Node 22.

```
npm install
npm run dev              # development: open http://localhost:5173 (API on :3000)
npm run build && npm start   # production build: http://localhost:3000
```

The first visit shows a setup page that creates the admin account.

Data lives in a single SQLite file, `./data/ledger.db` by default. Set `DB_PATH` to put it
elsewhere (`PORT` changes the port). To back up, copy the `.db` file while the app is
stopped.
