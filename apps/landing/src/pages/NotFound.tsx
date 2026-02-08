import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export const NotFound = () => {
  return (
    <main className="min-h-[70vh] flex items-center justify-center bg-diner-cream">
      <div className="text-center px-4">
        {/* Logo */}
        <motion.div
          animate={{ 
            scale: [1, 1.05, 1],
            y: [0, -10, 0]
          }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="mb-8"
        >
          <img 
            src="/logo.png" 
            alt="High Five" 
            className="h-40 w-auto mx-auto"
          />
        </motion.div>

        {/* Error code */}
        <motion.h1
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="font-heading text-8xl text-diner-red mb-4"
        >
          404
        </motion.h1>

        <h2 className="font-display text-3xl text-diner-chocolate mb-4">
          Bu pizza kaybolmuş! 😅
        </h2>

        <p className="font-body text-lg text-diner-chocolate-light mb-8 max-w-md mx-auto">
          Aradığınız sayfa bulunamadı. Belki menüden güzel bir şeyler seçersiniz?
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/" className="btn-primary">
            <span>🏠</span>
            Ana Sayfaya Dön
          </Link>
          <Link to="/menu" className="btn-secondary">
            <span>📋</span>
            Menüye Git
          </Link>
        </div>
      </div>
    </main>
  )
}
