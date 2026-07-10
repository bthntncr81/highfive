import { useState } from 'react';
import { Loader2, LogIn } from 'lucide-react';
import { api, BASE_DOMAIN } from '../lib/api';

// otorder.com/login: e-posta+şifre → auth (Membership). Girişten sonra kullanıcı
// KENDİ restoranının POS'una oturum açık gider (token hash ile taşınır — sunucu
// loglarına/referrer'a sızmaz, POS tarafı okuyup siler). Çok üyelikte restoran
// seçtirir ve seçilen tenant için yeniden token alır.
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [choices, setChoices] = useState<Array<{ tenantId: string; subdomain: string; name: string }>>([]);

  function gotoPos(subdomain: string, token: string) {
    window.location.href = `https://${subdomain}.${BASE_DOMAIN}/pos/login-email#sso=${encodeURIComponent(token)}`;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await api.login(email, password);
      if (r.requiresTenantSelection && Array.isArray(r.memberships)) {
        setChoices(r.memberships.map((m: any) => ({
          tenantId: m.tenantId,
          subdomain: m.subdomain ?? m.tenant?.subdomain,
          name: m.tenantName ?? m.tenant?.name ?? m.subdomain,
        })));
      } else if (r.token && r.user?.tenant?.subdomain) {
        gotoPos(r.user.tenant.subdomain, r.token);
      } else {
        setError('Bu hesaba bağlı restoran bulunamadı.');
      }
    } catch (err: any) {
      setError(err.message || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  }

  // Çok üyelik: seçilen restoran için tenant-scoped token al, POS'una git
  async function pickTenant(c: { tenantId: string; subdomain: string }) {
    setError('');
    setLoading(true);
    try {
      const r = await api.login(email, password, c.tenantId);
      if (r.token) gotoPos(c.subdomain, r.token);
      else setError('Giriş tamamlanamadı, tekrar dene.');
    } catch (err: any) {
      setError(err.message || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-x flex justify-center py-20">
      <div className="w-full max-w-md">
        <h1 className="text-center text-3xl font-bold text-ink">Giriş yap</h1>
        <p className="mt-2 text-center text-ink-soft">Restoran panelinize erişin.</p>

        {choices.length > 0 ? (
          <div className="card mt-8 space-y-2">
            <p className="mb-2 text-sm font-medium text-ink-soft">Hangi restoran?</p>
            {choices.map((c) => (
              <button key={c.tenantId} disabled={loading} onClick={() => pickTenant(c)} className="btn-ghost w-full justify-between">
                <span>{c.name}</span>
                <span className="text-xs text-ink-muted">{c.subdomain}.{BASE_DOMAIN}</span>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={submit} className="card mt-8 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-soft">E-posta</span>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-soft">Şifre</span>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Giriş yapılıyor…</> : <><LogIn size={18} /> Giriş yap</>}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-ink-muted">
          Hesabınız yok mu? <a href="/signup" className="font-semibold text-brand-600">Ücretsiz başlayın</a>
        </p>
      </div>
    </div>
  );
}
