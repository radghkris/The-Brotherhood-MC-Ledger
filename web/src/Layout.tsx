import { useState } from 'react';
import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Logo from './Logo';

const links = [
  ['/', 'Dashboard'],
  ['/ledger', 'Ledger'],
  ['/hauls', 'Hauls'],
  ['/loans', 'Loans'],
  ['/roster', 'Roster'],
  ['/admin', 'Admin'],
] as const;

export default function Layout() {
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  if (loading) return <p className="muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <>
      <header className="bar">
        <Logo />
        <button className="menu" aria-label="Menu" onClick={() => setOpen(!open)}>☰</button>
        <nav className={open ? 'open' : ''} onClick={() => setOpen(false)}>
          {links
            .filter(([to]) => to !== '/admin' || user.role === 'admin')
            .map(([to, label]) => (
              <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>
            ))}
        </nav>
        <span className="who">{user.username} ({user.role}) <button onClick={logout}>Logout</button></span>
      </header>
      <main><Outlet /></main>
    </>
  );
}
