import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useContent } from '../lib/contentStore'
import { useCart } from '../lib/cartStore'
import { orderApi, happyHourApi, type HappyHour, type Category, type MenuItem as APIMenuItem } from '../lib/api'
import { SectionContainer } from '../components/SectionContainer'
import { CategoryTabs } from '../components/CategoryTabs'
import { SearchBar } from '../components/SearchBar'
import { MenuGridFromAPI } from '../components/MenuGridFromAPI'
import { RevealOnScroll } from '../components/RevealOnScroll'

export const Menu = () => {
  const { content } = useContent()
  const { tableSession, clearTableSession } = useCart()
  const [searchParams, setSearchParams] = useSearchParams()
  
  const initialCategory = searchParams.get('category')
  const [activeCategory, setActiveCategory] = useState<string | null>(initialCategory)
  const [searchQuery, setSearchQuery] = useState('')
  
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
          // Kategorileri çek
          if (menuResponse.data.categories) {
            setApiCategories(menuResponse.data.categories)
          }
          // Menü öğelerini çek
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
    if (categoryId) {
      setSearchParams({ category: categoryId })
    } else {
      setSearchParams({})
    }
  }

  // API'den gelen verileri filtrele
  const filteredItems = useMemo(() => {
    let items = apiMenuItems

    // Filter by category
    if (activeCategory) {
      items = items.filter((item) => item.category.id === activeCategory)
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          (item.description && item.description.toLowerCase().includes(query))
      )
    }

    return items
  }, [apiMenuItems, activeCategory, searchQuery])

  // Kategorileri CategoryTabs formatına dönüştür
  const categoriesForTabs = useMemo(() => {
    return apiCategories.map(cat => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
    }))
  }, [apiCategories])

  return (
    <main>
      {/* Table Session Banner */}
      {tableSession && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 z-50 bg-diner-mustard border-b-4 border-diner-chocolate/30"
        >
          <div className="container-diner py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🪑</span>
              <div>
                <p className="font-display text-diner-chocolate text-lg">
                  {tableSession.name}
                </p>
                <p className="text-sm text-diner-chocolate/70">
                  Sipariş bu masaya eklenecek
                </p>
              </div>
            </div>
            <button
              onClick={clearTableSession}
              className="px-4 py-2 bg-white/80 rounded-diner text-sm font-display text-diner-chocolate hover:bg-white transition-colors"
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
            src="/logow.png"
            alt="High Five"
            className="h-28 md:h-36 w-auto mx-auto mb-4 drop-shadow-2xl"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
          />
          <h1 className="font-heading text-5xl md:text-6xl text-white mb-4">
            Menümüz
          </h1>
          <p className="font-body text-xl text-diner-cream/80 max-w-xl mx-auto">
            Taze malzemeler, el yapımı hamur, bol lezzet!
          </p>
        </motion.div>
      </SectionContainer>

      {/* Sticky Filters */}
      <div className={`sticky ${tableSession ? 'top-[130px]' : activeHappyHours.length > 0 ? 'top-[120px]' : 'top-[72px]'} z-40 bg-surface border-b-4 border-diner-kraft/30 shadow-sm`}>
        <div className="container-diner py-4 max-h-[80px] flex items-center gap-4">
          {/* Search - compact */}
          <div className="flex-shrink-0 w-64">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Ara..."
            />
          </div>
          
          {/* Category tabs - horizontal scroll */}
          <div className="flex-1 overflow-hidden">
            <CategoryTabs
              categories={categoriesForTabs}
              activeCategory={activeCategory}
              onCategoryChange={handleCategoryChange}
            />
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <SectionContainer variant="cream">
        {/* Results count */}
        <RevealOnScroll>
          <div className="flex items-center justify-between mb-8">
            <p className="font-body text-diner-chocolate-light">
              <span className="font-display text-diner-red">{filteredItems.length}</span> ürün bulundu
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
                className="font-display text-sm text-diner-red hover:underline"
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
            className="bg-orange-50 border border-orange-200 rounded-diner p-4 mb-6"
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
              transition={{ repeat: Infinity, duration: 1 }}
              className="text-4xl"
            >
              🍕
            </motion.div>
          </div>
        )}

        {/* Grid */}
        {!loading && (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeCategory}-${searchQuery}`}
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

      {/* Bottom CTA */}
      <SectionContainer variant="kraft">
        <RevealOnScroll>
          <div className="text-center">
            <div className="chalkboard inline-block max-w-2xl mx-auto">
              <h3 className="text-3xl mb-4">Özel İstek mi Var? 🤔</h3>
              <p className="text-diner-cream/80 mb-6">
                Ekstra malzeme, özel diyet tercihleri veya alerjen bilgisi için
                bize WhatsApp'tan yazın!
              </p>
              <a
                href={`https://wa.me/${content.whatsapp.phone}?text=${encodeURIComponent('Merhaba! Özel bir istekle ilgili sormak istiyorum.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-whatsapp inline-flex"
              >
                <span>💬</span>
                Bize Yazın
              </a>
            </div>
          </div>
        </RevealOnScroll>
      </SectionContainer>
    </main>
  )
}
