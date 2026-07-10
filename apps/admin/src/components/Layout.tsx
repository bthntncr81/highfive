import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Store, CreditCard, LifeBuoy, LogOut } from 'lucide-react';
import { clearToken } from '../lib/api';
import { Logo } from './OtOrderMark';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/restoranlar', label: 'Restoranlar', icon: Store, end: false },
  { to: '/odemeler', label: 'Ödemeler', icon: CreditCard, end: false },
  { to: '/talepler', label: 'Talepler', icon: LifeBuoy, end: false },
];

// App shell: fixed left vertical nav (icons-only below md), scrollable content.
export default function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  function logout() {
    clearToken();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-16 flex-col border-r border-line bg-white md:w-56">
        <div className="flex h-16 items-center justify-center border-b border-line px-3 md:justify-start md:px-5">
          <span className="hidden md:inline-flex">
            <Logo />
          </span>
          <span className="md:hidden">
            <Logo small />
          </span>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-4 md:px-3" aria-label="Ana gezinme">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              className={({ isActive }) =>
                `flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors md:justify-start ${
                  isActive ? 'bg-brand-50 text-brand-600' : 'text-ink-soft hover:bg-paper hover:text-ink'
                }`
              }
            >
              <Icon size={19} className="shrink-0" />
              <span className="hidden md:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line px-2 py-3 md:px-3">
          <button
            onClick={logout}
            title="Çıkış yap"
            className="flex w-full items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-600 md:justify-start"
          >
            <LogOut size={19} className="shrink-0" />
            <span className="hidden md:inline">Çıkış yap</span>
          </button>
        </div>
      </aside>
      <main className="ml-16 min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 md:ml-56">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
