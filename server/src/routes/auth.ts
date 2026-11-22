import { Router, type Response } from 'express';
import type { Db } from '../db.js';
import { logAudit } from '../audit.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { createSession, destroySession, SESSION_MAX_AGE_MS, type SessionUser } from '../auth/sessions.js';
import { COOKIE, requireAuth } from '../auth/middleware.js';

export const RANKS = ['President', 'VP', 'Treasurer', 'Sgt at Arms', 'Enforcer', 'Member', 'Prospect'];

function setCookie(res: Response, token: string) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE_MS,
  });
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export function authRouter(db: Db): Router {
  const r = Router();
  const userCount = () => (db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n;

  r.get('/api/setup', (_req, res) => res.json({ needed: userCount() === 0 }));

  r.post('/api/setup', async (req, res) => {
    if (userCount() > 0) return void res.status(409).json({ error: 'Already set up' });
    const username = str(req.body?.username);
    const memberName = str(req.body?.memberName);
    const rank = str(req.body?.rank);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!username || !memberName) return void res.status(400).json({ error: 'Username and member name are required' });
    if (!RANKS.includes(rank)) return void res.status(400).json({ error: 'Invalid rank' });
    if (password.length < 8) return void res.status(400).json({ error: 'Password must be at least 8 characters' });
    const hash = await hashPassword(password);
    // Re-check and insert in one synchronous transaction so two racing requests can't both win.
    const result = db.transaction((): { user: SessionUser; token: string } | null => {
      if (userCount() > 0) return null;
      const memberId = Number(
        db.prepare('INSERT INTO members (name, rank) VALUES (?, ?)').run(memberName, rank).lastInsertRowid,
      );
      const id = Number(
        db
          .prepare("INSERT INTO users (username, password_hash, role, member_id) VALUES (?, ?, 'admin', ?)")
          .run(username, hash, memberId).lastInsertRowid,
      );
      logAudit(db, { userId: id, action: 'setup', entity: 'user', entityId: id, after: { username, role: 'admin', memberId } });
      return { user: { id, username, role: 'admin', memberId }, token: createSession(db, id) };
    })();
    if (!result) return void res.status(409).json({ error: 'Already set up' });
    setCookie(res, result.token);
    res.status(201).json({ user: result.user });
  });

  r.post('/api/auth/login', async (req, res) => {
    const username = str(req.body?.username);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const row = db
      .prepare('SELECT id, username, password_hash, role, member_id, active FROM users WHERE username = ?')
      .get(username) as any;
    const ok = row ? await verifyPassword(password, row.password_hash) : false;
    if (!row || !ok || !row.active) return void res.status(401).json({ error: 'Invalid username or password' });
    const token = createSession(db, row.id);
    logAudit(db, { userId: row.id, action: 'login', entity: 'user', entityId: row.id });
    setCookie(res, token);
    res.json({ user: { id: row.id, username: row.username, role: row.role, memberId: row.member_id } });
  });

  r.post('/api/auth/logout', (req, res) => {
    const token = req.cookies?.[COOKIE];
    if (typeof token === 'string') destroySession(db, token);
    res.clearCookie(COOKIE);
    res.status(204).end();
  });

  r.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: req.user }));

  return r;
}
