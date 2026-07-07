import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '../../lib/cartStore'
import {
  suggestionApi,
  ALLERGEN_INFO,
  type Allergen,
  type UpsellSuggestion,
  type MenuItem as APIMenuItem,
} from '../../lib/api'

// ── Ortak menü-kartı mantığı ──────────────────────────────────────────
// 20 menü şablonunun HEPSİ bu hook'u kullanır: sepete ekleme, upsell, alerjen,
// fiyat/indirim türetmeleri tek yerde. Şablonlar SADECE sunumu (görsel) değiştirir.

export interface MenuCardProps {
  item: APIMenuItem
  cartEnabled: boolean
}

export function useMenuCard(item: APIMenuItem, cartEnabled: boolean) {
  const { addItemFromAPI } = useCart()
  const [showAdded, setShowAdded] = useState(false)
  const [showUpsell, setShowUpsell] = useState(false)
  const [upsellSuggestions, setUpsellSuggestions] = useState<UpsellSuggestion[]>([])
  const [showAllergens, setShowAllergens] = useState(false)

  const allergens: Allergen[] = (item.allergens || []) as Allergen[]
  const calories = item.calories
  const isOutOfStock = item.available === false
  const outOfStockReason = item.outOfStockReason
  const discountPrice = item.discountPrice
  const hasDiscount = !!(discountPrice && discountPrice < item.price)
  const displayPrice = hasDiscount ? (discountPrice as number) : item.price
  const originalPrice = item.price
  const fakeOriginalPrice = Math.ceil(Number(item.price) * 1.2)
  const rawImage = item.image || ''
  const hasRealImage = !!rawImage && !rawImage.startsWith('/placeholders/') && rawImage !== ''
  const itemImage = hasRealImage ? rawImage : ''
  const strikePrice = hasDiscount ? originalPrice : fakeOriginalPrice

  const addToCart = async () => {
    if (isOutOfStock) return
    addItemFromAPI({
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: displayPrice,
      image: itemImage,
      categoryId: item.category.id,
      badges: item.badges || [],
    })
    setShowAdded(true)
    try {
      const response = await suggestionApi.getUpsells(item.id)
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
    setTimeout(() => setShowAdded(false), 1500)
  }

  const acceptUpsell = (suggestion: UpsellSuggestion) => {
    const upsellPrice = suggestion.discountAmount
      ? Number(suggestion.item.price) - Number(suggestion.discountAmount)
      : Number(suggestion.item.price)
    addItemFromAPI({
      id: suggestion.item.id,
      name: suggestion.item.name,
      description: suggestion.item.description || '',
      price: upsellPrice,
      image: suggestion.item.image || '/placeholders/pizza-1.svg',
      categoryId: suggestion.item.category?.id || '',
      badges: suggestion.item.badges || [],
    })
    suggestionApi.trackUpsellAccepted(suggestion.id)
    setShowUpsell(false)
  }

  const declineUpsell = () => setShowUpsell(false)
  const toggleAllergens = () => setShowAllergens((s) => !s)

  return {
    // data
    item,
    cartEnabled,
    allergens,
    calories,
    isOutOfStock,
    outOfStockReason,
    hasDiscount,
    displayPrice,
    originalPrice,
    strikePrice,
    hasRealImage,
    itemImage,
    badges: item.badges || [],
    featured: item.featured,
    name: item.name,
    description: item.description || '',
    prepTime: item.prepTime,
    // state
    showAdded,
    showUpsell,
    upsellSuggestions,
    showAllergens,
    // actions
    addToCart,
    acceptUpsell,
    declineUpsell,
    toggleAllergens,
  }
}

export type MenuCard = ReturnType<typeof useMenuCard>

// ── Paylaşılan parçalar ───────────────────────────────────────────────

export const badgeClass = (badge: string) => {
  switch (badge.toLowerCase()) {
    case 'yeni': return 'badge-new'
    case 'popüler': return 'badge-popular'
    case 'acılı': return 'badge-spicy'
    case 'vegan': return 'badge-vegan'
    default: return 'badge bg-surface text-foreground'
  }
}

// "Sepete eklendi" ✓ parlaması — görsel üstünde
export const AddedBurst = ({ show }: { show: boolean }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5 }}
        className="absolute inset-0 z-10 flex items-center justify-center"
        style={{ background: 'rgb(var(--brand-500) / 0.92)' }}
      >
        <div className="text-white text-center">
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-4xl block mb-1">✓</motion.span>
          <span className="font-display text-lg">Sepete Eklendi!</span>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
)

// Alerjen açılır listesi
export const AllergenPills = ({ show, allergens }: { show: boolean; allergens: Allergen[] }) => (
  <AnimatePresence>
    {show && allergens.length > 0 && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="overflow-hidden"
      >
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 my-2">
          <p className="text-xs font-semibold text-orange-700 mb-2">⚠️ Alerjen Bilgisi:</p>
          <div className="flex flex-wrap gap-1">
            {allergens.map((a) => (
              <span key={a} className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                {ALLERGEN_INFO[a]?.icon} {ALLERGEN_INFO[a]?.name}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
)

// Upsell modalı (sepete ekledikten sonra yanında öneri)
export const UpsellModal = ({ card }: { card: MenuCard }) => (
  <AnimatePresence>
    {card.showUpsell && card.upsellSuggestions.length > 0 && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
        onClick={card.declineUpsell}
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
              {card.upsellSuggestions[0].message || 'Yanında da ekleyin!'}
            </h3>
          </div>
          <div className="space-y-3 mb-4">
            {card.upsellSuggestions.slice(0, 2).map((s) => (
              <motion.button
                key={s.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => card.acceptUpsell(s)}
                className="w-full flex items-center gap-3 p-3 bg-surface rounded-xl hover:bg-primary/10 transition-colors"
              >
                <img src={s.item.image || '/placeholders/pizza-1.svg'} alt={s.item.name} className="w-16 h-16 object-cover rounded-lg" />
                <div className="flex-1 text-left">
                  <p className="font-display text-foreground">{s.item.name}</p>
                  <p className="text-sm text-foreground-muted">
                    {s.discountAmount ? (
                      <>
                        <span className="line-through mr-2">₺{s.item.price}</span>
                        <span className="text-green-600 font-bold">₺{Number(s.item.price) - Number(s.discountAmount)}</span>
                      </>
                    ) : (
                      <span>₺{s.item.price}</span>
                    )}
                  </p>
                </div>
                <span className="text-2xl">+</span>
              </motion.button>
            ))}
          </div>
          <button onClick={card.declineUpsell} className="w-full py-3 text-foreground-muted hover:text-foreground transition-colors text-sm">
            Hayır, teşekkürler
          </button>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
)
