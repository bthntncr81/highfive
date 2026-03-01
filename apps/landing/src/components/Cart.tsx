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

    const timeout = setTimeout(fetchCrossSells, 500)
    return () => clearTimeout(timeout)
  }, [items, apiMenuItems])

  const handleCheckout = () => {
    if (items.length === 0) return

    if (crossSellSuggestions.length > 0) {
      setShowCrossSellPopup(true)
      return
    }

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

    suggestionApi.trackCrossSellAccepted(suggestion.id)

    setCrossSellSuggestions((prev) =>
      prev.filter((s) => s.id !== suggestion.id)
    )
  }

  const handleAddAndContinue = (suggestion: CrossSellSuggestion) => {
    handleAddCrossSell(suggestion)

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
            className="fixed right-0 top-0 h-full w-full max-w-md bg-background z-50 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="bg-primary text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
                <div>
                  <h2 className="font-display font-bold text-xl">Sepetim</h2>
                  <p className="text-sm text-white/80">{totalItems} ürün</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={closeCart}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
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
                  <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                    </svg>
                  </div>
                  <p className="font-display font-semibold text-xl text-foreground-muted">
                    Sepetiniz boş
                  </p>
                  <p className="text-foreground-subtle mt-2">
                    Lezzetli ürünlerimizi keşfedin!
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {items.map((cartItem) => (
                      <motion.div
                        key={cartItem.item.id}
                        layout
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50, height: 0 }}
                        className="bg-white rounded-xl p-3 border border-border-light shadow-sm"
                      >
                        <div className="flex gap-3">
                          {/* Image */}
                          <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-surface">
                            <img
                              src={cartItem.item.image}
                              alt={cartItem.item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-display font-semibold text-foreground truncate">
                              {cartItem.item.name}
                            </h4>
                            <p className="text-sm text-foreground-muted line-clamp-1">
                              {cartItem.item.desc}
                            </p>
                            <p className="font-display font-bold text-primary mt-1">
                              ₺{cartItem.item.price}
                            </p>
                          </div>

                          {/* Remove Button */}
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => removeItem(cartItem.item.id)}
                            className="text-foreground-subtle hover:text-primary transition-colors self-start"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </motion.button>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-light">
                          <div className="flex items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() =>
                                updateQuantity(cartItem.item.id, cartItem.quantity - 1)
                              }
                              className="w-8 h-8 rounded-full bg-surface flex items-center justify-center font-display text-lg hover:bg-primary/10 transition-colors"
                            >
                              −
                            </motion.button>
                            <span className="font-display font-bold text-lg w-8 text-center">
                              {cartItem.quantity}
                            </span>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() =>
                                updateQuantity(cartItem.item.id, cartItem.quantity + 1)
                              }
                              className="w-8 h-8 rounded-full bg-surface flex items-center justify-center font-display text-lg hover:bg-primary/10 transition-colors"
                            >
                              +
                            </motion.button>
                          </div>
                          <span className="font-display font-bold text-foreground">
                            ₺{cartItem.item.price * cartItem.quantity}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Cross-sell hint */}
                  {crossSellSuggestions.length > 0 && !loadingCrossSells && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-3 bg-accent/5 rounded-xl border border-accent/20"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-display font-semibold text-sm text-foreground">
                            {crossSellSuggestions.length} öneri sizin için hazır!
                          </p>
                          <p className="text-xs text-foreground-muted">
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
                className="border-t border-border bg-white p-4 space-y-4"
              >
                {/* Clear Cart Button */}
                <button
                  onClick={clearCart}
                  className="text-sm text-foreground-muted hover:text-primary transition-colors underline"
                >
                  Sepeti Temizle
                </button>

                {/* Total */}
                <div className="flex items-center justify-between">
                  <span className="font-display font-semibold text-lg text-foreground">
                    Toplam
                  </span>
                  <span className="font-display font-bold text-2xl text-primary">
                    ₺{totalPrice}
                  </span>
                </div>

                {/* Checkout Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCheckout}
                  className="w-full btn-primary text-lg py-4"
                >
                  Sipariş Ver
                  {crossSellSuggestions.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold">
                      +{crossSellSuggestions.length} öneri
                    </span>
                  )}
                </motion.button>

                <p className="text-xs text-center text-foreground-subtle">
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
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={handleContinueWithoutCrossSells}
                  className="absolute inset-0 bg-black/70"
                />

                <motion.div
                  initial={{ scale: 0.8, opacity: 0, y: 50 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0, y: 50 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  className="relative bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden shadow-2xl"
                >
                  {/* Popup Header */}
                  <div className="bg-accent p-6 text-center text-white">
                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="font-display font-bold text-2xl">
                      Bir Dakika!
                    </h2>
                    <p className="text-white/80 mt-1">
                      Siparişinize bunları da eklemek ister misiniz?
                    </p>
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
                          className="flex items-center gap-4 p-3 bg-surface rounded-xl border border-border-light"
                        >
                          <img
                            src={suggestion.item.image || '/placeholder.jpg'}
                            alt={suggestion.item.name}
                            className="w-16 h-16 object-cover rounded-lg shadow-sm"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-display font-semibold text-foreground truncate">
                              {suggestion.item.name}
                            </h4>
                            <p className="text-xs text-foreground-muted line-clamp-1">
                              {suggestion.message || 'Bunu da beğenebilirsiniz'}
                            </p>
                            <div className="mt-1">
                              {suggestion.discountAmount ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm line-through text-foreground-subtle">
                                    ₺{suggestion.item.price}
                                  </span>
                                  <span className="font-display font-bold text-emerald-600">
                                    ₺{Number(suggestion.item.price) - Number(suggestion.discountAmount)}
                                  </span>
                                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                    İndirimli!
                                  </span>
                                </div>
                              ) : (
                                <span className="font-display font-bold text-primary">
                                  ₺{suggestion.item.price}
                                </span>
                              )}
                            </div>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleAddAndContinue(suggestion)}
                            className="w-10 h-10 bg-accent text-white rounded-full flex items-center justify-center text-xl shadow-md hover:bg-accent-dark transition-colors"
                          >
                            +
                          </motion.button>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Popup Footer */}
                  <div className="p-4 bg-surface border-t border-border-light">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleContinueWithoutCrossSells}
                      className="w-full btn-primary"
                    >
                      Hayır, Devam Et →
                    </motion.button>
                    <p className="text-xs text-center text-foreground-subtle mt-2">
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
      className="fixed bottom-24 right-4 z-40 bg-primary text-white rounded-full shadow-lg flex items-center gap-2 px-4 py-3 font-display font-semibold"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
      {totalItems > 0 && (
        <>
          <span className="text-sm">{totalItems} ürün</span>
          <span className="text-xs opacity-70">•</span>
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
          className="absolute -top-2 -right-2 w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-xs font-bold"
        >
          {totalItems}
        </motion.span>
      )}
    </motion.button>
  )
}
