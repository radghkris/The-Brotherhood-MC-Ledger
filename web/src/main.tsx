import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { api } from './api';
import { AuthProvider } from './AuthContext';
import Layout from './Layout';
import Login from './pages/Login';
import Setup from './pages/Setup';
import Placeholder from './pages/Placeholder';
import Ledger from './pages/Ledger';
import Dashboard from './pages/Dashboard';
import Backdrop from './Backdrop';
import '@fontsource/rye/400.css';
import './styles.css';

const pages: [string, string][] = [
  ['/', 'Dashboard'],
  ['/ledger', 'Ledger'],
  ['/hauls', 'Hauls'],
  ['/loans', 'Loans'],
  ['/roster', 'Roster'],
  ['/admin', 'Admin'],
];

function App() {
  const [needed, setNeeded] = useState<boolean | null>(null);
  useEffect(() => {
    api<{ needed: boolean }>('/api/setup').then((r) => setNeeded(r.needed)).catch(() => setNeeded(false));
  }, []);
  if (needed === null) return <p className="muted">Loading…</p>;
  return (
    <AuthProvider>
      <Routes>
        <Route path="/setup" element={needed ? <Setup onDone={() => setNeeded(false)} /> : <Navigate to="/login" replace />} />
        <Route path="/login" element={needed ? <Navigate to="/setup" replace /> : <Login />} />
        <Route element={needed ? <Navigate to="/setup" replace /> : <Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ledger" element={<Ledger />} />
          {pages.filter(([path]) => path !== '/ledger' && path !== '/').map(([path, name]) => (
            <Route key={path} path={path} element={<Placeholder name={name} />} />
          ))}
        </Route>
      </Routes>
    </AuthProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Backdrop />
      <App />
    </BrowserRouter>
  </StrictMode>,
);
