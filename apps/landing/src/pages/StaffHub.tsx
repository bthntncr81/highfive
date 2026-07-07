import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useContent } from '../lib/contentStore'
import { useTheme } from '../hooks/useTheme'
import { imageUrl } from '../lib/api'

// İşletme paneli — personeli /pos, /kitchen ve yönetim ekranlarına tek tuşla götürür.
// /pos ve /kitchen ayrı uygulamalar (nginx sunar) → tam sayfa gezinme için <a href>.
const cards = [
  {
    href: '/pos/',
    icon: '🧾',
    title: 'POS Paneli',
    desc: 'Sipariş al, masaları yönet, ödeme al',
    external: true,
  },
  {
    href: '/kitchen/',
    icon: '👨‍🍳',
    title: 'Mutfak Ekranı',
    desc: 'Gelen siparişleri gör ve hazırla (KDS)',
    external: true,
  },
  {
    href: '/admin',
    icon: '🎨',
    title: 'İçerik & Görünüm',
    desc: 'Sipariş sitesi içeriğini düzenle',
    external: false,
  },
]

export const StaffHub = () => {
  const { content } = useContent()
  const theme = useTheme()
  const brandName = theme?.name || content.site?.name || 'İşletme'
  const brandLogo = imageUrl(theme?.logoUrl)

  useEffect(() => {
    document.title = `İşletme Paneli · ${brandName}`
  }, [brandName])

  return (
    <main className="relative min-h-[100vh] flex items-center justify-center overflow-hidden bg-[#0f172a] px-4 py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 w-[26rem] h-[26rem] rounded-full blur-3xl opacity-25" style={{ background: 'rgb(var(--brand-500) / 0.5)' }} />
        <div className="absolute -bottom-40 -right-24 w-[30rem] h-[30rem] rounded-full blur-3xl opacity-15" style={{ background: 'rgb(var(--brand-400) / 0.5)' }} />
      </div>

      <div className="relative z-10 w-full max-w-3xl">
        {/* Marka */}
        <div className="text-center mb-10">
          {brandLogo ? (
            <img src={brandLogo} alt={brandName} className="h-16 w-auto mx-auto mb-4 object-contain" />
          ) : (
            <div className="text-3xl font-extrabold text-white mb-4">{brandName}</div>
          )}
          <h1 className="text-2xl md:text-3xl font-bold text-white">İşletme Paneli</h1>
          <p className="mt-2 text-white/60">Çalışmak istediğiniz ekranı seçin</p>
        </div>

        {/* Kartlar */}
        <div className="grid sm:grid-cols-3 gap-4">
          {cards.map((c, i) => {
            const inner = (
              <>
                <div className="text-4xl mb-3">{c.icon}</div>
                <h2 className="font-bold text-lg text-white">{c.title}</h2>
                <p className="mt-1 text-sm text-white/60 leading-snug">{c.desc}</p>
                <span
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold"
                  style={{ color: 'rgb(var(--brand-400))' }}
                >
                  Aç →
                </span>
              </>
            )
            const className =
              'block h-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 text-left transition-all hover:-translate-y-1 hover:bg-white/10 hover:border-white/20'
            return (
              <motion.div
                key={c.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                {c.external ? (
                  <a href={c.href} className={className}>{inner}</a>
                ) : (
                  <Link to={c.href} className={className}>{inner}</Link>
                )}
              </motion.div>
            )
          })}
        </div>

        <p className="mt-10 text-center text-xs text-white/40">
          <Link to="/menu" className="hover:text-white/70 underline">Sipariş sitesine dön</Link>
          {' · '}
          <a href="https://otorder.com" target="_blank" rel="noopener noreferrer" className="hover:text-white/70">OtOrder</a>
        </p>
      </div>
    </main>
  )
}
