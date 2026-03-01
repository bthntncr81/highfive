import { motion, AnimatePresence } from 'framer-motion'
import type { MenuItem } from '../content/content.schema'
import { useCart } from '../lib/cartStore'
import { useState } from 'react'
import { suggestionApi, ALLERGEN_INFO, type Allergen, type UpsellSuggestion } from '../lib/api'

type MenuGridProps = {
  items: MenuItem[]
  apiMenuItems?: any[] // API'den gelen menü öğeleri
}

export const MenuGrid = ({ items, apiMenuItems = [] }: MenuGridProps) => {
  const { addItem } = useCart()

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30, rotate: -2 },
    visible: { 
      opacity: 1, 
      y: 0, 
      rotate: 0,
      transition: { type: 'spring', stiffness: 100 }
    },
  }

  const getBadgeStyle = (badge: string) => {
    switch (badge.toLowerCase()) {
      case 'yeni':
        return 'badge-new'
      case 'popüler':
        return 'badge-popular'
      case 'acılı':
        return 'badge-spicy'
      case 'vegan':
        return 'badge-vegan'
      default:
        return 'badge bg-surface text-foreground'
    }
  }

  // Find API menu item by name
  const findApiItem = (name: string) => {
    return apiMenuItems.find(
      (item) => item.name.toLowerCase() === name.toLowerCase()
    )
  }

  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-20"
      >
        <div className="text-6xl mb-4">🔍</div>
        <p className="font-display text-2xl text-foreground-muted">
          Aradığınız ürün bulunamadı
        </p>
        <p className="font-body text-foreground-subtle mt-2">
          Farklı bir kategori veya arama terimi deneyin
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {items.map((item) => {
        const apiItem = findApiItem(item.name)
        return (
          <MenuCard
            key={item.id}
            item={item}
            apiItem={apiItem}
            itemVariants={itemVariants}
            getBadgeStyle={getBadgeStyle}
            onAddToCart={() => addItem(item)}
          />
        )
      })}
    </motion.div>
  )
}

type MenuCardProps = {
  item: MenuItem
  apiItem?: any
  itemVariants: {
    hidden: { opacity: number; y: number; rotate: number }
    visible: { opacity: number; y: number; rotate: number; transition: { type: string; stiffness: number } }
  }
  getBadgeStyle: (badge: string) => string
  onAddToCart: () => void
}

const MenuCard = ({ item, apiItem, itemVariants, getBadgeStyle, onAddToCart }: MenuCardProps) => {
  const { addItem } = useCart()
  const [showAdded, setShowAdded] = useState(false)
  const [showUpsell, setShowUpsell] = useState(false)
  const [upsellSuggestions, setUpsellSuggestions] = useState<UpsellSuggestion[]>([])
  const [showAllergens, setShowAllergens] = useState(false)

  // Get allergens from API item
  const allergens: Allergen[] = apiItem?.allergens || []
  const calories = apiItem?.calories
  const isOutOfStock = apiItem?.available === false
  const outOfStockReason = apiItem?.outOfStockReason
  const discountPrice = apiItem?.discountPrice
  const hasDiscount = discountPrice && discountPrice < (apiItem?.price || item.price)

  const handleAddToCart = async () => {
    if (isOutOfStock) return

    onAddToCart()
    setShowAdded(true)

    // Fetch upsell suggestions
    if (apiItem?.id) {
      try {
        const response = await suggestionApi.getUpsells(apiItem.id)
        if (response.success && response.data?.suggestions && response.data.suggestions.length > 0) {
          setUpsellSuggestions(response.data.suggestions)
          setTimeout(() => {
            setShowAdded(false)
            setShowUpsell(true)
          }, 800)
          return
        }
      } catch (error) {
        console.error('Error fetching upsells:', error)
      }
    }

    setTimeout(() => setShowAdded(false), 1500)
  }

  const handleUpsellAccept = async (suggestion: UpsellSuggestion) => {
    // Add upsell item to cart with optional discount
    const upsellItem: MenuItem = {
      id: suggestion.item.id,
      name: suggestion.item.name,
      desc: suggestion.item.description || '',
      price: suggestion.discountAmount 
        ? Number(suggestion.item.price) - Number(suggestion.discountAmount)
        : Number(suggestion.item.price),
      image: suggestion.item.image || '/placeholder.jpg',
      category: suggestion.item.category?.id || '',
      badges: suggestion.item.badges || [],
    }
    addItem(upsellItem)

    // Track acceptance
    suggestionApi.trackUpsellAccepted(suggestion.id)

    setShowUpsell(false)
  }

  const handleUpsellDecline = () => {
    setShowUpsell(false)
  }

  return (
    <>
      <motion.article
        variants={itemVariants}
        whileHover={{ y: -4 }}
        className={`card-menu group relative ${isOutOfStock ? 'opacity-60' : ''}`}
      >
        {/* Image */}
        <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-4 bg-surface">
          <img
            src={item.image}
            alt={item.name}
            loading="lazy"
            className={`w-full h-full object-cover transition-transform duration-500 ${
              isOutOfStock ? 'grayscale' : 'group-hover:scale-110'
            }`}
          />
          
          {/* Out of Stock Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="bg-red-500 text-white px-4 py-2 rounded-full font-display text-sm transform -rotate-12">
                {outOfStockReason || 'Tükendi'}
              </div>
            </div>
          )}

          {/* Badges */}
          {item.badges.length > 0 && !isOutOfStock && (
            <div className="absolute top-3 left-3 flex flex-wrap gap-2">
              {item.badges.map((badge, i) => (
                <motion.span
                  key={i}
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.3 + i * 0.1, type: 'spring' }}
                  className={getBadgeStyle(badge)}
                >
                  {badge}
                </motion.span>
              ))}
            </div>
          )}

          {/* Allergen Button */}
          {allergens.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowAllergens(!showAllergens)
              }}
              className="absolute top-3 right-3 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg hover:bg-orange-600 transition-colors"
              title="Alerjen bilgisi"
            >
              ⚠️
            </button>
          )}

          {/* Price tag */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="absolute bottom-3 right-3"
          >
            {hasDiscount ? (
              <div className="flex flex-col items-end">
                <span className="text-sm line-through text-white/80 bg-black/30 px-2 rounded">
                  ₺{item.price}
                </span>
                <span className="bg-green-500 text-white font-display text-xl px-3 py-1 rounded-full shadow-md">
                  ₺{discountPrice}
                </span>
              </div>
            ) : (
              <span className="bg-primary text-white font-display text-xl px-3 py-1 rounded-full shadow-md">
                ₺{item.price}
              </span>
            )}
          </motion.div>

          {/* Added to cart feedback */}
          <AnimatePresence>
            {showAdded && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute inset-0 bg-green-500/90 flex items-center justify-center"
              >
                <div className="text-white text-center">
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-4xl block mb-2"
                  >
                    ✓
                  </motion.span>
                  <span className="font-display text-lg">Sepete Eklendi!</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1">
          <h3 className="font-display text-xl text-foreground mb-2 group-hover:text-primary transition-colors">
            {item.name}
          </h3>
          <p className="font-body text-foreground-muted text-sm flex-1 mb-2 line-clamp-2">
            {item.desc}
          </p>

          {/* Calories */}
          {calories && (
            <p className="text-xs text-foreground-subtle mb-2">
              🔥 {calories} kcal
            </p>
          )}

          {/* Allergen Pills */}
          <AnimatePresence>
            {showAllergens && allergens.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-3"
              >
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-orange-700 mb-2">⚠️ Alerjen Bilgisi:</p>
                  <div className="flex flex-wrap gap-1">
                    {allergens.map((allergen) => (
                      <span
                        key={allergen}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs"
                      >
                        {ALLERGEN_INFO[allergen]?.icon} {ALLERGEN_INFO[allergen]?.name}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Add to Cart button */}
          <motion.button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            whileHover={{ scale: isOutOfStock ? 1 : 1.02 }}
            whileTap={{ scale: isOutOfStock ? 1 : 0.98 }}
            className={`btn-secondary w-full justify-center text-base ${
              isOutOfStock ? 'opacity-50 cursor-not-allowed bg-gray-300' : ''
            }`}
          >
            {isOutOfStock ? (
              <>
                <span>❌</span>
                Stokta Yok
              </>
            ) : (
              <>
                <span>🛒</span>
                Sepete Ekle
              </>
            )}
          </motion.button>
        </div>
      </motion.article>

      {/* Upsell Modal */}
      <AnimatePresence>
        {showUpsell && upsellSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={handleUpsellDecline}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="text-center mb-4">
                <span className="text-4xl">🍟</span>
                <h3 className="font-display text-xl text-foreground mt-2">
                  {upsellSuggestions[0].message || 'Yanında da ekleyin!'}
                </h3>
              </div>

              <div className="space-y-3 mb-4">
                {upsellSuggestions.slice(0, 2).map((suggestion) => (
                  <motion.button
                    key={suggestion.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleUpsellAccept(suggestion)}
                    className="w-full flex items-center gap-3 p-3 bg-surface rounded-xl hover:bg-primary/10 transition-colors"
                  >
                    <img
                      src={suggestion.item.image || '/placeholder.jpg'}
                      alt={suggestion.item.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1 text-left">
                      <p className="font-display text-foreground">
                        {suggestion.item.name}
                      </p>
                      <p className="text-sm text-foreground-muted">
                        {suggestion.discountAmount ? (
                          <>
                            <span className="line-through mr-2">₺{suggestion.item.price}</span>
                            <span className="text-green-600 font-bold">
                              ₺{Number(suggestion.item.price) - Number(suggestion.discountAmount)}
                            </span>
                          </>
                        ) : (
                          <span>₺{suggestion.item.price}</span>
                        )}
                      </p>
                    </div>
                    <span className="text-2xl">+</span>
                  </motion.button>
                ))}
              </div>

              <button
                onClick={handleUpsellDecline}
                className="w-full py-3 text-foreground-muted hover:text-foreground transition-colors text-sm"
              >
                Hayır, teşekkürler
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
