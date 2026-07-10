import { ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { getToken } from './lib/api';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tenants from './pages/Tenants';
import TenantDetail from './pages/TenantDetail';
import Transactions from './pages/Transactions';
import Tickets from './pages/Tickets';

// Requires an admin token; the API client also force-redirects on any 401.
function Protected({ children }: { children: ReactNode }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/restoranlar" element={<Protected><Tenants /></Protected>} />
      <Route path="/restoranlar/:id" element={<Protected><TenantDetail /></Protected>} />
      <Route path="/odemeler" element={<Protected><Transactions /></Protected>} />
      <Route path="/talepler" element={<Protected><Tickets /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
