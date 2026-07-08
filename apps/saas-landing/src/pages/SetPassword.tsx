import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Loader2, KeyRound, X } from 'lucide-react';
import { api } from '../lib/api';

// Şifre belirleme / sıfırlama — /sifre-belirle?token=...
// Signup (SETUP) ve şifremi-unuttum (RESET) mailleri buraya yönlendirir.
export default function SetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [email, setEmail] = useState('');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ loginUrl: string } | null>(null);

  useEffect(() => {
    if (!token) { setChecking(false); setValid(false); return; }
    api.checkPasswordToken(token)
      .then((r) => { setValid(r.valid); if (r.email) setEmail(r.email); })
      .catch(() => setValid(false))
      .finally(() => setChecking(false));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (p1.length < 6) return setError('Şifre en az 6 karakter olmalı.');
    if (p1 !== p2) return setError('Şifreler eşleşmiyor.');
    setSubmitting(true);
    try {
      const r = await api.setPassword(token, p1);
      setDone({ loginUrl: r.loginUrl });
    } catch (err: any) {
      setError(err.message || 'Şifre kaydedilemedi');
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <div className="container-x py-24 text-center text-ink-soft">
        <Loader2 size={28} className="mx-auto animate-spin" />
        <p className="mt-4">Bağlantı kontrol ediliyor…</p>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="container-x py-24 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-red-600"><X size={30} /></div>
        <h1 className="mt-6 text-2xl font-bold text-ink">Bağlantı geçersiz ya da süresi dolmuş</h1>
        <p className="mt-3 text-ink-soft">Yeni bir bağlantı almak için şifre sıfırlama isteyebilirsin.</p>
        <ForgotForm />
      </div>
    );
  }

  if (done) {
    return (
      <div className="container-x py-24 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-green-50 text-green-600"><Check size={30} /></div>
        <h1 className="mt-6 text-2xl font-bold text-ink">Şifren hazır! 🎉</h1>
        <p className="mt-3 text-ink-soft">Artık panele giriş yapabilirsin.</p>
        <a href={done.loginUrl} className="btn-primary mt-8 text-base">Panele giriş yap</a>
      </div>
    );
  }

  return (
    <div className="container-x flex justify-center py-16">
      <form onSubmit={submit} className="card w-full max-w-md space-y-4">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-100 text-brand-600"><KeyRound size={26} /></div>
        <h1 className="text-center text-2xl font-bold text-ink">Şifreni belirle</h1>
        {email && <p className="text-center text-sm text-ink-muted">{email}</p>}
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-soft">Yeni şifre</span>
          <input type="password" className="input" value={p1} onChange={(e) => setP1(e.target.value)} required minLength={6} autoFocus />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-soft">Yeni şifre (tekrar)</span>
          <input type="password" className="input" value={p2} onChange={(e) => setP2(e.target.value)} required minLength={6} />
        </label>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
          {submitting ? <><Loader2 size={18} className="animate-spin" /> Kaydediliyor…</> : 'Şifreyi kaydet'}
        </button>
      </form>
    </div>
  );
}

// Geçersiz token ekranında gömülü "şifremi unuttum" formu
function ForgotForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try { await api.forgotPassword(email); } catch { /* her durumda başarılı gösterilir */ }
    setSent(true);
    setBusy(false);
  }

  if (sent) {
    return <p className="mx-auto mt-6 max-w-md rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">Hesap varsa sıfırlama bağlantısı e-postana gönderildi.</p>;
  }
  return (
    <form onSubmit={submit} className="mx-auto mt-6 flex max-w-md gap-2">
      <input type="email" className="input" placeholder="E-posta adresin" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <button type="submit" disabled={busy} className="btn-primary whitespace-nowrap disabled:opacity-60">
        {busy ? '…' : 'Link gönder'}
      </button>
    </form>
  );
}
