import { describe, it, expect } from 'vitest';
import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb, runMigrations } from '../src/db.js';

describe('db', () => {
  it('applies migrations once', () => {
    const db = openDb(':memory:');
    expect(() => runMigrations(db)).not.toThrow();
    const rows = db.prepare('SELECT * FROM schema_migrations').all();
    expect(rows).toHaveLength(1);
  });
  it('creates missing data directory', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'ledger-'));
    const p = join(tmp, 'a/b/ledger.db');
    openDb(p).close();
    expect(existsSync(p)).toBe(true);
  });
  it('rejects bad rank', () => {
    const db = openDb(':memory:');
    expect(() => db.prepare("INSERT INTO members (name, rank) VALUES ('X','King')").run()).toThrow();
  });
});
