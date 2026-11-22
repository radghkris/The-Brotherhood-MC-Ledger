import type { NextFunction, Request, Response } from 'express';
import type { Db } from '../db.js';
import { roleAtLeast, type Role } from '../roles.js';
import { getSessionUser, type SessionUser } from './sessions.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: SessionUser;
  }
}

export const COOKIE = 'sid';

export function attachUser(db: Db) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const token = req.cookies?.[COOKIE];
    if (typeof token === 'string') req.user = getSessionUser(db, token) ?? undefined;
    next();
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return void res.status(401).json({ error: 'Not logged in' });
  next();
}

export function requireRole(min: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return void res.status(401).json({ error: 'Not logged in' });
    if (!roleAtLeast(req.user.role, min)) return void res.status(403).json({ error: 'Not allowed' });
    next();
  };
}
