import { describe, it, expect } from 'vitest';
import { openDb } from '../src/db.js';
import { roleAtLeast } from '../src/roles.js';
import { hashPassword, verifyPassword } from '../src/auth/password.js';
import { createSession, getSessionUser, destroySession } from '../src/auth/sessions.js';
import { logAudit } from '../src/audit.js';

function userDb() {
  const db = openDb(':memory:');
  const id = db
    .prepare("INSERT INTO users (username, password_hash, role) VALUES ('kris','x','admin')")
    .run().lastInsertRowid as number;
  return { db, id };
}

describe('roleAtLeast', () => {
  it('ranks roles', () => {
    expect(roleAtLeast('admin', 'officer')).toBe(true);
    expect(roleAtLeast('member', 'officer')).toBe(false);
    expect(roleAtLeast('officer', 'officer')).toBe(true);
  });
});

describe('password', () => {
  it('round-trips', async () => {
    const h = await hashPassword('correct horse');
    expect(await verifyPassword('correct horse', h)).toBe(true);
    expect(await verifyPassword('wrong', h)).toBe(false);
  });
});

describe('sessions', () => {
  it('session lifecycle', () => {
    const { db, id } = userDb();
    const t = createSession(db, id);
    expect(t).toMatch(/^[0-9a-f]{64}$/);
    expect(getSessionUser(db, t)).toEqual({ id, username: 'kris', role: 'admin', memberId: null });
    destroySession(db, t);
    expect(getSessionUser(db, t)).toBeNull();
  });
  it('expired session', () => {
    const { db, id } = userDb();
    const t = createSession(db, id);
    const old = new Date(Date.now() - 31 * 86400_000).toISOString();
    db.prepare('UPDATE sessions SET created_at = ? WHERE token = ?').run(old, t);
    expect(getSessionUser(db, t)).toBeNull();
  });
  it('inactive user session', () => {
    const { db, id } = userDb();
    const t = createSession(db, id);
    db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(id);
    expect(getSessionUser(db, t)).toBeNull();
  });
});

describe('audit', () => {
  it('writes JSON', () => {
    const { db, id } = userDb();
    logAudit(db, { userId: id, action: 'x', entity: 'e', entityId: 1, before: { a: 1 } });
    const row: any = db.prepare('SELECT * FROM audit_log').get();
    expect(row.before_json).toBe('{"a":1}');
    expect(row.after_json).toBeNull();
  });
});
