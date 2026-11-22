import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';
import { requireRole } from '../src/auth/middleware.js';
import { hashPassword } from '../src/auth/password.js';

const setupBody = { username: 'kris', password: 'longenough1', memberName: 'Kris', rank: 'President' };

async function freshApp() {
  const db = openDb(':memory:');
  const app = createApp(db);
  return { db, app };
}
async function setup(app: any) {
  const r = await request(app).post('/api/setup').send(setupBody);
  return r;
}

describe('setup', () => {
  it('creates first admin', async () => {
    const { app } = await freshApp();
    expect((await request(app).get('/api/setup')).body).toEqual({ needed: true });
    const r = await setup(app);
    expect(r.status).toBe(201);
    expect(r.body.user.role).toBe('admin');
    expect((await request(app).get('/api/setup')).body).toEqual({ needed: false });
  });
  it('blocked after first user', async () => {
    const { app } = await freshApp();
    await setup(app);
    const r = await request(app).post('/api/setup').send({ ...setupBody, username: 'evil' });
    expect(r.status).toBe(409);
    expect(r.body).toEqual({ error: 'Already set up' });
  });
  it('short password rejected', async () => {
    const { app } = await freshApp();
    const r = await request(app).post('/api/setup').send({ ...setupBody, password: 'short' });
    expect(r.status).toBe(400);
  });
});

describe('auth', () => {
  it('login success sets cookie and me works', async () => {
    const { app } = await freshApp();
    await setup(app);
    const r = await request(app).post('/api/auth/login').send({ username: 'kris', password: 'longenough1' });
    expect(r.status).toBe(200);
    const cookie = r.headers['set-cookie'];
    expect(cookie[0]).toMatch(/sid=.*HttpOnly/i);
    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body.user.username).toBe('kris');
  });
  it('unknown user and wrong password give identical 401 bodies', async () => {
    const { app } = await freshApp();
    await setup(app);
    const a = await request(app).post('/api/auth/login').send({ username: 'nobody', password: 'longenough1' });
    const b = await request(app).post('/api/auth/login').send({ username: 'kris', password: 'wrongwrong' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body).toEqual(b.body);
    expect(a.body).toEqual({ error: 'Invalid username or password' });
  });
  it('inactive user cannot log in', async () => {
    const { app, db } = await freshApp();
    await setup(app);
    db.prepare('UPDATE users SET active = 0').run();
    const r = await request(app).post('/api/auth/login').send({ username: 'kris', password: 'longenough1' });
    expect(r.status).toBe(401);
  });
  it('disabling a user kills existing sessions', async () => {
    const { app, db } = await freshApp();
    const s = await setup(app);
    db.prepare('UPDATE users SET active = 0').run();
    expect((await request(app).get('/api/auth/me').set('Cookie', s.headers['set-cookie'])).status).toBe(401);
  });
  it('logout invalidates session', async () => {
    const { app } = await freshApp();
    const s = await setup(app);
    const cookie = s.headers['set-cookie'];
    expect((await request(app).post('/api/auth/logout').set('Cookie', cookie)).status).toBe(204);
    expect((await request(app).get('/api/auth/me').set('Cookie', cookie)).status).toBe(401);
  });
  it('setup and login write audit rows', async () => {
    const { app, db } = await freshApp();
    await setup(app);
    await request(app).post('/api/auth/login').send({ username: 'kris', password: 'longenough1' });
    const actions = db.prepare('SELECT action FROM audit_log ORDER BY id').all().map((r: any) => r.action);
    expect(actions).toEqual(['setup', 'login']);
  });
});

describe('requireRole', () => {
  it('403 for member, 200 for officer', async () => {
    const { app, db } = await freshApp();
    app.get('/api/test-officer', requireRole('officer'), (_req, res) => res.json({ ok: true }));
    const hash = await hashPassword('longenough1');
    db.prepare("INSERT INTO users (username, password_hash, role) VALUES ('m', ?, 'member'), ('o', ?, 'officer')").run(hash, hash);
    const login = async (u: string) =>
      (await request(app).post('/api/auth/login').send({ username: u, password: 'longenough1' })).headers['set-cookie'];
    expect((await request(app).get('/api/test-officer')).status).toBe(401);
    const m = await request(app).get('/api/test-officer').set('Cookie', await login('m'));
    expect(m.status).toBe(403);
    expect(m.body).toEqual({ error: 'Not allowed' });
    expect((await request(app).get('/api/test-officer').set('Cookie', await login('o'))).status).toBe(200);
  });
});
