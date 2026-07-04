import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HfArrow, HfMenu } from '../components/BrandIcons'

export const NotFound = () => {
  // 404 → noindex (botlar bu sayfayı dizine almasın). Sayfadan ayrılınca geri al.
  useEffect(() => {
    document.title = '404 — Sayfa Bulunamadı | High Five'
    const robots = document.querySelector('meta[name="robots"]')
    const prev = robots?.getAttribute('content') || 'index, follow'
    robots?.setAttribute('content', 'noindex, follow')
    return () => robots?.setAttribute('content', prev)
  }, [])

  return (
    <main className="min-h-[70vh] flex items-center justify-center bg-background">
      <div className="text-center px-4">
        {/* Logo */}
        <motion.div
          animate={{ scale: [1, 1.05, 1], y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="mb-8"
        >
          <img src="/logo.svg" alt="High Five" className="h-40 w-auto mx-auto" />
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
