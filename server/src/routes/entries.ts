import { Router } from 'express';
import type { Db } from '../db.js';
import { logAudit } from '../audit.js';
import { requireAuth, requireRole } from '../auth/middleware.js';
import { csvCell, currentBalance, withRunningBalance, type EntryRow } from '../ledger.js';

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (s: string) => DATE.test(s) && !Number.isNaN(Date.parse(s));

type Row = EntryRow & Record<string, any>;

const SELECT = `SELECT e.id, e.date, e.description, e.type, e.amount, e.category, e.memo,
  e.received_by AS receivedBy, rb.name AS receivedByName,
  e.approved_by AS approvedBy, ab.name AS approvedByName,
  e.created_by AS createdBy, e.voided, e.void_reason AS voidReason, e.voided_at AS voidedAt,
  e.haul_id AS haulId, e.loan_id AS loanId
  FROM entries e JOIN members rb ON rb.id = e.received_by JOIN members ab ON ab.id = e.approved_by`;

export function entriesRouter(db: Db): Router {
  const r = Router();

  const balance = () => currentBalance(db.prepare('SELECT id, date, type, amount, voided FROM entries').all() as EntryRow[]);

  /** All entries with running balance, then filtered (so balances stay true to the whole ledger). */
  function list(q: Record<string, unknown>) {
    const all = withRunningBalance(db.prepare(`${SELECT} ORDER BY e.date, e.id`).all() as Row[]);
    const from = str(q.from), to = str(q.to), category = str(q.category);
    const member = Number(q.member) || 0;
    return all.filter(
      (e) =>
        (!from || e.date >= from) &&
        (!to || e.date <= to) &&
        (!category || e.category === category) &&
        (!member || e.receivedBy === member || e.approvedBy === member),
    );
  }

  r.get('/api/entries/members', requireAuth, (_req, res) =>
    res.json({ members: db.prepare("SELECT id, name, rank FROM members WHERE status = 'active' ORDER BY name").all() }),
  );

  r.get('/api/entries', requireAuth, (req, res) => {
    res.json({ entries: list(req.query), balance: balance() });
  });

  r.get('/api/entries/export.csv', requireAuth, (req, res) => {
    const head = ['Date', 'Description', 'Deposit', 'Withdrawal', 'Category', 'Memo', 'Received by', 'Approved by', 'Voided', 'Balance'];
    const lines = [head.map(csvCell).join(',')];
    for (const e of list(req.query)) {
      lines.push(
        [
          e.date, e.description, e.type === 'deposit' ? e.amount : '', e.type === 'withdrawal' ? e.amount : '',
          e.category, e.memo, e.receivedByName, e.approvedByName, e.voided ? `VOID: ${e.voidReason ?? ''}` : '', e.balance,
        ].map(csvCell).join(','),
      );
    }
    res.type('text/csv').attachment('ledger.csv').send(lines.join('\r\n') + '\r\n');
  });

  r.post('/api/entries', requireRole('officer'), (req, res) => {
    const b = req.body ?? {};
    const date = str(b.date), description = str(b.description), type = str(b.type);
    const category = str(b.category) || null, memo = str(b.memo) || null;
    const amount = b.amount;
    if (!validDate(date)) return void res.status(400).json({ error: 'A valid date is required' });
    if (!description) return void res.status(400).json({ error: 'Description is required' });
    if (type !== 'deposit' && type !== 'withdrawal') return void res.status(400).json({ error: 'Type must be deposit or withdrawal' });
    if (!Number.isInteger(amount) || amount <= 0) return void res.status(400).json({ error: 'Amount must be a whole number of dollars above 0' });
    const receivedBy = Number(b.receivedBy), approvedBy = Number(b.approvedBy);
    const memberExists = (id: number) => !!db.prepare('SELECT 1 FROM members WHERE id = ?').get(id);
    if (!receivedBy || !memberExists(receivedBy)) return void res.status(400).json({ error: 'Received by is required' });
    if (!approvedBy || !memberExists(approvedBy)) return void res.status(400).json({ error: 'Approved by is required' });

    const out = db.transaction(() => {
      if (type === 'withdrawal' && balance() - amount < 0) {
        if (!(req.user!.role === 'admin' && b.confirmOverdraft === true)) return { overdraft: true as const };
      }
      const id = Number(
        db
          .prepare(
            'INSERT INTO entries (date, description, type, amount, category, memo, received_by, approved_by, created_by) VALUES (?,?,?,?,?,?,?,?,?)',
          )
          .run(date, description, type, amount, category, memo, receivedBy, approvedBy, req.user!.id).lastInsertRowid,
      );
      logAudit(db, { userId: req.user!.id, action: 'create', entity: 'entry', entityId: id, after: { date, description, type, amount, category, memo, receivedBy, approvedBy } });
      return { id };
    })();
    if ('overdraft' in out) {
      return void res.status(409).json({ error: 'This withdrawal would take the balance below $0. An admin must confirm it.', code: 'overdraft' });
    }
    res.status(201).json({ id: out.id, balance: balance() });
  });

  r.post('/api/entries/:id/void', requireRole('admin'), (req, res) => {
    const id = Number(req.params.id);
    const reason = str(req.body?.reason);
    if (!reason) return void res.status(400).json({ error: 'A void reason is required' });
    const before = db.prepare('SELECT * FROM entries WHERE id = ?').get(id) as any;
    if (!before) return void res.status(404).json({ error: 'Entry not found' });
    if (before.voided) return void res.status(409).json({ error: 'Entry is already voided' });
    db.transaction(() => {
      db.prepare("UPDATE entries SET voided = 1, void_reason = ?, voided_by = ?, voided_at = ? WHERE id = ?").run(
        reason, req.user!.id, new Date().toISOString(), id,
      );
      logAudit(db, { userId: req.user!.id, action: 'void', entity: 'entry', entityId: id, before: { voided: 0 }, after: { voided: 1, reason } });
    })();
    res.json({ ok: true, balance: balance() });
  });

  return r;
}
