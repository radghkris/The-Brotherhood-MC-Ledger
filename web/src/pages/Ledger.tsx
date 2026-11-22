import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';

type Entry = {
  id: number; date: string; description: string; type: 'deposit' | 'withdrawal'; amount: number;
  category: string | null; memo: string | null; receivedByName: string; approvedByName: string;
  voided: number; voidReason: string | null; balance: number;
};
type Member = { id: number; name: string; rank: string };
const money = (n: number) => (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString();
const today = () => new Date().toISOString().slice(0, 10);

export default function Ledger() {
  const { user } = useAuth();
  const canAdd = user?.role === 'admin' || user?.role === 'officer';
  const isAdmin = user?.role === 'admin';
  const [entries, setEntries] = useState<Entry[]>([]);
  const [balance, setBalance] = useState(0);
  const [members, setMembers] = useState<Member[]>([]);
  const [filter, setFilter] = useState({ from: '', to: '', member: '', category: '' });
  const [error, setError] = useState('');
  const [form, setForm] = useState({ date: today(), description: '', type: 'deposit', amount: '', category: '', memo: '', receivedBy: '', approvedBy: '' });

  const query = new URLSearchParams(Object.entries(filter).filter(([, v]) => v)).toString();
  const load = useCallback(async () => {
    try {
      const r = await api<{ entries: Entry[]; balance: number }>(`/api/entries?${query}`);
      setEntries(r.entries);
      setBalance(r.balance);
    } catch (e) { setError((e as Error).message); }
  }, [query]);
  useEffect(() => void load(), [load]);
  useEffect(() => {
    api<{ members: Member[] }>('/api/entries/members').then((r) => setMembers(r.members)).catch(() => {});
  }, []);

  async function post(confirmOverdraft = false) {
    await api('/api/entries', {
      method: 'POST',
      body: JSON.stringify({ ...form, amount: Number(form.amount), receivedBy: Number(form.receivedBy), approvedBy: Number(form.approvedBy), confirmOverdraft }),
    });
    setForm({ ...form, description: '', amount: '', memo: '' });
    await load();
  }
  async function add(e: FormEvent) {
    e.preventDefault();
    setError('');
    try { await post(); } catch (err) {
      const msg = (err as Error).message;
      if (isAdmin && msg.includes('below $0') && window.confirm(`${msg}\n\nPost it anyway?`)) {
        try { await post(true); } catch (e2) { setError((e2 as Error).message); }
      } else setError(msg);
    }
  }
  async function voidEntry(id: number) {
    const reason = window.prompt('Reason for voiding this entry?');
    if (!reason?.trim()) return;
    try {
      await api(`/api/entries/${id}/void`, { method: 'POST', body: JSON.stringify({ reason }) });
      await load();
    } catch (err) { setError((err as Error).message); }
  }
  const set = (k: string) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const setF = (k: string) => (e: { target: { value: string } }) => setFilter({ ...filter, [k]: e.target.value });
  const picker = (k: 'receivedBy' | 'approvedBy', label: string) => (
    <label>{label}
      <select required value={form[k]} onChange={set(k)}>
        <option value="">Select…</option>
        {members.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.rank})</option>)}
      </select>
    </label>
  );

  return (
    <div>
      <h1>Ledger</h1>
      <p className="balance">Balance: <strong>{money(balance)}</strong></p>
      {error && <p className="error">{error}</p>}

      {canAdd && (
        <form className="panel" onSubmit={add}>
          <h2>Add entry</h2>
          <div className="grid">
            <label>Date<input type="date" required value={form.date} onChange={set('date')} /></label>
            <label>Type<select value={form.type} onChange={set('type')}><option value="deposit">Deposit</option><option value="withdrawal">Withdrawal</option></select></label>
            <label>Amount ($)<input type="number" min="1" step="1" required value={form.amount} onChange={set('amount')} /></label>
            <label>Description<input required value={form.description} onChange={set('description')} /></label>
            <label>Category<input value={form.category} onChange={set('category')} /></label>
            <label>Memo<input value={form.memo} onChange={set('memo')} /></label>
            {picker('receivedBy', 'Received by')}
            {picker('approvedBy', 'Approved by')}
          </div>
          <button type="submit">Add entry</button>
        </form>
      )}

      <div className="panel">
        <h2>Filter</h2>
        <div className="grid">
          <label>From<input type="date" value={filter.from} onChange={setF('from')} /></label>
          <label>To<input type="date" value={filter.to} onChange={setF('to')} /></label>
          <label>Member
            <select value={filter.member} onChange={setF('member')}>
              <option value="">Anyone</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <label>Category<input value={filter.category} onChange={setF('category')} /></label>
        </div>
        <a className="btn" href={`/api/entries/export.csv?${query}`}>Export CSV</a>
      </div>

      <div className="tablewrap">
        <table>
          <thead><tr><th>Date</th><th>Description</th><th className="num">Deposit</th><th className="num">Withdrawal</th><th>Memo</th><th>Received</th><th>Approved</th><th className="num">Balance</th>{isAdmin && <th />}</tr></thead>
          <tbody>
            {entries.length === 0 && <tr><td colSpan={9} className="muted">No entries yet.</td></tr>}
            {entries.map((e) => (
              <tr key={e.id} className={e.voided ? 'void' : ''} title={e.voided ? `Voided: ${e.voidReason}` : undefined}>
                <td>{e.date}</td>
                <td>{e.description}{e.category ? <small> · {e.category}</small> : null}{e.voided ? <small> · VOID: {e.voidReason}</small> : null}</td>
                <td className="num">{e.type === 'deposit' ? money(e.amount) : ''}</td>
                <td className="num">{e.type === 'withdrawal' ? money(e.amount) : ''}</td>
                <td>{e.memo}</td><td>{e.receivedByName}</td><td>{e.approvedByName}</td>
                <td className="num">{money(e.balance)}</td>
                {isAdmin && <td>{!e.voided && <button onClick={() => voidEntry(e.id)}>Void</button>}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
