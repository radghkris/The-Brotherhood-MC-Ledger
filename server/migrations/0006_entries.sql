CREATE TABLE entries (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('deposit','withdrawal')),
  amount INTEGER NOT NULL CHECK(amount > 0),
  category TEXT,
  memo TEXT,
  received_by INTEGER NOT NULL REFERENCES members(id),
  approved_by INTEGER NOT NULL REFERENCES members(id),
  created_by INTEGER NOT NULL REFERENCES users(id),
  voided INTEGER NOT NULL DEFAULT 0,
  void_reason TEXT,
  voided_by INTEGER REFERENCES users(id),
  voided_at TEXT,
  haul_id INTEGER,
  loan_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX entries_date ON entries(date, id);
