// Mobile App indirme bölümü — iOS + Android badge + QR kod.
// Ana sayfada üst sıralarda gösterilir, üye olmaya teşvik eder.

import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { Smartphone, Star, Gift, Sparkles, Rocket, Camera } from 'lucide-react'
import { RevealOnScroll } from './RevealOnScroll'
import { useContent } from '../lib/contentStore'

export const AppDownload = () => {
  const { content } = useContent()
  const APP_STORE_URL = content.site.appStoreUrl || ''
  const PLAY_STORE_URL = content.site.playStoreUrl || ''
  const APP_LANDING = content.site.appLandingUrl || APP_STORE_URL || PLAY_STORE_URL
  const brand = content.site.name || 'Markamız'

  // Markalı mobil app (Kurumsal paket) yoksa bu bölüm gösterilmez.
  if (!APP_STORE_URL && !PLAY_STORE_URL) return null

  return (
    <section className="relative overflow-hidden py-20 px-4" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />

      <div className="container-diner relative z-10">
        <div className="grid lg:grid-cols-5 gap-10 items-center">
          {/* SOL — kopya + butonlar */}
          <div className="lg:col-span-3">
            <RevealOnScroll>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-display font-bold tracking-widest mb-4" style={{ backgroundColor: '#fbbf24', color: '#0f172a' }}>
                <Smartphone className="w-3.5 h-3.5" /> MOBİL UYGULAMA
              </span>
              <h2 className="font-heading font-bold text-4xl md:text-5xl text-white mb-4 leading-tight">
                Uygulamadan Sipariş Ver,<br />
                <span style={{ color: '#fbbf24' }}>Hep Daha Çok Kazan</span>
              </h2>
              <p className="font-body text-lg text-white/80 mb-6 max-w-xl">
                {brand} mobil uygulamasıyla daha hızlı sipariş ver, otomatik puan kazan, sürpriz kuponlar aç ve sadece uygulamaya özel kampanyalardan yararlan.
              </p>

              {/* Faydalar */}
              <div className="grid sm:grid-cols-2 gap-3 mb-8 max-w-xl">
                {[
                  { Icon: Star, text: 'Her ₺10 = 1 puan' },
                  { Icon: Gift, text: 'Doğum gününe özel hediye' },
                  { Icon: Sparkles, text: 'Anlık sürpriz kuponlar' },
                  { Icon: Rocket, text: 'Tek tuşla tekrar sipariş' },
                ].map((b, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2"
                  >
                    <b.Icon className="w-5 h-5" style={{ color: '#fbbf24' }} strokeWidth={2} />
                    <span className="text-sm text-white font-display font-semibold">{b.text}</span>
                  </motion.div>
                ))}
              </div>

              {/* Store badges */}
              <div className="flex flex-wrap gap-3">
                {APP_STORE_URL && (
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-white text-black px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
                >
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-[10px] uppercase tracking-wider opacity-70">App Store'da</div>
                    <div className="font-display font-bold text-lg leading-tight">İndir</div>
                  </div>
                </a>
                )}
                {PLAY_STORE_URL && (
                <a
                  href={PLAY_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-white text-black px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
                >
                  <svg className="w-8 h-8" viewBox="0 0 24 24">
                    <path fill="#34a853" d="M3.75 20.5V3.5l13 8.5-13 8.5z"/>
                    <path fill="#fbbf24" d="m13.75 12 4-2.6L20 13l-2.25 1-4-2z" opacity="0.9"/>
                    <path fill="#ea4335" d="M3.75 3.5l10 6.4-1.5 1L3.75 3.5z"/>
                    <path fill="#4285f4" d="M3.75 20.5l8.5-7.4 1.5 1-10 6.4z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-[10px] uppercase tracking-wider opacity-70">Google Play'de</div>
                    <div className="font-display font-bold text-lg leading-tight">İndir</div>
                  </div>
                </a>
                )}
              </div>
            </RevealOnScroll>
          </div>

          {/* SAĞ — telefon mockup + QR */}
          <div className="lg:col-span-2">
            <RevealOnScroll delay={0.2}>
              <div className="relative flex flex-col items-center">
                {/* QR Card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="bg-white rounded-3xl p-6 shadow-2xl"
                  style={{ borderTop: '4px solid #fbbf24' }}
                >
                  <div className="text-center mb-3">
                    <div className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-amber-700 mb-0.5">
                      <Camera className="w-3 h-3" /> KAMERANI AÇ
                    </div>
                    <div className="text-sm font-display font-bold text-foreground">
                      Telefonunla Tara
                    </div>
                  </div>
                  <div className="rounded-2xl overflow-hidden border-2 border-gray-100 p-3 bg-white">
                    <QRCodeSVG
                      value={APP_LANDING}
                      size={180}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#0f172a"
                    />
                  </div>
                  <div className="mt-3 text-center">
                    <div className="text-[10px] text-foreground-muted">
                      iOS + Android otomatik yönlendirme
                    </div>
                  </div>
                </motion.div>

                {/* Floating chip */}
                <div
                  className="absolute -top-3 -right-3 rounded-full px-3 py-1.5 text-xs font-display font-extrabold shadow-lg"
                  style={{ backgroundColor: '#fbbf24', color: '#0f172a' }}
                >
                  ✨ ÜCRETSİZ
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </div>
    </section>
  )
}
