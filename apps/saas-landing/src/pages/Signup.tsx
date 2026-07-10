// Kayıt sayfası — ana sayfanın (otorder-canli prototipi) görsel dilinde:
// üstte seçilebilir plan kartları (radio davranışı), altta tek kolon form.
// Mantık korunur: ?plan= param, api.plans(), subdomain debounce kontrolü,
// şifresiz kayıt (api.signup) ve "mailini kontrol et" başarı ekranı.
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, BASE_DOMAIN, Plan } from '../lib/api';
import { IcBell, IcBolt, IcCheck, IcQr, IcX } from '../components/icons';
import './signup.css';

type SubState = 'idle' | 'checking' | 'ok' | 'taken';

// Kart üzerindeki özellik satırları (Home'daki adisyon kalemleriyle uyumlu)
const CARD_LINES: Array<{ label: string; has: (p: Plan) => boolean }> = [
  { label: 'POS + Mutfak ekranı', has: () => true },
  { label: 'Sipariş sitesi + QR menü', has: () => true },
  { label: 'Sadakat + kampanyalar', has: (p) => !!p.features.loyalty },
  { label: 'Analitik raporlar', has: (p) => !!p.features.analytics },
  { label: 'WhatsApp modülü bağlama', has: (p) => !!p.features.whatsappLink },
  { label: 'Yapay zekâ WhatsApp asistanı', has: (p) => !!p.features.whatsappAI },
];

const SLOGANS: Record<string, string> = {
  STARTER: 'Kasa, mutfak ve sipariş sitesi: sağlam başlangıç.',
  PRO: 'Sadakat, kampanya ve raporlarla büyüyen restoran.',
  AI: 'Siparişi yapay zekâ alsın, ekip servise odaklansın.',
};

function sloganFor(p: Plan) {
  if (SLOGANS[p.key]) return SLOGANS[p.key];
  if (p.features.whatsappAI) return 'Siparişi yapay zekâ alsın, ekip servise odaklansın.';
  return 'Restoranın için tam donanım, tek abonelik.';
}

export default function Signup() {
  const [params] = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    restaurantName: '',
    subdomain: '',
    planKey: (params.get('plan') || 'STARTER').toUpperCase(),
  });
  const [subState, setSubState] = useState<SubState>('idle');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ url: string; email: string } | null>(null);

  useEffect(() => {
    api.plans().then((r) => setPlans(r.plans)).catch(() => {});
  }, []);

  // ?plan= geçersizse (ör. eski bir link) ilk plana düş — eski <select> de
  // görsel olarak ilk seçeneği gösteriyordu, davranış eşleniyor.
  useEffect(() => {
    if (plans.length && !plans.some((p) => p.key === form.planKey)) {
      setForm((f) => ({ ...f, planKey: plans[0].key }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans]);

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

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: k === 'subdomain' ? e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') : e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (subState === 'taken') return setError('Bu subdomain alınmış, başka bir tane seçin.');
    setSubmitting(true);
    try {
      const r = await api.signup(form);
      setDone({ url: r.loginUrl, email: form.email });
    } catch (err: any) {
      setError(err.message || 'Kayıt başarısız');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="otr su">
        <div className="wrap su-done">
          <div className="su-done-ic" aria-hidden="true"><IcCheck /></div>
          <h1 className="su-title">Restoranınız hazır.</h1>
          <p className="su-done-url">
            <a href={done.url}>{done.url.replace('https://', '')}</a> kuruldu, sizi bekliyor.
          </p>
          <div className="su-mailbox">
            <p className="su-mailbox-t"><IcBell className="hi" /> Şimdi e-postanı kontrol et</p>
            <p>
              <b>{done.email}</b> adresine şifre belirleme bağlantısı gönderdik.
              Şifreni kurduktan sonra panele giriş yapabilirsin. (Gelmezse spam klasörüne bak.)
            </p>
          </div>
        </div>
      </div>
    );
  }

  const selected = plans.find((p) => p.key === form.planKey);

  return (
    <div className="otr su">
      <div className="wrap">
        <header className="su-head su-in">
          <span className="kicker">Kayıt · 7 gün ücretsiz</span>
          <h1 className="su-title">Paketini seç, restoranını aç.</h1>
          <p className="su-lead">
            Bilgilerini doldur,
            <b className="mono"> {form.subdomain || 'restoraniniz'}.{BASE_DOMAIN} </b>
            dakikalar içinde yayında. Kredi kartı gerekmez.
          </p>
        </header>

        <div className="su-plans su-in" role="radiogroup" aria-label="Paket seçimi">
          {plans.length === 0 && <PlanSkeletons />}
          {plans.map((p) => (
            <PlanCard
              key={p.key}
              plan={p}
              selected={p.key === form.planKey}
              onSelect={() => setForm((f) => ({ ...f, planKey: p.key }))}
            />
          ))}
        </div>

        <p className="su-trust su-in">
          <span><IcCheck className="hi" /> 7 gün ücretsiz dene</span>
          <span><IcCheck className="hi" /> Kart gerekmez</span>
          <span><IcCheck className="hi" /> Dilediğinde iptal</span>
        </p>

        <form onSubmit={submit} className="su-form su-in">
          <div className="su-summary">
            <div>
              <span className="su-sum-k mono">SEÇİLEN PAKET</span>
              <b className="su-sum-name">{selected ? selected.name : 'Yükleniyor…'}</b>
            </div>
            <div className="su-sum-right">
              {selected && (
                <span className="mono su-sum-price">
                  ₺{selected.monthlyPrice.toLocaleString('tr-TR')}<i>/ay</i>
                </span>
              )}
              <span className="su-sum-note">İlk 7 gün ücretsiz</span>
            </div>
          </div>

          <Field label="Ad Soyad">
            <input className="su-input" value={form.name} onChange={set('name')} autoComplete="name" required />
          </Field>
          <Field label="Restoran Adı">
            <input className="su-input" value={form.restaurantName} onChange={set('restaurantName')} placeholder="Örn. Roma Pizzeria" required />
          </Field>
          <Field label="Sipariş siteniz">
            <div className="su-domain">
              <input placeholder="restoraniniz" value={form.subdomain} onChange={set('subdomain')} required minLength={3} aria-label="Subdomain" />
              <span className="su-domain-sfx mono">.{BASE_DOMAIN}</span>
            </div>
            <SubHint state={subState} sub={form.subdomain} />
          </Field>
          <Field label="E-posta">
            <input type="email" className="su-input" value={form.email} onChange={set('email')} autoComplete="email" required />
            <p className="su-hint">Şifre belirleme bağlantısı bu adrese gönderilir.</p>
          </Field>

          {error && <p className="su-error" role="alert">{error}</p>}

          <button type="submit" disabled={submitting || subState === 'taken'} className="su-cta">
            {submitting
              ? <><span className="su-spinner" aria-hidden="true" /> Oluşturuluyor…</>
              : <><IcBolt className="hi" /> Restoranımı oluştur · 7 gün ücretsiz</>}
          </button>
          <p className="su-fine"><IcQr className="hi" /> Kurulumla birlikte QR menünüz ve sipariş siteniz hazır gelir.</p>
        </form>
      </div>
    </div>
  );
}

function PlanCard({ plan, selected, onSelect }: { plan: Plan; selected: boolean; onSelect: () => void }) {
  const featured = !!plan.features.whatsappAI;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`su-card${selected ? ' sel' : ''}${featured ? ' feat' : ''}`}
    >
      {featured && <span className="su-badge">EN ÇOK TERCİH</span>}
      <span className="su-pick" aria-hidden="true"><IcCheck /></span>
      <span className="su-meta mono">OTORDER.COM · PAKET</span>
      <h3>{plan.name}</h3>
      <p className="su-slogan">{sloganFor(plan)}</p>
      <div className="su-price">
        <span className="amt mono">₺{plan.monthlyPrice.toLocaleString('tr-TR')}</span>
        <span className="per">/ay</span>
      </div>
      <p className="su-annual">yıllıkta ₺{plan.annualPrice.toLocaleString('tr-TR')} · 2 ay hediye</p>
      <ul className="su-feats">
        {CARD_LINES.map(({ label, has }) => {
          const on = has(plan);
          return (
            <li key={label} className={on ? '' : 'off'}>
              {on ? <IcCheck className="hi" /> : <IcX className="hi" />}
              <span>{label}</span>
            </li>
          );
        })}
      </ul>
    </button>
  );
}

function PlanSkeletons() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div key={i} className="su-card su-skel" aria-hidden="true">
          <span className="sk" style={{ width: '46%', height: 10 }} />
          <span className="sk" style={{ width: '58%', height: 22, marginTop: 12 }} />
          <span className="sk" style={{ width: '88%', height: 12, marginTop: 12 }} />
          <span className="sk" style={{ width: '52%', height: 32, marginTop: 16 }} />
          <span className="sk-line" />
          {[0, 1, 2, 3].map((j) => (
            <span key={j} className="sk" style={{ width: `${82 - j * 9}%`, height: 11, marginTop: 10 }} />
          ))}
        </div>
      ))}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="su-field">
      <span className="su-label">{label}</span>
      {children}
    </label>
  );
}

function SubHint({ state, sub }: { state: SubState; sub: string }) {
  if (state === 'checking')
    return <p className="su-hint"><span className="su-spinner dark" aria-hidden="true" /> Kontrol ediliyor…</p>;
  if (state === 'ok')
    return <p className="su-hint ok"><IcCheck className="hi" /> {sub}.{BASE_DOMAIN} uygun</p>;
  if (state === 'taken')
    return <p className="su-hint bad"><IcX className="hi" /> Bu subdomain alınmış</p>;
  return null;
}
