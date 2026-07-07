import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useContent } from '../lib/contentStore'
import { useTheme } from '../hooks/useTheme'
import { imageUrl } from '../lib/api'
import { useSettings } from '../hooks/useSettings'

// Yayınlanmamış tenant'ın kök sayfası: OtOrder markalı "site hazırlanıyor".
// Menü/sipariş çalıştığı için belirgin bir "Sipariş Ver" butonu vardır.
export const ComingSoon = () => {
  const { content } = useContent()
  const theme = useTheme()
  const { services } = useSettings()
  const brandName = theme?.name || content.site?.name || 'Restoranımız'
  const brandLogo = imageUrl(theme?.logoUrl)
  const menuEnabled = services.cartEnabled !== false

  return (
    <main className="relative min-h-[100vh] flex items-center justify-center overflow-hidden bg-[#0f172a] px-4">
      {/* Arka plan dekoratif ışıklar */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-30" style={{ background: 'rgb(var(--brand-500) / 0.5)' }} />
        <div className="absolute -bottom-40 -right-24 w-[32rem] h-[32rem] rounded-full blur-3xl opacity-20" style={{ background: 'rgb(var(--brand-400) / 0.5)' }} />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '28px 28px' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-lg text-center"
      >
        {/* Marka */}
        {brandLogo ? (
          <img src={brandLogo} alt={brandName} className="h-20 w-auto mx-auto mb-6 object-contain" />
        ) : (
          <div className="mb-6 text-4xl md:text-5xl font-extrabold tracking-tight text-white">{brandName}</div>
        )}

        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white"
          style={{ background: 'rgb(var(--brand-500) / 0.9)' }}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
          </span>
          Yakında
        </motion.span>

        <h1 className="mt-6 text-3xl md:text-4xl font-extrabold text-white leading-tight">
          Sipariş sitemiz hazırlanıyor
        </h1>
        <p className="mt-4 text-base md:text-lg text-white/70 leading-relaxed">
          {brandName} için özel sipariş sayfamız çok yakında burada.
          {menuEnabled && ' Şimdiden menümüzü inceleyip sipariş verebilirsiniz.'}
        </p>

        {/* Aksiyonlar */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          {menuEnabled && (
            <Link
              to="/menu"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
              style={{ background: 'rgb(var(--brand-500))', boxShadow: '0 14px 30px -10px rgb(var(--brand-500) / 0.6)' }}
            >
              🍽️ Menüyü Gör &amp; Sipariş Ver
            </Link>
          )}
          {content.whatsapp?.phone && (
            <a
              href={`https://wa.me/${content.whatsapp.phone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 font-bold text-white border border-white/20 hover:bg-white/10 transition-colors"
            >
              WhatsApp'tan Yaz
            </a>
          )}
        </div>

        {/* Alt bilgi */}
        <p className="mt-10 text-xs text-white/40">
          <a href="https://otorder.com" target="_blank" rel="noopener noreferrer" className="hover:text-white/70 transition-colors">
            OtOrder
          </a>{' '}
          ile güçlendirilmiştir · İşletme sahibi misiniz?{' '}
          <Link to="/admin" className="underline hover:text-white/70">Yönetim paneli</Link>
        </p>
      </motion.div>
    </main>
  )
}
