import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HfArrow, HfMenu } from '../components/BrandIcons'
import { useContent } from '../lib/contentStore'
import { useTheme } from '../hooks/useTheme'
import { imageUrl } from '../lib/api'

export const NotFound = () => {
  const { content } = useContent()
  const theme = useTheme()
  const brandName = theme?.name || content.site.name || 'Restoranımız'
  const brandLogo = imageUrl(theme?.logoUrl)

  // 404 → noindex (botlar bu sayfayı dizine almasın). Sayfadan ayrılınca geri al.
  useEffect(() => {
    document.title = `404 — Sayfa Bulunamadı | ${content.site.name || 'Restoranımız'}`
    const robots = document.querySelector('meta[name="robots"]')
    const prev = robots?.getAttribute('content') || 'index, follow'
    robots?.setAttribute('content', 'noindex, follow')
    return () => robots?.setAttribute('content', prev)
  }, [content.site.name])

  return (
    <main className="min-h-[70vh] flex items-center justify-center bg-background">
      <div className="text-center px-4">
        {/* Logo */}
        <motion.div
          animate={{ scale: [1, 1.05, 1], y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="mb-8"
        >
          {brandLogo ? (
            <img src={brandLogo} alt={brandName} className="h-40 w-auto mx-auto" />
          ) : (
            <div className="font-heading font-extrabold text-4xl md:text-5xl text-primary mx-auto">
              {brandName}
            </div>
          )}
        </motion.div>

        {/* Error code */}
        <motion.h1
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="font-heading font-bold text-8xl text-primary mb-4"
        >
          404
        </motion.h1>

        <h2 className="font-display text-3xl text-foreground mb-4">
          Bu pizza kaybolmuş!
        </h2>

        <p className="font-body text-lg text-foreground-muted mb-8 max-w-md mx-auto">
          Aradığınız sayfa bulunamadı. Belki menüden güzel bir şeyler seçersiniz?
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/" className="btn-primary inline-flex items-center gap-2">
            <HfArrow className="w-5 h-5 rotate-180" />
            Ana Sayfaya Dön
          </Link>
          <Link to="/menu" className="btn-secondary inline-flex items-center gap-2">
            <HfMenu className="w-5 h-5" />
            Menüye Git
          </Link>
        </div>
      </div>
    </main>
  )
}
