import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Signup from './pages/Signup';
import Login from './pages/Login';
import { BASE_DOMAIN } from './lib/api';

function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-extrabold tracking-[-0.02em] text-ink ${className}`}>
      {/* Tabak markası: dış tabak + servis çizgisi */}
      <svg viewBox="0 0 28 28" className="h-8 w-8" aria-hidden="true">
        <circle cx="14" cy="14" r="13" fill="#bb1e10" />
        <circle cx="14" cy="14" r="8.5" fill="none" stroke="white" strokeWidth="2" />
        <circle cx="14" cy="14" r="3" fill="white" />
      </svg>
      OtOrder
    </span>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur-md">
      <nav className="container-x flex h-16 items-center justify-between" aria-label="Ana gezinme">
        <Link to="/" aria-label="OtOrder ana sayfa" className="group">
          <Logo className="[&>svg]:transition-transform [&>svg]:duration-500 [&>svg]:ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:[&>svg]:rotate-180" />
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <a href="/#fiyatlar" className="hidden px-3 py-2 text-sm font-semibold text-ink-soft hover:text-ink sm:block">
            Fiyatlar
          </a>
          <Link to="/login" className="px-3 py-2 text-sm font-semibold text-ink-soft hover:text-ink">
            Giriş yap
          </Link>
          <Link to="/signup" className="btn-primary px-5 py-2.5 text-sm">
            Ücretsiz dene
          </Link>
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-3 max-w-[26ch] text-sm leading-relaxed text-ink-muted">
            Restoranlar için sipariş ve yönetim sistemi. Kasa, mutfak ve müşteri tek hatta.
          </p>
        </div>
        <nav aria-label="Ürün">
          <p className="font-bold text-ink">Ürün</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-soft">
            <li><a className="hover:text-brand-700" href="/#fiyatlar">Planlar ve fiyatlar</a></li>
            <li><Link className="hover:text-brand-700" to="/signup">Ücretsiz deneme başlat</Link></li>
            <li><a className="hover:text-brand-700" href="https://order.highfivepps.com">WhatsApp Sipariş Modülü</a></li>
          </ul>
        </nav>
        <nav aria-label="Hesap">
          <p className="font-bold text-ink">Hesap</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-soft">
            <li><Link className="hover:text-brand-700" to="/login">Panele giriş yap</Link></li>
            <li><Link className="hover:text-brand-700" to="/signup">Restoran kaydı</Link></li>
          </ul>
        </nav>
        <div>
          <p className="font-bold text-ink">Canlıda</p>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            <a className="text-ink-soft hover:text-brand-700" href="https://highfivepps.com">
              High Five Pizza &amp; Makarna, Akçakoca
            </a>
            <br />
            OtOrder altyapısıyla servis yapıyor.
          </p>
        </div>
      </div>
      <div className="border-t border-line py-5">
        <p className="container-x text-xs text-ink-muted">
          © {new Date().getFullYear()} OtOrder · {BASE_DOMAIN}
        </p>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#icerik"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white"
      >
        İçeriğe atla
      </a>
      <Nav />
      <main id="icerik" className="flex-1">
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
