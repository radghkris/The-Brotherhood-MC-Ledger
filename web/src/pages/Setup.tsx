import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';

const RANKS = ['President', 'VP', 'Treasurer', 'Sgt at Arms', 'Enforcer', 'Member', 'Prospect'];

export default function Setup({ onDone }: { onDone: () => void }) {
  const { refresh } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ username: '', password: '', memberName: '', rank: 'President' });
  const [error, setError] = useState('');
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api('/api/setup', { method: 'POST', body: JSON.stringify(f) });
      await refresh();
      onDone();
      nav('/', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    }
  };
  return (
    <form className="card" onSubmit={submit}>
      <h1>The Brotherhood MC</h1>
      <h2>First-time setup: create the admin account</h2>
      <label>Your name<input value={f.memberName} onChange={set('memberName')} /></label>
      <label>Rank<select value={f.rank} onChange={set('rank')}>{RANKS.map((r) => <option key={r}>{r}</option>)}</select></label>
      <label>Username<input value={f.username} onChange={set('username')} autoComplete="username" /></label>
      <label>Password (8+ characters)<input type="password" value={f.password} onChange={set('password')} autoComplete="new-password" /></label>
      {error && <p className="error">{error}</p>}
      <button type="submit">Create admin</button>
    </form>
  );
}
