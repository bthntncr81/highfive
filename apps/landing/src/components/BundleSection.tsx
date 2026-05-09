import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { orderApi, loyaltyApi } from '../lib/api'
import { useCart } from '../lib/cartStore'

// Server-shaped bundle. We accept loose types because the menu items inside
// can vary between bundles (some have categoryId, some have eligibleItemIds).
type ApiBundle = {
  id: string
  name: string
  description?: string | null
  image?: string | null
  bundlePrice: string | number
  originalPrice: string | number
  savings: string | number
  items: Array<{
    quantity: number
    menuItem: { id: string; name: string; price: string | number; image?: string | null }
  }>
  optionGroups: Array<{
    id: string
    name: string
    pickCount: number
    priceMode: 'INCLUDED' | 'ADD_PRICE'
    categoryId: string | null
    eligibleItemIds: string[]
    sortOrder: number
  }>
}

type ApiMenuItem = {
  id: string
  name: string
  price: string | number
  image?: string | null
  categoryId?: string
  available?: boolean
}

const num = (v: string | number) => (typeof v === 'string' ? parseFloat(v) : v)

export const BundleSection = () => {
  const [bundles, setBundles] = useState<ApiBundle[]>([])
  const [menuItems, setMenuItems] = useState<ApiMenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<ApiBundle | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([orderApi.getMenu(), loyaltyApi.getActiveBundles()])
      .then(([menuRes, bundleRes]: any[]) => {
        if (!alive) return
        if (menuRes?.success && menuRes.data?.items) setMenuItems(menuRes.data.items)
        if (bundleRes?.success && bundleRes.data?.bundles) setBundles(bundleRes.data.bundles)
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  if (loading) return null
  if (bundles.length === 0) return null

  return (
    <>
      <section className="mb-10">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-2xl text-foreground flex items-center gap-2">
              <span className="text-3xl">📦</span> Paket Menüler
            </h2>
            <p className="text-sm text-foreground-muted">
              İstediğin ürünleri seç, paket fiyatından kazan
            </p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bundles.map((b) => {
            const price = num(b.bundlePrice)
            const orig = num(b.originalPrice)
            const savings = num(b.savings)
            return (
              <motion.button
                key={b.id}
                whileHover={{ y: -4 }}
                onClick={() => setActive(b)}
                className="text-left bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border border-border-light"
              >
                {b.image ? (
                  <img src={b.image} alt={b.name} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-accent/20 to-accent/40 flex items-center justify-center text-6xl">
                    📦
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-display font-bold text-lg text-foreground">{b.name}</h3>
                  {b.description && (
                    <p className="text-sm text-foreground-muted line-clamp-2 mt-1">
                      {b.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      {orig > price && (
                        <p className="text-xs line-through text-foreground-subtle">₺{orig}</p>
                      )}
                      <p className="text-xl font-bold text-primary">₺{price}+</p>
                    </div>
                    {savings > 0 && (
                      <span className="text-[11px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                        ₺{savings} tasarruf
                      </span>
                    )}
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent">
                    Özelleştir →
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>
      </section>

      <AnimatePresence>
        {active && (
          <BundlePickerModal
            bundle={active}
            menuItems={menuItems}
            onClose={() => setActive(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// Step-by-step picker. One step per option group; review at the end.
const BundlePickerModal = ({
  bundle,
  menuItems,
  onClose,
}: {
  bundle: ApiBundle
  menuItems: ApiMenuItem[]
  onClose: () => void
}) => {
  const { addBundle, openCart } = useCart()
  const groups = useMemo(
    () => [...bundle.optionGroups].sort((a, b) => a.sortOrder - b.sortOrder),
    [bundle.optionGroups],
  )
  // step index — last step (groups.length) is the review step
  const [step, setStep] = useState(0)
  // selections[groupIdx] = MenuItem.id[]   (length = group.pickCount when valid)
  const [selections, setSelections] = useState<string[][]>(() =>
    groups.map(() => [] as string[]),
  )

  const eligibleFor = (g: ApiBundle['optionGroups'][number]): ApiMenuItem[] => {
    if (g.eligibleItemIds && g.eligibleItemIds.length > 0) {
      const set = new Set(g.eligibleItemIds)
      return menuItems.filter((m) => set.has(m.id))
    }
    if (g.categoryId) {
      return menuItems.filter((m) => m.categoryId === g.categoryId)
    }
    return menuItems
  }

  const togglePick = (groupIdx: number, itemId: string) => {
    setSelections((prev) => {
      const next = prev.map((arr) => [...arr])
      const arr = next[groupIdx]
      const g = groups[groupIdx]
      const idx = arr.indexOf(itemId)
      if (idx >= 0) {
        arr.splice(idx, 1)
      } else {
        if (arr.length >= g.pickCount) {
          // already full — replace the first pick (FIFO)
          arr.shift()
        }
        arr.push(itemId)
      }
      return next
    })
  }

  const isReview = step === groups.length
  const currentGroup = !isReview ? groups[step] : null
  const currentSelections = !isReview ? selections[step] : []
  const canAdvance = !isReview
    ? currentSelections.length === currentGroup!.pickCount
    : true

  // ADD_PRICE total estimate (purely for display — server is the source of truth)
  const addPriceTotal = useMemo(() => {
    let extra = 0
    groups.forEach((g, i) => {
      if (g.priceMode !== 'ADD_PRICE') return
      for (const id of selections[i] || []) {
        const mi = menuItems.find((m) => m.id === id)
        if (mi) extra += num(mi.price)
      }
    })
    return extra
  }, [groups, selections, menuItems])

  const totalPrice = num(bundle.bundlePrice) + addPriceTotal

  const handleConfirm = () => {
    addBundle({
      bundleId: bundle.id,
      name: bundle.name,
      image: bundle.image || undefined,
      totalPrice,
      fixedItemNames: bundle.items.map((it) => `${it.quantity}x ${it.menuItem.name}`),
      selections: groups.map((g, i) => ({
        groupId: g.id,
        groupName: g.name,
        items: (selections[i] || [])
          .map((id) => {
            const mi = menuItems.find((m) => m.id === id)
            return mi ? { id: mi.id, name: mi.name, price: num(mi.price) } : null
          })
          .filter(Boolean) as { id: string; name: string; price: number }[],
      })),
    })
    onClose()
    setTimeout(() => openCart(), 200)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-accent text-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                Paket Menü
              </p>
              <h3 className="font-display font-bold text-2xl">{bundle.name}</h3>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white text-xl">
              ✕
            </button>
          </div>
          {/* Step indicator */}
          {groups.length > 0 && (
            <div className="flex gap-1.5 mt-4">
              {groups.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-white' : 'bg-white/30'}`}
                />
              ))}
              <div
                className={`h-1 flex-1 rounded-full ${step >= groups.length ? 'bg-white' : 'bg-white/30'}`}
              />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {!isReview && currentGroup ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-display font-bold text-lg">{currentGroup.name}</h4>
                <span className="text-sm text-foreground-muted">
                  {currentSelections.length} / {currentGroup.pickCount} seçildi
                </span>
              </div>
              <p className="text-xs text-foreground-muted mb-3">
                {currentGroup.priceMode === 'ADD_PRICE'
                  ? '💡 Bu gruptaki seçim ürün fiyatınca pakete eklenir'
                  : '✓ Bu gruptaki seçim paket fiyatına dahil'}
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {eligibleFor(currentGroup).map((mi) => {
                  const picked = currentSelections.includes(mi.id)
                  return (
                    <button
                      key={mi.id}
                      onClick={() => togglePick(step, mi.id)}
                      className={`text-left rounded-xl p-3 border-2 transition-all ${
                        picked
                          ? 'border-accent bg-accent/5 shadow-sm'
                          : 'border-border-light hover:border-accent/40 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {mi.image ? (
                          <img
                            src={mi.image}
                            alt={mi.name}
                            className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-surface flex items-center justify-center text-2xl flex-shrink-0">
                            🍽️
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">
                            {mi.name}
                          </p>
                          {currentGroup.priceMode === 'ADD_PRICE' && (
                            <p className="text-xs text-primary font-bold">+₺{num(mi.price)}</p>
                          )}
                        </div>
                        {picked && (
                          <div className="w-6 h-6 bg-accent rounded-full text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                            ✓
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              <h4 className="font-display font-bold text-lg mb-3">Paketi Onayla</h4>
              {bundle.items.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase text-foreground-muted mb-2">
                    Pakete dahil
                  </p>
                  <ul className="space-y-1 text-sm">
                    {bundle.items.map((it, i) => (
                      <li key={i}>
                        • {it.quantity}x {it.menuItem.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {groups.map((g, i) => (
                <div key={g.id} className="mb-4">
                  <p className="text-xs font-bold uppercase text-foreground-muted mb-2">
                    {g.name}
                  </p>
                  <ul className="space-y-1 text-sm">
                    {selections[i].map((id) => {
                      const mi = menuItems.find((m) => m.id === id)
                      if (!mi) return null
                      return (
                        <li key={id}>
                          • {mi.name}
                          {g.priceMode === 'ADD_PRICE' && (
                            <span className="text-primary font-semibold">
                              {' '}
                              (+₺{num(mi.price)})
                            </span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border-light p-4 bg-surface">
          <div className="flex items-center justify-between mb-3">
            <span className="font-display font-semibold text-foreground">Toplam</span>
            <span className="font-display font-bold text-2xl text-primary">₺{totalPrice}</span>
          </div>
          <div className="flex gap-2">
            {step > 0 && !isReview && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 py-3 rounded-xl border border-border bg-white font-semibold text-foreground hover:bg-surface"
              >
                ← Geri
              </button>
            )}
            {isReview && (
              <button
                onClick={() => setStep(groups.length - 1)}
                className="flex-1 py-3 rounded-xl border border-border bg-white font-semibold text-foreground hover:bg-surface"
              >
                ← Düzenle
              </button>
            )}
            {!isReview ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canAdvance}
                className="flex-[2] py-3 rounded-xl bg-accent text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent/90"
              >
                {step === groups.length - 1 ? 'Devam' : 'Sonraki'}
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                className="flex-[2] py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90"
              >
                Sepete Ekle 🛒
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
