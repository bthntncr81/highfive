import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useContent } from '../lib/contentStore'
import { useLoyalty } from '../lib/loyaltyStore'
import { LiveOrderStatus } from './LiveOrderStatus'

export const Navbar = () => {
  const { content } = useContent()
  const { member, logout } = useLoyalty()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showMemberMenu, setShowMemberMenu] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginPhone, setLoginPhone] = useState('')
  const [loginError, setLoginError] = useState('')

  const links = [
    { to: '/', label: 'Ana Sayfa' },
    { to: '/menu', label: 'Menü' },
    { to: '/about', label: 'Hakkımızda' },
    { to: '/contact', label: 'İletişim' },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <>
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border"
    >
      <div className="container-diner">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <motion.img
              src="/logo.svg"
              alt={content.site.logoText}
              className="h-14 md:h-16 w-auto"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`nav-link ${isActive(link.to) ? 'active' : ''}`}
              >
                {link.label}
                {isActive(link.to) && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full"
                  />
                )}
              </Link>
            ))}
          </div>

          {/* CTA Button & Member Info - Desktop */}
          <div className="hidden md:flex items-center gap-3">
            {/* Live Order Status */}
            <LiveOrderStatus />

            {member ? (
              <div className="relative">
                <button
                  onClick={() => setShowMemberMenu(!showMemberMenu)}
                  className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-full font-display font-semibold shadow-md hover:shadow-lg transition-all"
                >
                  <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-sm">
                    {(member.name || 'Ü')[0].toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold leading-tight">{member.name || 'Üye'}</p>
                    <p className="text-xs opacity-90">{member.totalPoints} Puan</p>
                  </div>
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {showMemberMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-border-light overflow-hidden z-50"
                    >
                      <div className="p-4 bg-surface border-b border-border-light">
                        <p className="font-display font-semibold text-foreground">{member.name || 'Üye'}</p>
                        <p className="text-sm text-foreground-muted">{member.phone}</p>
                        {member.loyaltyTier && (
                          <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium">
                            {member.loyaltyTier.icon} {member.loyaltyTier.name}
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-foreground-muted">Puanınız</span>
                          <span className="font-bold text-accent">{member.totalPoints}</span>
                        </div>
                        <div className="text-xs text-foreground-muted mb-3">
                          {member.totalPoints >= 100 ? (
                            <span className="text-emerald-600">{Math.floor(member.totalPoints / 100) * 10}₺ indirim kullanabilirsiniz!</span>
                          ) : (
                            <span>100 puana {100 - member.totalPoints} puan kaldı</span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            logout()
                            setShowMemberMenu(false)
                          }}
                          className="w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Çıkış Yap
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-full font-display font-semibold shadow-md hover:shadow-lg transition-all hover:scale-105"
              >
                <span className="text-sm">Üye Ol</span>
              </button>
            )}

            <a
              href={`https://wa.me/${content.whatsapp.phone}?text=${encodeURIComponent(content.whatsapp.defaultMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-sm"
            >
              Sipariş Ver
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-primary"
            aria-label="Menüyü aç"
          >
            <motion.div
              animate={mobileOpen ? 'open' : 'closed'}
              className="w-8 h-8 flex flex-col justify-center items-center gap-1.5"
            >
              <motion.span
                variants={{
                  closed: { rotate: 0, y: 0 },
                  open: { rotate: 45, y: 8 },
                }}
                className="w-7 h-0.5 bg-current rounded-full origin-center"
              />
              <motion.span
                variants={{
                  closed: { opacity: 1 },
                  open: { opacity: 0 },
                }}
                className="w-7 h-0.5 bg-current rounded-full"
              />
              <motion.span
                variants={{
                  closed: { rotate: 0, y: 0 },
                  open: { rotate: -45, y: -8 },
                }}
                className="w-7 h-0.5 bg-current rounded-full origin-center"
              />
            </motion.div>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden overflow-hidden bg-white border-t border-border-light"
          >
            <div className="container-diner py-4 flex flex-col gap-2">
              {/* Mobile Member Info */}
              {member ? (
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="p-4 bg-accent/5 rounded-xl mb-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-accent text-white rounded-full flex items-center justify-center font-bold">
                        {(member.name || 'Ü')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-display font-semibold text-foreground">{member.name || 'Üye'}</p>
                        <p className="text-sm text-accent font-bold">{member.totalPoints} Puan</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        logout()
                        setMobileOpen(false)
                      }}
                      className="text-sm text-red-500"
                    >
                      Çıkış
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  onClick={() => {
                    setMobileOpen(false)
                    setShowLoginModal(true)
                  }}
                  className="p-4 bg-accent text-white rounded-xl mb-2 flex items-center justify-center gap-2 font-display font-semibold"
                >
                  Üye Ol & Puan Kazan!
                </motion.button>
              )}

              {links.map((link, i) => (
                <motion.div
                  key={link.to}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className={`block py-3 px-4 font-display font-semibold text-lg rounded-xl transition-colors ${
                      isActive(link.to)
                        ? 'bg-primary text-white'
                        : 'text-foreground hover:bg-surface'
                    }`}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="pt-2"
              >
                <a
                  href={`https://wa.me/${content.whatsapp.phone}?text=${encodeURIComponent(content.whatsapp.defaultMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-whatsapp w-full justify-center"
                  onClick={() => setMobileOpen(false)}
                >
                  WhatsApp'tan Sipariş
                </a>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.nav>

    {/* Login/Register Modal */}
    {createPortal(
      <AnimatePresence>
        {showLoginModal && (
          <LoginModal
            onClose={() => {
              setShowLoginModal(false)
              setLoginPhone('')
              setLoginError('')
            }}
            loginPhone={loginPhone}
            setLoginPhone={setLoginPhone}
            loginError={loginError}
            setLoginError={setLoginError}
          />
        )}
      </AnimatePresence>,
      document.body
    )}
    </>
  )
}

// Login Modal Component
const LoginModal = ({
  onClose,
  loginPhone,
  setLoginPhone,
  loginError,
  setLoginError
}: {
  onClose: () => void
  loginPhone: string
  setLoginPhone: (v: string) => void
  loginError: string
  setLoginError: (v: string) => void
}) => {
  const { login, register } = useLoyalty()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    if (loginPhone.length < 10) {
      setLoginError('Geçerli bir telefon numarası girin')
      return
    }

    setIsLoading(true)
    setLoginError('')

    if (mode === 'login') {
      const found = await login(loginPhone)
      if (found) {
        setSuccess(true)
        setTimeout(onClose, 1500)
      } else {
        setLoginError('Bu numara ile kayıtlı üye bulunamadı')
        setMode('register')
      }
    } else {
      const result = await register(loginPhone, name || undefined)
      if (result.success) {
        setSuccess(true)
        setTimeout(onClose, 1500)
      } else {
        setLoginError(result.error || 'Kayıt başarısız')
      }
    }

    setIsLoading(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
      >
        {success ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-center py-8"
          >
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-display font-bold text-2xl text-foreground">
              {mode === 'login' ? 'Hoş Geldin!' : 'Tebrikler!'}
            </h3>
            <p className="text-foreground-muted mt-2">
              {mode === 'register' && '50 puan hesabına eklendi!'}
            </p>
          </motion.div>
        ) : (
          <>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-foreground-subtle hover:text-foreground text-xl"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="font-display font-bold text-2xl text-foreground">
                {mode === 'login' ? 'Üye Girişi' : 'Üye Ol'}
              </h3>
              <p className="text-foreground-muted text-sm mt-1">
                {mode === 'login'
                  ? 'Telefon numaranızla giriş yapın'
                  : 'Ücretsiz üye ol, 50 puan kazan!'}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Telefon Numarası
                </label>
                <input
                  type="tel"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  placeholder="05XX XXX XX XX"
                  className="input-field text-lg"
                />
              </div>

              {mode === 'register' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                >
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Adınız
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="İsminiz"
                    className="input-field"
                  />
                </motion.div>
              )}

              {loginError && (
                <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg">
                  {loginError}
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="btn-primary w-full"
              >
                {isLoading ? 'Bekleyin...' : mode === 'login' ? 'Giriş Yap' : 'Üye Ol'}
              </button>

              <button
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login')
                  setLoginError('')
                }}
                className="w-full py-2 text-sm text-foreground-muted hover:text-primary"
              >
                {mode === 'login'
                  ? 'Hesabın yok mu? Üye ol'
                  : 'Zaten üye misin? Giriş yap'}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
