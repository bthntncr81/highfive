import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { UtensilsCrossed } from 'lucide-react';
import Home from './pages/Home';
import Signup from './pages/Signup';
import Login from './pages/Login';
import { BASE_DOMAIN } from './lib/api';

function Nav() {
  const { pathname } = useLocation();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur">
      <nav className="container-x flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-extrabold text-ink">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white">
            <UtensilsCrossed size={18} />
          </span>
          OtOrder
        </Link>
        <div className="flex items-center gap-2">
          {pathname !== '/' && (
            <Link to="/" className="hidden px-3 py-2 text-sm font-medium text-ink-soft sm:block">
              Özellikler
            </Link>
          )}
          <Link to="/login" className="btn-ghost text-sm">
            Giriş
          </Link>
          <Link to="/signup" className="btn-primary text-sm">
            Ücretsiz Başla
          </Link>
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-100 py-10 text-sm text-ink-muted">
      <div className="container-x flex flex-col items-center justify-between gap-4 sm:flex-row">
        <span>© {new Date().getFullYear()} OtOrder — Restoran Sipariş & Yönetim Platformu</span>
        <span>
          <a className="hover:text-brand-600" href={`https://order.${'highfivepps.com'}`}>
            WhatsApp Sipariş Modülü
          </a>
          {' · '}
          <a className="hover:text-brand-600" href={`https://${BASE_DOMAIN}`}>
            {BASE_DOMAIN}
          </a>
        </span>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
