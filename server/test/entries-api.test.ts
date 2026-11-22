import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';
import { hashPassword } from '../src/auth/password.js';

async function boot() {
  const db = openDb(':memory:');
  const app = createApp(db);
  const setup = await request(app).post('/api/setup').send({ username: 'kris', password: 'longenough1', memberName: 'Kris', rank: 'President' });
  const admin = setup.headers['set-cookie'] as unknown as string[];
  const hash = await hashPassword('longenough1');
  const mk = async (username: string, role: string) => {
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?,?,?)').run(username, hash, role);
    const r = await request(app).post('/api/auth/login').send({ username, password: 'longenough1' });
    return r.headers['set-cookie'] as unknown as string[];
  };
  const officer = await mk('off', 'officer');
  const member = await mk('mem', 'member');
  return { db, app, admin, officer, member };
}
const entry = (o: object = {}) => ({ date: '2026-01-05', description: 'Dues', type: 'deposit', amount: 100, receivedBy: 1, approvedBy: 1, ...o });

describe('entries', () => {
  it('starts at $0 and adds with running balance', async () => {
    const { app, officer } = await boot();
    expect((await request(app).get('/api/entries').set('Cookie', officer)).body.balance).toBe(0);
    expect((await request(app).post('/api/entries').set('Cookie', officer).send(entry())).status).toBe(201);
    await request(app).post('/api/entries').set('Cookie', officer).send(entry({ type: 'withdrawal', amount: 40, description: 'Beer' }));
    const r = await request(app).get('/api/entries').set('Cookie', officer);
    expect(r.body.balance).toBe(60);
    expect(r.body.entries.map((e: any) => e.balance)).toEqual([100, 60]);
  });
  it('members can view but not add', async () => {
    const { app, member } = await boot();
    expect((await request(app).get('/api/entries').set('Cookie', member)).status).toBe(200);
    expect((await request(app).post('/api/entries').set('Cookie', member).send(entry())).status).toBe(403);
  });
  it('requires login', async () => {
    const { app } = await boot();
    expect((await request(app).get('/api/entries')).status).toBe(401);
  });
  it('validates input', async () => {
    const { app, officer } = await boot();
    for (const bad of [{ amount: 1.5 }, { amount: 0 }, { amount: '5' }, { date: 'x' }, { description: ' ' }, { type: 'gift' }, { receivedBy: 99 }, { approvedBy: undefined }]) {
      const r = await request(app).post('/api/entries').set('Cookie', officer).send(entry(bad));
      expect(r.status, JSON.stringify(bad)).toBe(400);
    }
  });
  it('blocks overdraft unless admin confirms', async () => {
    const { app, officer, admin } = await boot();
    const w = entry({ type: 'withdrawal', amount: 10 });
    const a = await request(app).post('/api/entries').set('Cookie', officer).send(w);
    expect(a.status).toBe(409);
    const b = await request(app).post('/api/entries').set('Cookie', officer).send({ ...w, confirmOverdraft: true });
    expect(b.status).toBe(409);
    const c = await request(app).post('/api/entries').set('Cookie', admin).send({ ...w, confirmOverdraft: true });
    expect(c.status).toBe(201);
    expect(c.body.balance).toBe(-10);
  });
  it('void: admin only, needs reason, excluded from balance, kept visible, audited', async () => {
    const { app, db, officer, admin } = await boot();
    const id = (await request(app).post('/api/entries').set('Cookie', officer).send(entry())).body.id;
    expect((await request(app).post(`/api/entries/${id}/void`).set('Cookie', officer).send({ reason: 'x' })).status).toBe(403);
    expect((await request(app).post(`/api/entries/${id}/void`).set('Cookie', admin).send({})).status).toBe(400);
    const v = await request(app).post(`/api/entries/${id}/void`).set('Cookie', admin).send({ reason: 'typo' });
    expect(v.body.balance).toBe(0);
    expect((await request(app).post(`/api/entries/${id}/void`).set('Cookie', admin).send({ reason: 'again' })).status).toBe(409);
    const list = (await request(app).get('/api/entries').set('Cookie', admin)).body;
    expect(list.entries).toHaveLength(1);
    expect(list.entries[0].voided).toBe(1);
    const actions = db.prepare("SELECT action FROM audit_log WHERE entity = 'entry' ORDER BY id").all().map((r: any) => r.action);
    expect(actions).toEqual(['create', 'void']);
  });
  it('filters keep whole-ledger running balance', async () => {
    const { app, officer } = await boot();
    await request(app).post('/api/entries').set('Cookie', officer).send(entry({ date: '2026-01-01' }));
    await request(app).post('/api/entries').set('Cookie', officer).send(entry({ date: '2026-02-01', category: 'Dues' }));
    const r = await request(app).get('/api/entries?from=2026-02-01').set('Cookie', officer);
    expect(r.body.entries).toHaveLength(1);
    expect(r.body.entries[0].balance).toBe(200);
    expect((await request(app).get('/api/entries?category=Dues').set('Cookie', officer)).body.entries).toHaveLength(1);
  });
  it('exports csv with formula protection', async () => {
    const { app, officer } = await boot();
    await request(app).post('/api/entries').set('Cookie', officer).send(entry({ description: '=HYPERLINK("x")' }));
    const r = await request(app).get('/api/entries/export.csv').set('Cookie', officer);
    expect(r.headers['content-type']).toMatch(/text\/csv/);
    expect(r.text).toContain("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(r.text.split('\r\n')[0]).toBe('Date,Description,Deposit,Withdrawal,Category,Memo,Received by,Approved by,Voided,Balance');
  });
});
