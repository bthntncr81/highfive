import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { CreditCard, CheckCircle2, AlertTriangle, Clock, X, Loader2, ShieldCheck } from 'lucide-react';

// Abonelik & Ödeme — /billing. Deneme durumu, plan seçimi (iyzico Abonelik
// checkout'u), işlem geçmişi ve iptal. SUSPENDED durumda da çalışır:
// /api/platform/* tenant kilidinden muaf, owner token'ı yeterli.

interface PlanInfo {
  key: string; name: string; monthlyPrice: number; annualPrice: number;
  maxLocations: number; maxUsers: number; features: Record<string, boolean>;
}
interface SubInfo {
  status: string; cycle: 'MONTHLY' | 'ANNUAL'; currentPeriodEnd: string | null;
  autoRenew: boolean; failedAttempts: number; plan: { key: string; name: string };
}
interface TenantInfo { status: string; trialEndsAt: string | null; name?: string }
interface Tx { id: string; type: string; amount: number; success: boolean; createdAt: string; errorMessage?: string | null }

const FEATURE_LABELS: Record<string, string> = {
  loyalty: 'Sadakat programı', campaigns: 'Kampanyalar', analytics: 'Analitik',
  whatsappLink: 'WhatsApp modülü bağlama', brandedApp: 'Markalı mobil app',
  customLanding: 'Özel tasarım landing', marketplace: 'Pazaryeri entegrasyonları',
};

export default function Billing() {
  const { token } = useAuth();
  const [params, setParams] = useSearchParams();
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [cycle, setCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [busyPlan, setBusyPlan] = useState('');
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [checkoutHtml, setCheckoutHtml] = useState('');
  const checkoutRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const [p, s, t] = await Promise.all([
        api.get('/api/platform/billing/plans'),
        api.get('/api/platform/billing/subscription', token!),
        api.get('/api/platform/billing/transactions', token!),
      ]);
      setPlans(p.plans || []);
      setSub(s.subscription || null);
      setTenant(s.tenant || null);
      if (s.subscription?.cycle) setCycle(s.subscription.cycle);
      setTxs((t.transactions || []).slice(0, 10));
    } catch (e: any) {
      setMessage({ type: 'err', text: e.message || 'Abonelik bilgisi yüklenemedi' });
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // iyzico checkout dönüşü (?billing=success|failed)
  useEffect(() => {
    const r = params.get('billing');
    if (!r) return;
    setMessage(r === 'success'
      ? { type: 'ok', text: '🎉 Ödemen alındı — aboneliğin aktif!' }
      : { type: 'err', text: 'Ödeme tamamlanamadı. Tekrar deneyebilirsin.' });
    params.delete('billing');
    setParams(params, { replace: true });
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // checkoutFormContent script içerir — createContextualFragment ile çalıştır.
  useEffect(() => {
    if (!checkoutHtml || !checkoutRef.current) return;
    checkoutRef.current.innerHTML = '';
    const frag = document.createRange().createContextualFragment(checkoutHtml);
    checkoutRef.current.appendChild(frag);
  }, [checkoutHtml]);

  const subscribe = async (planKey: string) => {
    setBusyPlan(planKey);
    setMessage(null);
    try {
      const r = await api.post('/api/platform/billing/subscribe-checkout', { planKey, cycle }, token!);
      if (r.simulated) {
        // SIMULATION: callback'i doğrudan çağır → anında aktive
        await api.post(`/api/platform/billing/checkout-callback?token=${encodeURIComponent(r.token)}`, {});
        setMessage({ type: 'ok', text: 'Abonelik aktifleştirildi (test modu).' });
        await load();
      } else if (r.checkoutFormContent) {
        setCheckoutHtml(r.checkoutFormContent); // iyzico ödeme formu modal'da açılır
      }
    } catch (e: any) {
      setMessage({ type: 'err', text: e.message || 'Abonelik başlatılamadı' });
    } finally {
      setBusyPlan('');
    }
  };

  const cancel = async () => {
    if (!window.confirm('Otomatik yenileme kapatılacak; dönem sonunda hesabın kilitlenir. Emin misin?')) return;
    try {
      await api.post('/api/platform/billing/cancel', {}, token!);
      setMessage({ type: 'ok', text: 'Abonelik iptal edildi — dönem sonuna kadar kullanmaya devam edebilirsin.' });
      await load();
    } catch (e: any) {
      setMessage({ type: 'err', text: e.message || 'İptal başarısız' });
    }
  };

  const daysLeft = tenant?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(tenant.trialEndsAt).getTime() - Date.now()) / 864e5))
    : null;
  const price = (p: PlanInfo) => (cycle === 'ANNUAL' ? p.annualPrice : p.monthlyPrice);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-primary-500" /> Abonelik
        </h1>
        <p className="text-gray-500">Planını yönet, ödemeni yap</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl font-medium ${message.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Durum kartı */}
      <div className="card">
        {tenant?.status === 'TRIAL' && (
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-amber-500" />
            <div>
              <p className="font-bold text-lg">
                Ücretsiz deneme — {daysLeft !== null ? `${daysLeft} gün kaldı` : 'aktif'}
              </p>
              <p className="text-sm text-gray-500">
                Deneme bitmeden planını seç; menün ve siparişlerin aynen kalır.
              </p>
            </div>
          </div>
        )}
        {tenant?.status === 'ACTIVE' && sub && (
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
            <div>
              <p className="font-bold text-lg">{sub.plan.name} — aktif</p>
              <p className="text-sm text-gray-500">
                {sub.currentPeriodEnd ? `Sonraki yenileme: ${new Date(sub.currentPeriodEnd).toLocaleDateString('tr-TR')}` : ''}
                {!sub.autoRenew && ' · otomatik yenileme KAPALI'}
              </p>
            </div>
            {sub.autoRenew && (
              <button onClick={cancel} className="ml-auto text-sm text-red-500 hover:underline">Aboneliği iptal et</button>
            )}
          </div>
        )}
        {(tenant?.status === 'PAST_DUE' || tenant?.status === 'SUSPENDED') && (
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <div>
              <p className="font-bold text-lg text-red-600">
                {tenant.status === 'SUSPENDED' ? 'Hesap askıda — ödeme gerekli' : 'Ödeme alınamadı'}
              </p>
              <p className="text-sm text-gray-500">
                Aşağıdan planını seçip ödemeni yaptığında her şey anında açılır. Verilerin güvende.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Döngü seçici */}
      <div className="flex items-center gap-2">
        {(['MONTHLY', 'ANNUAL'] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCycle(c)}
            className={`px-5 py-2 rounded-full text-sm font-bold transition ${cycle === c ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {c === 'MONTHLY' ? 'Aylık' : 'Yıllık (2 ay hediye)'}
          </button>
        ))}
      </div>

      {/* Plan kartları */}
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const isCurrent = sub?.plan.key === p.key && (tenant?.status === 'ACTIVE');
          return (
            <div key={p.key} className={`card flex flex-col ${isCurrent ? 'ring-2 ring-primary-500' : ''}`}>
              <h3 className="font-bold text-lg">{p.name}</h3>
              <p className="mt-1">
                <span className="text-3xl font-extrabold">₺{price(p).toLocaleString('tr-TR')}</span>
                <span className="text-gray-500 text-sm">/{cycle === 'ANNUAL' ? 'yıl' : 'ay'}</span>
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-gray-600 flex-1">
                <li>• Sınırsız kullanıcı</li>
                {Object.entries(p.features || {}).filter(([, v]) => v).map(([k]) => (
                  <li key={k}>• {FEATURE_LABELS[k] || k}</li>
                ))}
              </ul>
              <button
                onClick={() => subscribe(p.key)}
                disabled={!!busyPlan || isCurrent}
                className={`mt-4 w-full rounded-xl py-2.5 font-bold transition ${isCurrent ? 'bg-gray-100 text-gray-400' : 'bg-primary-500 text-white hover:bg-primary-600'} disabled:opacity-60`}
              >
                {busyPlan === p.key ? <Loader2 className="w-4 h-4 animate-spin inline" /> : isCurrent ? 'Mevcut planın' : sub?.plan.key ? 'Bu plana geç' : 'Abone ol'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Ekstralar — her pakete eklenebilir */}
      <div className="card">
        <h2 className="font-semibold mb-1">Ekstralar</h2>
        <p className="text-sm text-gray-500 mb-4">Her pakete eklenebilir — tek seferlik ödeme, abonelikten bağımsız.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            { icon: '🎨', t: 'Özel Tasarım Landing Page', d: 'Markana özel elle tasarlanmış tanıtım sitesi (örn. smashe.otorder.com).' },
            { icon: '📱', t: 'Markalı Mobil Uygulama', d: 'App Store + Google Play\'de kendi adınla; push bildirim ve sadakat dahil.' },
          ].map((x) => (
            <div key={x.t} className="rounded-xl border border-gray-200 p-4">
              <p className="font-semibold">{x.icon} {x.t}</p>
              <p className="mt-1 text-sm text-gray-500">{x.d}</p>
              <p className="mt-2 text-sm"><b>₺24.999</b> tek seferlik</p>
            </div>
          ))}
        </div>
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          🎁 İkisi birden <b>₺44.999</b> — üstüne <b>1 yıllık Pro paket hediye</b> (₺5.990 değerinde).
        </p>
        <p className="mt-3 text-xs text-gray-400">Eklemek için: soft@haberbenim.com adresine yazman yeterli — kurulumden sonra faturana işlenir.</p>
      </div>

      <p className="flex items-center gap-2 text-xs text-gray-400">
        <ShieldCheck className="w-4 h-4" /> Ödemeler iyzico güvencesiyle alınır; kart bilgin bizde saklanmaz.
      </p>

      {/* İşlem geçmişi */}
      {txs.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-3">Son işlemler</h2>
          <div className="divide-y divide-gray-100">
            {txs.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-gray-500">{new Date(t.createdAt).toLocaleDateString('tr-TR')}</span>
                <span className="font-medium">₺{t.amount.toLocaleString('tr-TR')}</span>
                <span className={t.success ? 'text-green-600' : 'text-red-500'}>
                  {t.success ? 'Başarılı' : `Başarısız${t.errorMessage ? ` — ${t.errorMessage}` : ''}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* iyzico checkout modal */}
      {checkoutHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 max-h-[90vh] overflow-auto">
            <button
              onClick={() => { setCheckoutHtml(''); load(); }}
              className="absolute right-3 top-3 rounded-full p-1.5 hover:bg-gray-100"
              aria-label="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="mb-4 font-bold text-lg">Güvenli ödeme — iyzico</h3>
            <div ref={checkoutRef} />
          </div>
        </div>
      )}
    </div>
  );
}
