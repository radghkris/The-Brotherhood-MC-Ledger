import { randomBytes } from 'node:crypto';
import type { Db } from '../db.js';
import type { Role } from '../roles.js';

export type SessionUser = { id: number; username: string; role: Role; memberId: number | null };
export const SESSION_MAX_AGE_MS = 30 * 86400_000;

export function createSession(db: Db, userId: number): string {
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(
    token,
    userId,
    new Date().toISOString(),
  );
  return token;
}

export function getSessionUser(db: Db, token: string): SessionUser | null {
  const row = db
    .prepare(
      `SELECT u.id, u.username, u.role, u.member_id AS memberId, s.created_at AS createdAt
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND u.active = 1`,
    )
    .get(token) as (SessionUser & { createdAt: string }) | undefined;
  if (!row) return null;
  if (Date.now() - Date.parse(row.createdAt) > SESSION_MAX_AGE_MS) return null;
  const { createdAt, ...user } = row;
  return user;
}

export function destroySession(db: Db, token: string): void {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}
