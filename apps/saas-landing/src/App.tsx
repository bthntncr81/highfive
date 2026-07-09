import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Signup from './pages/Signup';
import Login from './pages/Login';
import SetPassword from './pages/SetPassword';
import { BASE_DOMAIN } from './lib/api';

function Logo({ className = '' }: { className?: string }) {
  // Prototipteki wordmark: OtOrder + kırmızı nokta (Sora 800)
  return (
    <span className={`wordmark-ot ${className}`}>
      OtOrder<b>.</b>
    </span>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(21,23,28,0.09)] bg-[rgba(251,250,248,0.8)] backdrop-blur-[14px]">
      <nav className="mx-auto flex h-16 w-full max-w-[1220px] items-center justify-between px-5 sm:px-11" aria-label="Ana gezinme">
        <Link to="/" aria-label="OtOrder ana sayfa">
          <Logo />
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <a href="/#fiyatlar" className="hidden px-3 py-2 text-sm font-semibold text-ink-soft hover:text-ink sm:block">
            Fiyatlar
          </a>
          <Link to="/login" className="px-3 py-2 text-sm font-semibold text-ink-soft hover:text-ink">
            Giriş yap
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center rounded-[14px] bg-[#D92B1C] px-[22px] py-[11px] text-sm font-bold text-white shadow-[0_14px_34px_-12px_rgba(217,43,28,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-12px_rgba(217,43,28,0.6)]"
          >
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
          <Route path="/sifre-belirle" element={<SetPassword />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
