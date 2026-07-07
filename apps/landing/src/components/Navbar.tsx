import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useContent } from '../lib/contentStore'
import { useLoyalty } from '../lib/loyaltyStore'
import { LiveOrderStatus } from './LiveOrderStatus'
import { useSettings } from '../hooks/useSettings'
import { useTheme } from '../hooks/useTheme'
import { imageUrl } from '../lib/api'

export const Navbar = () => {
  const { content } = useContent()
  const { member, logout } = useLoyalty()
  const { whatsappEnabled } = useSettings()
  const theme = useTheme()
  const brandName = theme?.name || content.site.logoText
  // Tenant kendi logosunu yüklediyse onu göster; yoksa marka adını yazıyla göster.
  // /uploads/... yolu imageUrl ile absolute'e çevrilir (tenant build'de API_BASE='').
  const brandLogo = imageUrl(theme?.logoUrl)
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showMemberMenu, setShowMemberMenu] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginPhone, setLoginPhone] = useState('')
  const [loginError, setLoginError] = useState('')

  // Tanıtım landing'i yayınlanmamışsa VEYA özel-kod landing (customLanding) varsa sadece
  // Menü göster — özel landing kendi nav'ını taşır, generic blog/tasarla/hakkımızda ona ait değil.
  const published = theme?.published && !theme?.customLanding
  const links = published
    ? [
        { to: '/', label: 'Ana Sayfa' },
        { to: '/menu', label: 'Menü' },
        { to: '/build', label: 'Tasarla' },
        { to: '/blog', label: 'Blog' },
        ...(content.game?.enabled ? [{ to: '/oyun', label: '🎮 Oyun' }] : []),
        { to: '/about', label: 'Hakkımızda' },
        { to: '/contact', label: 'İletişim' },
      ]
    : [{ to: '/menu', label: 'Menü' }]

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
          <Link to={published ? '/' : '/menu'} className="flex items-center gap-3 group">
            {brandLogo ? (
              <motion.img
                src={brandLogo}
                alt={brandName}
                className="h-14 md:h-16 w-auto"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              />
            ) : (
              /* Logo yüklenmemiş: markanın adını yazıyla göster */
              <motion.span
                className="font-display text-2xl md:text-3xl font-extrabold tracking-tight text-primary"
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.3 }}
              >
                {brandName}
              </motion.span>
            )}
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
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full font-display font-semibold shadow-md hover:shadow-lg transition-all"
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
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full font-display font-semibold shadow-md hover:shadow-lg transition-all hover:scale-105"
              >
                <span className="text-sm">Üye Ol</span>
              </button>
            )}

            {whatsappEnabled && (
              <a
                href={`https://wa.me/${content.whatsapp.phone}?text=${encodeURIComponent(content.whatsapp.defaultMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-sm"
              >
                Sipariş Ver
              </a>
            )}
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
                  className="p-4 bg-primary text-white rounded-xl mb-2 flex items-center justify-center gap-2 font-display font-semibold"
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
              {whatsappEnabled && (
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
              )}
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

// Login Modal — email + OTP flow.
// Step 1: enter email (and name on first time) → OTP mailed via info@highfivepps.com
// Step 2: enter 6-digit code → backend verifies, returns customer + JWT
const LoginModal = ({
  onClose,
  loginError,
  setLoginError,
}: {
  onClose: () => void
  loginPhone: string
  setLoginPhone: (v: string) => void
  loginError: string
  setLoginError: (v: string) => void
}) => {
  const { requestEmailOtp, verifyEmailOtp } = useLoyalty()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState<'' | 'MALE' | 'FEMALE' | 'OTHER'>('')
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Tick the cooldown for the resend button
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  const handleRequest = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setLoginError('Geçerli bir e-posta adresi girin')
      return
    }
    setIsLoading(true)
    setLoginError('')
    const res = await requestEmailOtp(trimmed, name.trim() || undefined, {
      birthDate: birthDate || undefined,
      gender: gender || undefined,
    })
    setIsLoading(false)
    if (res.success) {
      setStep('code')
      setResendCooldown(45)
    } else {
      setLoginError(res.error || 'Kod gönderilemedi')
    }
  }

  const handleVerify = async () => {
    if (code.replace(/\D/g, '').length !== 6) {
      setLoginError('6 haneli kodu gir')
      return
    }
    setIsLoading(true)
    setLoginError('')
    const res = await verifyEmailOtp(email, code)
    setIsLoading(false)
    if (res.success) {
      setSuccess(true)
      setTimeout(onClose, 1500)
    } else {
      setLoginError(res.error || 'Kod hatalı')
    }
  }

  const handleSubmit = step === 'email' ? handleRequest : handleVerify

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
              Hoş Geldin!
            </h3>
            <p className="text-foreground-muted mt-2">
              Giriş başarılı — sadakat puanların hazır
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
                {step === 'email' ? 'E-posta ile Giriş' : 'Kodu Gir'}
              </h3>
              <p className="text-foreground-muted text-sm mt-1">
                {step === 'email'
                  ? 'E-posta adresine 6 haneli kod göndereceğiz — şifre yok, telefon yok'
                  : `Kod ${email} adresine gönderildi`}
              </p>
            </div>

            <div className="space-y-4">
              {step === 'email' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      E-posta Adresi
                    </label>
                    <input
                      type="email"
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ornek@mail.com"
                      className="input-field text-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Adınız <span className="text-foreground-subtle">(opsiyonel)</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="İlk üyelikte kayıt için"
                      className="input-field"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Doğum tarihi <span className="text-foreground-subtle text-xs">(ops.)</span>
                      </label>
                      <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Cinsiyet <span className="text-foreground-subtle text-xs">(ops.)</span>
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value as typeof gender)}
                        className="input-field"
                      >
                        <option value="">Seçilmedi</option>
                        <option value="FEMALE">Kadın</option>
                        <option value="MALE">Erkek</option>
                        <option value="OTHER">Diğer</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-[11px] text-foreground-subtle">
                    Doğum gününde sürpriz indirim için doğum tarihini bırakabilirsin 🎂
                  </p>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Doğrulama Kodu
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="input-field text-2xl text-center tracking-[0.5em] font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setStep('email')
                      setCode('')
                      setLoginError('')
                    }}
                    className="text-xs text-foreground-muted hover:text-primary mt-2"
                  >
                    ← E-postayı değiştir
                  </button>
                </div>
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
                {isLoading
                  ? 'Bekleyin...'
                  : step === 'email'
                    ? 'Kod Gönder'
                    : 'Giriş Yap'}
              </button>

              {step === 'code' && (
                <button
                  onClick={async () => {
                    if (resendCooldown > 0) return
                    setIsLoading(true)
                    const res = await requestEmailOtp(email, name)
                    setIsLoading(false)
                    if (res.success) {
                      setResendCooldown(45)
                    } else {
                      setLoginError(res.error || 'Kod gönderilemedi')
                    }
                  }}
                  disabled={isLoading || resendCooldown > 0}
                  className="w-full py-2 text-sm text-foreground-muted hover:text-primary disabled:opacity-50"
                >
                  {resendCooldown > 0 ? `Kodu tekrar gönder (${resendCooldown}s)` : 'Kodu tekrar gönder'}
                </button>
              )}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
