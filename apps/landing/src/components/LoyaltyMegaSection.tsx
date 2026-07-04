// Sadakat programı — ana sayfanın üst sıralarında ÖN PLANDA gösterilir.
// Üye olmaya teşvik eden büyük, eye-catching bölüm. Tüm ikonlar lucide.

import { motion } from 'framer-motion'
import { Star, Gift, Cake, Sparkles, ShoppingBag, Smartphone } from 'lucide-react'
import { useLoyalty } from '../lib/loyaltyStore'
import { RevealOnScroll } from './RevealOnScroll'

export const LoyaltyMegaSection = () => {
  const { member } = useLoyalty()

  // Zaten üyeyse farklı kart göster (mevcut puan + sipariş ver)
  if (member) {
    return (
      <section className="py-16 px-4 bg-gradient-to-br from-emerald-50 to-amber-50">
        <div className="container-diner">
          <RevealOnScroll>
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-8 md:p-10 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest mb-2 text-amber-300">
                    HOŞ GELDİN
                  </div>
                  <h2 className="font-heading font-bold text-3xl md:text-4xl mb-4">
                    Merhaba, {member.name || 'Üye'}!
                  </h2>
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-4 inline-flex items-center gap-6">
                    <div>
                      <div className="text-4xl font-bold">{member.totalPoints}</div>
                      <div className="text-xs uppercase tracking-wider opacity-80">Puan</div>
                    </div>
                    <div className="w-px h-12 bg-white/30" />
                    <div>
                      <div className="text-2xl font-bold">{Math.floor(member.totalPoints / 100) * 10}₺</div>
                      <div className="text-xs uppercase tracking-wider opacity-80">Kullanılabilir</div>
                    </div>
                  </div>
                </div>
                <div className="text-center md:text-right">
                  <a href="/menu" className="inline-flex items-center gap-2 bg-white text-emerald-600 font-display font-bold text-xl px-8 py-4 rounded-full shadow-lg hover:shadow-2xl transition-shadow">
                    <ShoppingBag className="w-5 h-5" /> Sipariş Ver →
                  </a>
                  <p className="mt-3 text-sm opacity-80">Puanını kullan, indirimden faydalan</p>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>
    )
  }

  // Üye değilse — ÜYE OL'a teşvik eden büyük bölüm
  return (
    <section className="py-16 px-4 bg-gradient-to-br from-amber-50 to-red-50 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-amber-300/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-red-300/20 rounded-full blur-3xl" />

      <div className="container-diner relative z-10">
        <RevealOnScroll>
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-display font-extrabold tracking-widest mb-3" style={{ backgroundColor: '#0f172a', color: '#fbbf24' }}>
              <Star className="w-3.5 h-3.5" fill="currentColor" /> ÜCRETSİZ SADAKAT PROGRAMI
            </span>
            <h2 className="font-heading font-bold text-4xl md:text-5xl text-foreground mb-3 leading-tight">
              Üye Ol, <span className="text-primary">Her Siparişte Kazan</span>
            </h2>
            <p className="font-body text-lg text-foreground-muted max-w-2xl mx-auto">
              Saniyeler içinde üye ol — her siparişte puan biriktir, indirim, hediye ve sürpriz kazançlardan yararlan
            </p>
          </div>
        </RevealOnScroll>

        {/* Faydalar grid — 4'lü */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            {
              Icon: Star,
              title: 'Her ₺10 = 1 Puan',
              desc: 'Otomatik biriken puanlarla indirimli alışveriş',
              color: '#fbbf24',
            },
            {
              Icon: Gift,
              title: '50 Hoşgeldin Puanı',
              desc: 'İlk üyeliğe anında hediye 50 puan',
              color: '#dc2626',
            },
            {
              Icon: Cake,
              title: 'Doğum Günü Hediyesi',
              desc: 'Senin günün, bizim hediyemiz — özel kupon',
              color: '#a855f7',
            },
            {
              Icon: Sparkles,
              title: 'Sürpriz Kuponlar',
              desc: 'Çark, kazı kazan, sürpriz kutu — kazandıran oyunlar',
              color: '#10b981',
            },
          ].map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4 }}
              className="bg-white rounded-2xl p-5 shadow-card text-center"
            >
              <div
                className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ backgroundColor: `${b.color}20`, color: b.color }}
              >
                <b.Icon className="w-7 h-7" strokeWidth={2} />
              </div>
              <h3 className="font-display font-bold text-base text-foreground mb-1">
                {b.title}
              </h3>
              <p className="text-xs text-foreground-muted leading-snug">
                {b.desc}
              </p>
            </motion.div>
          ))}
        </div>

        {/* CTA Banner */}
        <RevealOnScroll>
          <div
            className="relative overflow-hidden rounded-3xl p-6 md:p-8 text-center text-white shadow-xl"
            style={{ background: 'linear-gradient(135deg, #dc2626 0%, #bb1e10 50%, #8b1a1a 100%)' }}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-yellow-300/15 rounded-full blur-3xl" />
            <div className="relative z-10 max-w-2xl mx-auto">
              <h3 className="font-heading font-bold text-2xl md:text-3xl mb-3">
                30 saniyede üye ol — <span style={{ color: '#fbbf24' }}>50 puanı hediye al</span>
              </h3>
              <p className="text-white/90 text-sm md:text-base mb-5">
                Sadece email ya da telefon — şifre, doğrulama, karmaşa yok. Hemen sipariş ver, anında kazan.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="/menu"
                  className="inline-flex items-center justify-center gap-2 bg-white text-primary font-display font-extrabold text-lg px-8 py-4 rounded-full shadow-lg hover:shadow-2xl transition-all"
                >
                  <ShoppingBag className="w-5 h-5" /> Hemen Sipariş Ver & Üye Ol
                </a>
                <a
                  href="#app-download"
                  className="inline-flex items-center justify-center gap-2 bg-white/15 backdrop-blur-sm border-2 border-white/40 text-white font-display font-bold text-lg px-8 py-4 rounded-full hover:bg-white/25 transition-all"
                >
                  <Smartphone className="w-5 h-5" /> Mobil Uygulamayı İndir
                </a>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  )
}
