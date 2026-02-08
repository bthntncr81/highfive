import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../lib/cartStore'
import { useState, useEffect } from 'react'
import { suggestionApi, orderApi, type CrossSellSuggestion } from '../lib/api'
import type { MenuItem } from '../content/content.schema'

export const Cart = () => {
  const navigate = useNavigate()
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    addItem,
    totalItems,
    totalPrice,
    isOpen,
    closeCart,
  } = useCart()

  const [crossSellSuggestions, setCrossSellSuggestions] = useState<CrossSellSuggestion[]>([])
  const [loadingCrossSells, setLoadingCrossSells] = useState(false)
  const [showCrossSellPopup, setShowCrossSellPopup] = useState(false)
  const [apiMenuItems, setApiMenuItems] = useState<any[]>([])

  // Fetch API menu items on mount to map names to IDs
  useEffect(() => {
    const fetchApiMenu = async () => {
      try {
        const response = await orderApi.getMenu()
        if (response.success && response.data?.items) {
          setApiMenuItems(response.data.items)
        }
      } catch (error) {
        console.error('Error fetching menu:', error)
      }
    }
    fetchApiMenu()
  }, [])

  // Find API menu item ID by name
  const findApiItemId = (name: string): string | null => {
    const item = apiMenuItems.find(
      (i) => i.name.toLowerCase() === name.toLowerCase()
    )
    return item?.id || null
  }

  // Fetch cross-sell suggestions when cart changes
  useEffect(() => {
    const fetchCrossSells = async () => {
      if (items.length === 0 || apiMenuItems.length === 0) {
        setCrossSellSuggestions([])
        return
      }

      setLoadingCrossSells(true)
      try {
        // Map cart item names to API menu item IDs
        const cartItemIds = items
          .map((ci) => findApiItemId(ci.item.name))
          .filter((id): id is string => id !== null)

        if (cartItemIds.length === 0) {
          setCrossSellSuggestions([])
          return
        }

        const response = await suggestionApi.getCrossSells(cartItemIds)
        
        if (response.success && response.data?.suggestions) {
          setCrossSellSuggestions(response.data.suggestions)
        }
      } catch (error) {
        console.error('Error fetching cross-sells:', error)
      } finally {
        setLoadingCrossSells(false)
      }
    }

    // Debounce the fetch
    const timeout = setTimeout(fetchCrossSells, 500)
    return () => clearTimeout(timeout)
  }, [items, apiMenuItems])

  const handleCheckout = () => {
    if (items.length === 0) return
    
    // If there are cross-sell suggestions, show popup first
    if (crossSellSuggestions.length > 0) {
      setShowCrossSellPopup(true)
      return
    }
    
    // Otherwise, go directly to order page
    closeCart()
    navigate('/order')
  }

  const handleContinueWithoutCrossSells = () => {
    setShowCrossSellPopup(false)
    closeCart()
    navigate('/order')
  }

  const handleAddCrossSell = (suggestion: CrossSellSuggestion) => {
    const crossSellItem: MenuItem = {
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
    addItem(crossSellItem)

    // Track acceptance
    suggestionApi.trackCrossSellAccepted(suggestion.id)

    // Remove from suggestions
    setCrossSellSuggestions((prev) =>
      prev.filter((s) => s.id !== suggestion.id)
    )
  }

  const handleAddAndContinue = (suggestion: CrossSellSuggestion) => {
    handleAddCrossSell(suggestion)
    
    // Check if there are more suggestions
    const remainingSuggestions = crossSellSuggestions.filter(s => s.id !== suggestion.id)
    if (remainingSuggestions.length === 0) {
      setShowCrossSellPopup(false)
      closeCart()
      navigate('/order')
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          />

          {/* Cart Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-diner-cream z-50 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="bg-diner-red text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🛒</span>
                <div>
                  <h2 className="font-display text-xl">Sepetim</h2>
                  <p className="text-sm text-white/80">{totalItems} ürün</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={closeCart}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl hover:bg-white/30 transition-colors"
              >
                ✕
              </motion.button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4">
              {items.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12"
                >
                  <div className="text-6xl mb-4">🍽️</div>
                  <p className="font-display text-xl text-diner-chocolate-light">
                    Sepetiniz boş
                  </p>
                  <p className="text-diner-chocolate-light/70 mt-2">
                    Lezzetli ürünlerimizi keşfedin!
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {items.map((cartItem) => (
                      <motion.div
                        key={cartItem.item.id}
                        layout
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50, height: 0 }}
                        className="bg-white rounded-diner p-3 border-2 border-diner-cream-dark shadow-sm"
                      >
                        <div className="flex gap-3">
                          {/* Image */}
                          <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-diner-cream-dark">
                            <img
                              src={cartItem.item.image}
                              alt={cartItem.item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-display text-diner-chocolate truncate">
                              {cartItem.item.name}
                            </h4>
                            <p className="text-sm text-diner-chocolate-light line-clamp-1">
                              {cartItem.item.desc}
                            </p>
                            <p className="font-display text-diner-red mt-1">
                              ₺{cartItem.item.price}
                            </p>
                          </div>

                          {/* Remove Button */}
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => removeItem(cartItem.item.id)}
                            className="text-diner-chocolate-light hover:text-diner-red transition-colors self-start"
                          >
                            🗑️
                          </motion.button>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-diner-cream-dark">
                          <div className="flex items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() =>
                                updateQuantity(cartItem.item.id, cartItem.quantity - 1)
                              }
                              className="w-8 h-8 rounded-full bg-diner-cream flex items-center justify-center font-display text-lg hover:bg-diner-mustard/30 transition-colors"
                            >
                              −
                            </motion.button>
                            <span className="font-display text-lg w-8 text-center">
                              {cartItem.quantity}
                            </span>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() =>
                                updateQuantity(cartItem.item.id, cartItem.quantity + 1)
                              }
                              className="w-8 h-8 rounded-full bg-diner-cream flex items-center justify-center font-display text-lg hover:bg-diner-mustard/30 transition-colors"
                            >
                              +
                            </motion.button>
                          </div>
                          <span className="font-display text-diner-chocolate">
                            ₺{cartItem.item.price * cartItem.quantity}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Cross-sell hint (small preview) */}
                  {crossSellSuggestions.length > 0 && !loadingCrossSells && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-3 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-diner border-2 border-diner-mustard/30"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">💡</span>
                        <div>
                          <p className="font-display text-sm text-diner-chocolate">
                            {crossSellSuggestions.length} öneri sizin için hazır!
                          </p>
                          <p className="text-xs text-diner-chocolate-light">
                            Sipariş verirken göreceksiniz
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="border-t-4 border-diner-kraft/30 bg-white p-4 space-y-4"
              >
                {/* Clear Cart Button */}
                <button
                  onClick={clearCart}
                  className="text-sm text-diner-chocolate-light hover:text-diner-red transition-colors underline"
                >
                  Sepeti Temizle
                </button>

                {/* Total */}
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg text-diner-chocolate">
                    Toplam
                  </span>
                  <span className="font-display text-2xl text-diner-red">
                    ₺{totalPrice}
                  </span>
                </div>

                {/* Checkout Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCheckout}
                  className="w-full bg-diner-red text-white font-display text-lg py-4 rounded-diner hover:bg-diner-red/90 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="text-xl">🍕</span>
                  Sipariş Ver
                  {crossSellSuggestions.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-yellow-400 text-yellow-900 rounded-full text-xs font-bold">
                      +{crossSellSuggestions.length} öneri
                    </span>
                  )}
                </motion.button>

                <p className="text-xs text-center text-diner-chocolate-light/70">
                  Masadan veya paket sipariş verebilirsiniz
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* Cross-sell Popup Modal */}
          <AnimatePresence>
            {showCrossSellPopup && crossSellSuggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center p-4"
              >
                {/* Popup Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={handleContinueWithoutCrossSells}
                  className="absolute inset-0 bg-black/70"
                />

                {/* Popup Content */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0, y: 50 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0, y: 50 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  className="relative bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden shadow-2xl"
                >
                  {/* Popup Header */}
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-6 text-center relative overflow-hidden">
                    <motion.div
                      initial={{ rotate: -10, scale: 0 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring' }}
                      className="text-6xl mb-2"
                    >
                      💡
                    </motion.div>
                    <h2 className="font-display text-2xl text-white drop-shadow-lg">
                      Bir Dakika!
                    </h2>
                    <p className="text-white/90 mt-1">
                      Siparişinize bunları da eklemek ister misiniz?
                    </p>
                    
                    {/* Decorative circles */}
                    <div className="absolute -top-4 -left-4 w-16 h-16 bg-white/20 rounded-full" />
                    <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-white/10 rounded-full" />
                  </div>

                  {/* Suggestions List */}
                  <div className="p-4 max-h-[40vh] overflow-y-auto">
                    <div className="space-y-3">
                      {crossSellSuggestions.map((suggestion, index) => (
                        <motion.div
                          key={suggestion.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className="flex items-center gap-4 p-3 bg-gradient-to-r from-diner-cream to-white rounded-xl border-2 border-diner-mustard/20"
                        >
                          <img
                            src={suggestion.item.image || '/placeholder.jpg'}
                            alt={suggestion.item.name}
                            className="w-16 h-16 object-cover rounded-lg shadow-md"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-display text-diner-chocolate truncate">
                              {suggestion.item.name}
                            </h4>
                            <p className="text-xs text-diner-chocolate-light line-clamp-1">
                              {suggestion.message || 'Bunu da beğenebilirsiniz'}
                            </p>
                            <div className="mt-1">
                              {suggestion.discountAmount ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm line-through text-gray-400">
                                    ₺{suggestion.item.price}
                                  </span>
                                  <span className="font-display text-green-600">
                                    ₺{Number(suggestion.item.price) - Number(suggestion.discountAmount)}
                                  </span>
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                    İndirimli!
                                  </span>
                                </div>
                              ) : (
                                <span className="font-display text-diner-red">
                                  ₺{suggestion.item.price}
                                </span>
                              )}
                            </div>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleAddAndContinue(suggestion)}
                            className="w-12 h-12 bg-diner-mustard text-diner-chocolate rounded-full flex items-center justify-center text-2xl shadow-lg hover:bg-yellow-400 transition-colors"
                          >
                            +
                          </motion.button>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Popup Footer */}
                  <div className="p-4 bg-gray-50 border-t">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleContinueWithoutCrossSells}
                      className="w-full py-3 bg-diner-red text-white font-display rounded-xl hover:bg-diner-red/90 transition-colors"
                    >
                      Hayır, Devam Et →
                    </motion.button>
                    <p className="text-xs text-center text-gray-400 mt-2">
                      Siparişe devam etmek için tıklayın
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  )
}

// Floating Cart Button
export const CartButton = () => {
  const { totalItems, openCart, totalPrice } = useCart()

  return (
    <motion.button
      onClick={openCart}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-24 right-4 z-40 bg-diner-mustard text-diner-chocolate rounded-full shadow-lg flex items-center gap-2 px-4 py-3 font-display"
      style={{ boxShadow: '4px 4px 0 0 rgba(61, 35, 20, 0.3)' }}
    >
      <span className="text-xl">🛒</span>
      {totalItems > 0 && (
        <>
          <span className="text-sm">{totalItems} ürün</span>
          <span className="text-xs">•</span>
          <span className="text-sm font-bold">₺{totalPrice}</span>
        </>
      )}
      {totalItems === 0 && <span className="text-sm">Sepet</span>}
      
      {/* Badge */}
      {totalItems > 0 && (
        <motion.span
          key={totalItems}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-diner-red text-white rounded-full flex items-center justify-center text-xs font-bold"
        >
          {totalItems}
        </motion.span>
      )}
    </motion.button>
  )
}
