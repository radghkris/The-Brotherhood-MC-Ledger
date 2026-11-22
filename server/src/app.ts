import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Db } from './db.js';
import { attachUser } from './auth/middleware.js';
import { authRouter } from './routes/auth.js';

/** Later threads add one line per feature router here. */
export function registerRoutes(app: Express, db: Db): void {
  app.use(authRouter(db));
}

export function createApp(db: Db): Express {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(attachUser(db));
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  registerRoutes(app, db);

  if (process.env.NODE_ENV === 'production') {
    const dist = join(dirname(fileURLToPath(import.meta.url)), '../../web/dist');
    if (existsSync(dist)) {
      app.use(express.static(dist));
      app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(join(dist, 'index.html')));
    }
  }
  return app;
}
