import { useEffect, useState } from 'react';
import { api } from '../api';
import Logo from '../Logo';

type Entry = {
  id: number; date: string; description: string; type: 'deposit' | 'withdrawal'; amount: number;
  receivedByName: string; voided: number;
};
const money = (n: number) => (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString();

export default function Dashboard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [balance, setBalance] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => {
    api<{ entries: Entry[]; balance: number }>('/api/entries')
      .then((r) => { setEntries(r.entries); setBalance(r.balance); })
      .catch((e) => setError((e as Error).message));
  }, []);

  // Entries arrive oldest first; newest five of each kind, voided ones skipped.
  const recent = (type: Entry['type']) =>
    entries.filter((e) => e.type === type && !e.voided).slice(-5).reverse();

  return (
    <div className="hud">
      <div className="hud-logo"><Logo width={400} /></div>
      {error && <p className="error">{error}</p>}
      <section className="hud-treasury" aria-label="Treasury">
        <span className="hud-label">Treasury</span>
        <strong className={`hud-amount${balance < 0 ? ' neg' : ''}`}>{money(balance)}</strong>
      </section>
      <div className="hud-lists">
        <RecentList title="Last 5 deposits" kind="deposit" rows={recent('deposit')} />
        <RecentList title="Last 5 withdrawals" kind="withdrawal" rows={recent('withdrawal')} />
      </div>
    </div>
  );
}

function RecentList({ title, kind, rows }: { title: string; kind: 'deposit' | 'withdrawal'; rows: Entry[] }) {
  return (
    <section className={`hud-list ${kind}`} aria-label={title}>
      <h2>{title}</h2>
      {rows.length === 0 && <p className="muted">None yet.</p>}
      <ul>
        {rows.map((e) => (
          <li key={e.id}>
            <span className="hud-what">
              <span className="hud-desc">{e.description}</span>
              <small>{e.date} · {e.receivedByName}</small>
            </span>
            <span className="hud-money">{kind === 'deposit' ? '+' : '−'}{money(e.amount)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
