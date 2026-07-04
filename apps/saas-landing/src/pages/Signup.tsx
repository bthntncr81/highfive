import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, X, Loader2, PartyPopper } from 'lucide-react';
import { api, BASE_DOMAIN, Plan } from '../lib/api';

type SubState = 'idle' | 'checking' | 'ok' | 'taken';

export default function Signup() {
  const [params] = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    restaurantName: '',
    subdomain: '',
    planKey: (params.get('plan') || 'STARTER').toUpperCase(),
  });
  const [subState, setSubState] = useState<SubState>('idle');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ url: string } | null>(null);

  useEffect(() => {
    api.plans().then((r) => setPlans(r.plans)).catch(() => {});
  }, []);

  // Subdomain uygunluk (debounce)
  useEffect(() => {
    const s = form.subdomain.trim().toLowerCase();
    if (!s || s.length < 3) return setSubState('idle');
    setSubState('checking');
    const t = setTimeout(() => {
      api.checkSubdomain(s)
        .then((r) => setSubState(r.available ? 'ok' : 'taken'))
        .catch(() => setSubState('taken'));
    }, 400);
    return () => clearTimeout(t);
  }, [form.subdomain]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: k === 'subdomain' ? e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') : e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (subState === 'taken') return setError('Bu subdomain alınmış, başka bir tane seçin.');
    setSubmitting(true);
    try {
      const r = await api.signup(form);
      // Token'ı subdomain SPA'sına devretmek için query ile yönlendirilebilir.
      setDone({ url: `${r.loginUrl}?welcome=1` });
    } catch (err: any) {
      setError(err.message || 'Kayıt başarısız');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="container-x py-24 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-100 text-brand-600">
          <PartyPopper size={30} />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-ink">Restoranınız hazır! 🎉</h1>
        <p className="mt-3 text-ink-soft">Panelinize giderek menünüzü yükleyin ve siparişleri almaya başlayın.</p>
        <a href={done.url} className="btn-primary mt-8 text-base">Panele Git</a>
      </div>
    );
  }

  return (
    <div className="container-x grid gap-10 py-16 lg:grid-cols-2">
      <div>
        <h1 className="text-3xl font-bold text-ink">Restoranınızı oluşturun</h1>
        <p className="mt-3 text-ink-soft">
          14 gün ücretsiz. Kredi kartı gerekmez. Aşağıdaki bilgileri doldurun, saniyeler içinde
          <span className="font-semibold text-brand-600"> {form.subdomain || 'restoraniniz'}.{BASE_DOMAIN}</span> yayında.
        </p>
        <ul className="mt-6 space-y-3 text-sm text-ink-soft">
          {['POS + Mutfak ekranı', 'Size özel online sipariş sitesi', 'QR menü & masa yönetimi'].map((t) => (
            <li key={t} className="flex items-center gap-2"><Check size={16} className="text-brand-600" />{t}</li>
          ))}
        </ul>
      </div>

      <form onSubmit={submit} className="card space-y-4">
        <Field label="Ad Soyad"><input className="input" value={form.name} onChange={set('name')} required /></Field>
        <Field label="Restoran Adı"><input className="input" value={form.restaurantName} onChange={set('restaurantName')} required /></Field>
        <Field label="Subdomain">
          <div className="flex items-center gap-2">
            <input className="input" placeholder="restoraniniz" value={form.subdomain} onChange={set('subdomain')} required minLength={3} />
            <span className="whitespace-nowrap text-sm text-ink-muted">.{BASE_DOMAIN}</span>
          </div>
          <SubHint state={subState} />
        </Field>
        <Field label="E-posta"><input type="email" className="input" value={form.email} onChange={set('email')} required /></Field>
        <Field label="Şifre"><input type="password" className="input" value={form.password} onChange={set('password')} required minLength={6} /></Field>
        <Field label="Paket">
          <select className="input" value={form.planKey} onChange={set('planKey')}>
            {plans.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
          </select>
        </Field>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={submitting || subState === 'taken'} className="btn-primary w-full disabled:opacity-60">
          {submitting ? <><Loader2 size={18} className="animate-spin" /> Oluşturuluyor…</> : 'Ücretsiz Başla'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

function SubHint({ state }: { state: SubState }) {
  if (state === 'checking') return <p className="mt-1 flex items-center gap-1 text-xs text-ink-muted"><Loader2 size={12} className="animate-spin" /> Kontrol ediliyor…</p>;
  if (state === 'ok') return <p className="mt-1 flex items-center gap-1 text-xs text-green-600"><Check size={12} /> Uygun 🎉</p>;
  if (state === 'taken') return <p className="mt-1 flex items-center gap-1 text-xs text-red-600"><X size={12} /> Bu subdomain alınmış</p>;
  return null;
}
