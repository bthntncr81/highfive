// /build — Pizza ya da Sandviç tasarla seçim sayfası.
// Navbar'daki "Tasarla" linki buraya gelir, kullanıcı seçtikten sonra /build/pizza ya da /build/sandwich.

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Pizza, Sandwich, ArrowRight, Sparkles } from 'lucide-react'
import { SectionContainer } from '../components/SectionContainer'
import { RevealOnScroll } from '../components/RevealOnScroll'

export default function BuilderSelect() {
  useEffect(() => {
    document.title = 'Pizza ya da Sandviç Tasarla | HighFive'
    const meta = document.querySelector('meta[name="description"]')
    if (meta)
      meta.setAttribute(
        'content',
        '5 adımda kendi pizzanı ya da sandviçini tasarla — hamur, sos, peynir, içerik. Anlık 2D önizleme.',
      )
  }, [])

  return (
    <main>
      <SectionContainer variant="cream">
        <RevealOnScroll>
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-display font-semibold tracking-wide mb-3">
              <Sparkles className="w-4 h-4" /> KENDİ TASARLA
            </span>
            <h1 className="font-heading font-bold text-4xl md:text-6xl text-foreground mb-3 leading-tight">
              Pizza mı, Sandviç mi?
            </h1>
            <p className="font-body text-lg text-foreground-muted max-w-xl mx-auto">
              Sen seç — biz hazırlayalım. Adım adım kendi lezzetini oluştur, anlık 2D önizleme ile gözünün önünde şekillensin.
            </p>
          </div>
        </RevealOnScroll>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto items-stretch">
          {/* PIZZA */}
          <RevealOnScroll delay={0.05}>
            <Link to="/build/pizza" className="block group h-full">
              <motion.div
                whileHover={{ y: -8, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="relative overflow-hidden rounded-3xl p-8 md:p-12 text-white shadow-2xl h-full flex flex-col"
                style={{ background: 'linear-gradient(135deg, #dc2626 0%, #bb1e10 50%, #8b1a1a 100%)' }}
              >
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-16 -left-12 w-56 h-56 bg-yellow-300/30 rounded-full blur-3xl" />

                <div className="relative z-10 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-6">
                    <Pizza className="w-32 h-32 md:w-40 md:h-40 drop-shadow-2xl" strokeWidth={1.3} />
                    <span className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-display font-bold tracking-wider">
                      5 ADIM
                    </span>
                  </div>
                  <h2 className="font-heading font-bold text-3xl md:text-4xl mb-2">
                    Kendi Pizzanı Tasarla
                  </h2>
                  <p className="font-body text-white/90 text-base md:text-lg mb-6">
                    Hamur → Taban Sos → Peynir → İçerik → Üst Sos
                  </p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {['İnce', 'Klasik', 'Kalın'].map((b) => (
                      <span
                        key={b}
                        className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-semibold"
                      >
                        {b}
                      </span>
                    ))}
                  </div>

                  <div className="inline-flex items-center gap-2 bg-white text-red-600 font-display font-bold text-lg px-7 py-3 rounded-full shadow-lg group-hover:shadow-2xl transition-shadow self-start mt-auto">
                    Pizzaya Başla
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.div>
            </Link>
          </RevealOnScroll>

          {/* SANDVİÇ — aynı kırmızı paleti, ayrı ton */}
          <RevealOnScroll delay={0.12}>
            <Link to="/build/sandwich" className="block group h-full">
              <motion.div
                whileHover={{ y: -8, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="relative overflow-hidden rounded-3xl p-8 md:p-12 text-white shadow-2xl h-full flex flex-col"
                style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 50%, #7f1d1d 100%)' }}
              >
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-16 -left-12 w-56 h-56 bg-amber-300/30 rounded-full blur-3xl" />

                <div className="relative z-10 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-6">
                    <Sandwich className="w-32 h-32 md:w-40 md:h-40 drop-shadow-2xl" strokeWidth={1.3} />
                    <span className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-display font-bold tracking-wider">
                      5 ADIM
                    </span>
                  </div>
                  <h2 className="font-heading font-bold text-3xl md:text-4xl mb-2">
                    Kendi Sandviçini Tasarla
                  </h2>
                  <p className="font-body text-white/90 text-base md:text-lg mb-6">
                    Ekmek → Sos → Peynir → İçerik → Üst Sos
                  </p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {['Yarım', 'Tam'].map((b) => (
                      <span
                        key={b}
                        className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-semibold"
                      >
                        {b}
                      </span>
                    ))}
                  </div>

                  <div className="inline-flex items-center gap-2 bg-white text-red-700 font-display font-bold text-lg px-7 py-3 rounded-full shadow-lg group-hover:shadow-2xl transition-shadow self-start mt-auto">
                    Sandviçe Başla
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.div>
            </Link>
          </RevealOnScroll>
        </div>
      </SectionContainer>
    </main>
  )
}
