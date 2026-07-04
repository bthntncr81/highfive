import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useContent } from '../lib/contentStore'
import { useCart } from '../lib/cartStore'
import { orderApi, happyHourApi, type HappyHour, type Category, type MenuItem as APIMenuItem } from '../lib/api'
import { SectionContainer } from '../components/SectionContainer'
import { MenuGridFromAPI } from '../components/MenuGridFromAPI'
import { BundleSection } from '../components/BundleSection'
import { RevealOnScroll } from '../components/RevealOnScroll'
import { useSettings } from '../hooks/useSettings'
import { HfPizza, HfPasta, HfSandwich, HfDrink, HfDessert, HfWhatsapp, HfClock, HfStar, HfPin } from '../components/BrandIcons'

const catIconFor = (name?: string) => {
  const n = (name || '').toLocaleLowerCase('tr')
  if (n.includes('pizza')) return HfPizza
  if (n.includes('makarna') || n.includes('pasta')) return HfPasta
  if (n.includes('sandvi') || n.includes('sandwich')) return HfSandwich
  if (n.includes('içecek') || n.includes('icecek') || n.includes('drink')) return HfDrink
  if (n.includes('tatl') || n.includes('dessert')) return HfDessert
  return HfStar
}
const CatIcon = ({ name, className }: { name?: string; className?: string }) => {
  const I = catIconFor(name)
  return <I className={className} />
}

export const Menu = () => {
  const { content } = useContent()
  const { tableSession, clearTableSession } = useCart()
  const { whatsappEnabled, services } = useSettings()
  const [searchParams, setSearchParams] = useSearchParams()

  const initialCategory = searchParams.get('category')
  const [activeCategory, setActiveCategory] = useState<string | null>(initialCategory)
  const [showCategoryDrawer, setShowCategoryDrawer] = useState(false)

  // API Data
  const [apiCategories, setApiCategories] = useState<Category[]>([])
  const [apiMenuItems, setApiMenuItems] = useState<APIMenuItem[]>([])
  const [activeHappyHours, setActiveHappyHours] = useState<HappyHour[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch API data on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [menuResponse, happyHourResponse] = await Promise.all([
          orderApi.getMenu(),
          happyHourApi.getActive(),
        ])

        if (menuResponse.success && menuResponse.data) {
          if (menuResponse.data.categories) {
            setApiCategories(menuResponse.data.categories)
          }
          if (menuResponse.data.items) {
            setApiMenuItems(menuResponse.data.items)
          }
        }

        if (happyHourResponse.success && happyHourResponse.data?.active) {
          setActiveHappyHours(happyHourResponse.data.active)
        }
      } catch (error) {
        console.error('Error fetching menu data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleCategoryChange = (categoryId: string | null) => {
    setActiveCategory(categoryId)
    setShowCategoryDrawer(false)
    if (categoryId) {
      setSearchParams({ category: categoryId })
    } else {
      setSearchParams({})
    }
  }

  // Filter by category only (search removed)
  const filteredItems = useMemo(() => {
    if (!activeCategory) return apiMenuItems
    return apiMenuItems.filter((item) => item.category.id === activeCategory)
  }, [apiMenuItems, activeCategory])

  const activeCategoryName = activeCategory
    ? apiCategories.find(c => c.id === activeCategory)?.name || 'Kategori'
    : 'Tümü'

  return (
    <main>
      {/* Busy Mode Banner */}
      {services.busyMode && (
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-red-600 text-white"
        >
          <div className="container-diner py-3 flex items-center justify-center gap-3">
            <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="text-xl">🔴</motion.span>
            <p className="font-display text-sm md:text-base">{services.busyMessage || 'Şu anda yoğunuz, siparişler gecikmeli olabilir.'}</p>
          </div>
        </motion.div>
      )}

      {/* Estimated Delivery Time Banner */}
      {services.estimatedDeliveryTime && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="container-diner py-2 flex items-center justify-center gap-2 text-blue-700 text-sm">
            <HfClock className="w-4 h-4" />
            <span>Tahmini teslimat süresi: <strong>{services.estimatedDeliveryTime}</strong></span>
          </div>
        </div>
      )}

      {/* Table Session Banner */}
      {tableSession && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 z-50 bg-accent text-white border-b border-accent-dark/30"
        >
          <div className="container-diner py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HfPin className="w-6 h-6" />
              <div>
                <p className="font-display text-foreground text-lg">
                  {tableSession.name}
                </p>
                <p className="text-sm text-foreground/70">
                  Sipariş bu masaya eklenecek
                </p>
              </div>
            </div>
            <button
              onClick={clearTableSession}
              className="px-4 py-2 bg-white/80 rounded-xl text-sm font-display text-foreground hover:bg-white transition-colors"
            >
              Masadan Çık ✕
            </button>
          </div>
        </motion.div>
      )}

      {/* Happy Hour Banner */}
      {activeHappyHours.length > 0 && (
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white"
        >
          <div className="container-diner py-3 flex items-center justify-center gap-4">
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="text-2xl"
            >
              🎉
            </motion.span>
            <div className="text-center">
              <p className="font-display text-lg">
                {activeHappyHours[0].name}
                {activeHappyHours[0].discountPercent && (
                  <span className="ml-2 bg-white/20 px-2 py-1 rounded-full text-sm">
                    %{activeHappyHours[0].discountPercent} İNDİRİM
                  </span>
                )}
              </p>
              <p className="text-sm text-white/80">
                ⏰ {activeHappyHours[0].endTime}'e kadar geçerli
              </p>
            </div>
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1, delay: 0.5 }}
              className="text-2xl"
            >
              🍹
            </motion.span>
          </div>
        </motion.div>
      )}

      {/* Page Header */}
      <SectionContainer variant="red" className="py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <motion.img
            src="/logo-white.svg"
            alt="High Five"
            className="h-28 md:h-36 w-auto mx-auto mb-4 drop-shadow-2xl"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
          />
          <h1 className="font-heading font-bold text-5xl md:text-6xl text-white mb-4">
            Menümüz
          </h1>
          <p className="font-body text-xl text-background/80 max-w-xl mx-auto">
            Taze malzemeler, el yapımı hamur, bol lezzet!
          </p>
        </motion.div>
      </SectionContainer>

      {/* Sticky Category Bar */}
      <div className={`sticky ${tableSession ? 'top-[130px]' : activeHappyHours.length > 0 ? 'top-[120px]' : 'top-[72px]'} z-40 bg-white border-b border-border shadow-sm`}>
        <div className="container-diner py-3">
          {/* Mobile: single button that opens drawer */}
          <div className="md:hidden flex items-center justify-between">
            <button
              onClick={() => setShowCategoryDrawer(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-display text-sm"
            >
              <span>🍽️</span>
              {activeCategoryName}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <p className="text-sm text-foreground-muted">
              <span className="font-display text-primary">{filteredItems.length}</span> ürün
            </p>
          </div>

          {/* Desktop: horizontal category tabs */}
          <div className="hidden md:flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => handleCategoryChange(null)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl font-display text-sm transition-all ${
                !activeCategory
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-surface text-foreground border border-border hover:border-primary'
              }`}
            >
              🍽️ Tümü
            </button>
            {apiCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl font-display text-sm transition-all ${
                  activeCategory === cat.id
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-surface text-foreground border border-border hover:border-primary'
                }`}
              >
                <CatIcon name={cat.name} className="w-4 h-4 inline-block align-text-bottom mr-1.5" />{cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Category Drawer - slides from right */}
      <AnimatePresence>
        {showCategoryDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowCategoryDrawer(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-72 bg-white z-50 shadow-2xl flex flex-col"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-display text-lg text-foreground">Kategoriler</h3>
                <button
                  onClick={() => setShowCategoryDrawer(false)}
                  className="p-2 text-foreground-muted hover:text-foreground"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <button
                  onClick={() => handleCategoryChange(null)}
                  className={`w-full text-left px-4 py-3 rounded-xl font-display text-base transition-all ${
                    !activeCategory
                      ? 'bg-primary text-white'
                      : 'bg-surface text-foreground hover:bg-primary/10'
                  }`}
                >
                  🍽️ Tümü
                </button>
                {apiCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl font-display text-base transition-all ${
                      activeCategory === cat.id
                        ? 'bg-primary text-white'
                        : 'bg-surface text-foreground hover:bg-primary/10'
                    }`}
                  >
                    <CatIcon name={cat.name} className="w-4 h-4 inline-block align-text-bottom mr-1.5" />{cat.name}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Menu Items */}
      <SectionContainer variant="cream">
        {/* Results count - desktop only */}
        <RevealOnScroll>
          <div className="hidden md:flex items-center justify-between mb-8">
            <p className="font-body text-foreground-muted">
              <span className="font-display text-primary">{filteredItems.length}</span> ürün bulundu
              {activeHappyHours.length > 0 && (
                <span className="ml-2 text-purple-600">
                  🎉 Happy Hour aktif!
                </span>
              )}
            </p>
            {activeCategory && (
              <motion.button
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => handleCategoryChange(null)}
                className="font-display text-sm text-primary hover:underline"
              >
                Tümünü Göster ✕
              </motion.button>
            )}
          </div>
        </RevealOnScroll>

        {/* Alerjen Bilgi Kutusu */}
        <RevealOnScroll>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-display text-orange-800 mb-1">Alerjen Bilgilendirmesi</h3>
                <p className="text-sm text-orange-700">
                  Ürünlerimizdeki alerjen bilgilerini görmek için ürün kartındaki turuncu
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-orange-500 text-white rounded-full text-xs mx-1">⚠️</span>
                  ikonuna tıklayın. Özel diyet ihtiyaçlarınız için lütfen personelimize danışın.
                </p>
              </div>
            </div>
          </motion.div>
        </RevealOnScroll>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="text-primary"
            >
              <HfPizza className="w-10 h-10" />
            </motion.div>
          </div>
        )}

        {/* Paket Menüler — ana sayfada kategorisizleri (null) göster */}
        {!loading && !activeCategory && <BundleSection categoryFilter={null} />}

        {/* HighFive Kazandıran Menüler kategorisi: Builder kartları + bundle'lar */}
        {!loading && activeCategory === 'cat-highfive' && (
          <>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href="/build/pizza"
                className="group rounded-2xl border-2 border-primary bg-white overflow-hidden hover:shadow-md transition"
              >
                <div className="h-32 flex items-center justify-center bg-amber-100 text-primary"><HfPizza className="w-16 h-16" /></div>
                <div className="p-4">
                  <p className="font-display font-extrabold text-foreground text-base">Pizzanı Tasarla</p>
                  <p className="text-xs text-foreground-muted mt-0.5">5 adımda kendi pizzan</p>
                  <span className="text-xs text-primary font-semibold mt-2 inline-flex items-center">
                    Başla →
                  </span>
                </div>
              </a>
              <a
                href="/build/sandwich"
                className="group rounded-2xl border-2 border-accent bg-white overflow-hidden hover:shadow-md transition"
              >
                <div className="h-32 flex items-center justify-center bg-blue-100 text-accent"><HfSandwich className="w-16 h-16" /></div>
                <div className="p-4">
                  <p className="font-display font-extrabold text-foreground text-base">Sandviçini Tasarla</p>
                  <p className="text-xs text-foreground-muted mt-0.5">Ekmek + içerik özgür</p>
                  <span className="text-xs text-accent font-semibold mt-2 inline-flex items-center">
                    Başla →
                  </span>
                </div>
              </a>
            </div>
            <BundleSection categoryFilter="cat-highfive" />
          </>
        )}

        {/* Grid */}
        {!loading && (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory || 'all'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <MenuGridFromAPI items={filteredItems} />
            </motion.div>
          </AnimatePresence>
        )}
      </SectionContainer>

      {/* Bottom CTA - only show if WhatsApp enabled */}
      {whatsappEnabled && (
        <SectionContainer variant="kraft">
          <RevealOnScroll>
            <div className="text-center">
              <div className="dark-section inline-block max-w-2xl mx-auto">
                <h3 className="text-3xl mb-4">Özel İstek mi Var? 🤔</h3>
                <p className="text-background/80 mb-6">
                  Ekstra malzeme, özel diyet tercihleri veya alerjen bilgisi için
                  bize WhatsApp'tan yazın!
                </p>
                <a
                  href={`https://wa.me/${content.whatsapp.phone}?text=${encodeURIComponent('Merhaba! Özel bir istekle ilgili sormak istiyorum.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-whatsapp inline-flex"
                >
                  <HfWhatsapp className="w-5 h-5" />
                  Bize Yazın
                </a>
              </div>
            </div>
          </RevealOnScroll>
        </SectionContainer>
      )}
    </main>
  )
}
