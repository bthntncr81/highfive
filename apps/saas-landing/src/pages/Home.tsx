import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Monitor, ChefHat, Smartphone, Gift, BarChart3, MessageCircle, Check, ArrowRight, Sparkles,
} from 'lucide-react';
import { api, Plan } from '../lib/api';

const FEATURES = [
  { icon: Monitor, title: 'POS Yönetim Paneli', desc: 'Masa, sipariş, ödeme ve personel — hepsi tek ekranda, hızlı ve sezgisel.' },
  { icon: ChefHat, title: 'Mutfak Ekranı (KDS)', desc: 'Siparişler mutfağa anında düşer; hazırlık akışı canlı takip edilir.' },
  { icon: Smartphone, title: 'Online Sipariş Sitesi', desc: 'Restoranınıza özel, markanızla tasarlanmış sipariş sayfası ve QR menü.' },
  { icon: Gift, title: 'Sadakat & Kampanya', desc: 'Puan, kupon, mystery box ve oyunlarla müşterinizi geri getirin.' },
  { icon: BarChart3, title: 'Analitik & Raporlar', desc: 'Ciro, ürün ve saat bazlı analiz ile işletmenizi verilerle yönetin.' },
  { icon: MessageCircle, title: 'WhatsApp Sipariş Modülü', desc: 'İsteğe bağlı modül ile WhatsApp siparişlerini doğrudan POS’a bağlayın.' },
];

export default function Home() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    api.plans().then((r) => setPlans(r.plans)).catch(() => setPlans([]));
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 to-white" />
        <div className="container-x py-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-semibold text-brand-700">
            <Sparkles size={16} /> 14 gün ücretsiz — kredi kartı gerekmez
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight text-ink sm:text-6xl">
            Restoranınızı dakikalar içinde <span className="text-brand-600">dijitalleştirin</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-soft">
            POS, mutfak ekranı, size özel online sipariş sitesi, sadakat ve kampanyalar — hepsi tek
            panelde. OtOrder ile kurulum saatler değil dakikalar sürer.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/signup" className="btn-primary text-base">
              Ücretsiz Başla <ArrowRight size={18} />
            </Link>
            <a href="#pricing" className="btn-ghost text-base">Fiyatları Gör</a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container-x py-16">
        <h2 className="text-center text-3xl font-bold text-ink">Tek platform, eksiksiz mutfak</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <f.icon size={22} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-ink">{f.title}</h3>
              <p className="mt-2 text-sm text-ink-soft">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-slate-50 py-16">
        <div className="container-x">
          <h2 className="text-center text-3xl font-bold text-ink">Basit, şeffaf fiyatlandırma</h2>
          <div className="mt-6 flex items-center justify-center gap-3">
            <span className={!annual ? 'font-semibold text-ink' : 'text-ink-muted'}>Aylık</span>
            <button
              onClick={() => setAnnual((a) => !a)}
              className="relative h-7 w-12 rounded-full bg-brand-600 transition"
              aria-label="Yıllık/aylık geçiş"
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${annual ? 'left-6' : 'left-1'}`} />
            </button>
            <span className={annual ? 'font-semibold text-ink' : 'text-ink-muted'}>
              Yıllık <span className="text-brand-600">(2 ay hediye)</span>
            </span>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {plans.length === 0 && (
              <p className="col-span-3 text-center text-ink-muted">Paketler yükleniyor…</p>
            )}
            {plans.map((p, i) => {
              const price = annual ? p.annualPrice : p.monthlyPrice;
              const featured = i === 1;
              return (
                <div
                  key={p.key}
                  className={`card flex flex-col ${featured ? 'ring-2 ring-brand-500 shadow-glow' : ''}`}
                >
                  {featured && (
                    <span className="mb-3 w-fit rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white">
                      EN POPÜLER
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-ink">{p.name}</h3>
                  <div className="mt-3">
                    <span className="text-4xl font-extrabold text-ink">
                      {price === 0 ? 'Ücretsiz' : `₺${price.toLocaleString('tr-TR')}`}
                    </span>
                    {price > 0 && <span className="text-ink-muted">/{annual ? 'yıl' : 'ay'}</span>}
                  </div>
                  <ul className="mt-5 flex-1 space-y-2 text-sm text-ink-soft">
                    <PlanRow ok label={`${p.maxLocations === -1 ? 'Sınırsız' : p.maxLocations} şube`} />
                    <PlanRow ok label={`${p.maxUsers === -1 ? 'Sınırsız' : p.maxUsers} kullanıcı`} />
                    <PlanRow ok={p.features.loyalty} label="Sadakat programı" />
                    <PlanRow ok={p.features.campaigns} label="Kampanyalar" />
                    <PlanRow ok={p.features.analytics} label="Analitik & raporlar" />
                    <PlanRow ok={p.features.whatsappLink} label="WhatsApp modülü bağlama" />
                    <PlanRow ok={p.features.brandedApp} label="Markalı mobil uygulama" />
                    <PlanRow ok={p.features.customLanding} label="Özel tasarım landing" />
                  </ul>
                  <Link to={`/signup?plan=${p.key}`} className={`mt-6 ${featured ? 'btn-primary' : 'btn-ghost'}`}>
                    {p.name} ile Başla
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-x py-20 text-center">
        <h2 className="text-3xl font-bold text-ink">Bugün başlayın, 14 gün ücretsiz</h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-soft">
          Kurulum yok, kart yok. Subdomain’inizi seçin, menünüzü yükleyin, siparişleri almaya başlayın.
        </p>
        <Link to="/signup" className="btn-primary mt-6 text-base">
          Restoranımı Oluştur <ArrowRight size={18} />
        </Link>
      </section>
    </>
  );
}

function PlanRow({ ok, label }: { ok?: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-2 ${ok ? '' : 'text-slate-300 line-through'}`}>
      <Check size={16} className={ok ? 'text-brand-600' : 'text-slate-300'} />
      {label}
    </li>
  );
}
