import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { orderApi, loyaltyApi } from '../lib/api'
import { useCart } from '../lib/cartStore'

// Server-shaped bundle. Supports both legacy BundleOptionGroup (in-bundle)
// and new BundleOptionGroupAssignment (reusable OptionGroup with extraPrice).
type LegacyOptionGroup = {
  id: string
  name: string
  pickCount: number
  priceMode: 'INCLUDED' | 'ADD_PRICE'
  categoryId: string | null
  eligibleItemIds: string[]
  sortOrder: number
}

type ReusableAssignment = {
  id: string
  sortOrder: number
  quantity: number
  optionGroup: {
    id: string
    name: string
    description: string | null
    minSelect: number
    maxSelect: number
    items: Array<{
      id: string
      extraPrice: string | number
      menuItem: { id: string; name: string; price: string | number; image?: string | null }
    }>
  }
}

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
  optionGroups: LegacyOptionGroup[]
  optionGroupAssignments?: ReusableAssignment[]
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

// Unified slot — render adımları için
type UnifiedSlot =
  | {
      type: 'LEGACY'
      key: string // legacy:groupId
      group: LegacyOptionGroup
      label: string
    }
  | {
      type: 'REUSABLE'
      key: string // assignmentId:slotIndex
      assignmentId: string
      slotIndex: number
      group: ReusableAssignment['optionGroup']
      label: string
    }

export const BundleSection = ({ categoryFilter }: { categoryFilter?: string | null } = {}) => {
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

  // Kategoriye göre filtrele (categoryFilter null = sadece kategorisiz, undefined = tümü)
  const visibleBundles = categoryFilter !== undefined
    ? bundles.filter((b) => (b as any).categoryId === categoryFilter)
    : bundles

  if (loading) return null
  if (visibleBundles.length === 0) return null

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
          {visibleBundles.map((b) => {
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

  // Eski + yeni opsiyon gruplarını birleşik slot listesine dönüştür
  const slots: UnifiedSlot[] = useMemo(() => {
    const out: UnifiedSlot[] = []
    // Legacy groups (BundleOptionGroup)
    const legacy = [...(bundle.optionGroups ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
    for (const g of legacy) {
      out.push({
        type: 'LEGACY',
        key: `legacy:${g.id}`,
        group: g,
        label: g.name,
      })
    }
    // Reusable assignments (BundleOptionGroupAssignment) — quantity slot oluştur
    const reusable = [...(bundle.optionGroupAssignments ?? [])].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    )
    for (const a of reusable) {
      const qty = Math.max(1, a.quantity || 1)
      for (let i = 0; i < qty; i++) {
        out.push({
          type: 'REUSABLE',
          key: `${a.id}:${i}`,
          assignmentId: a.id,
          slotIndex: i,
          group: a.optionGroup,
          label: qty > 1 ? `${a.optionGroup.name} #${i + 1}` : a.optionGroup.name,
        })
      }
    }
    return out
  }, [bundle.optionGroups, bundle.optionGroupAssignments])

  // selections[slot.key] = MenuItem.id[] (legacy) veya OptionGroupItem.id[] (reusable)
  const [selections, setSelections] = useState<Record<string, string[]>>({})

  // step index — last step (slots.length) is the review step
  const [step, setStep] = useState(0)

  const eligibleForLegacy = (g: LegacyOptionGroup): ApiMenuItem[] => {
    if (g.eligibleItemIds && g.eligibleItemIds.length > 0) {
      const set = new Set(g.eligibleItemIds)
      return menuItems.filter((m) => set.has(m.id))
    }
    if (g.categoryId) {
      return menuItems.filter((m) => m.categoryId === g.categoryId)
    }
    return menuItems
  }

  const togglePick = (slot: UnifiedSlot, optionId: string) => {
    setSelections((prev) => {
      const next = { ...prev }
      const arr = [...(next[slot.key] ?? [])]
      const idx = arr.indexOf(optionId)
      if (idx >= 0) {
        arr.splice(idx, 1)
      } else {
        const max =
          slot.type === 'LEGACY' ? slot.group.pickCount : slot.group.maxSelect
        if (arr.length >= max) {
          // FIFO replacement when full
          arr.shift()
        }
        arr.push(optionId)
      }
      next[slot.key] = arr
      return next
    })
  }

  const isReview = step === slots.length
  const currentSlot = !isReview ? slots[step] : null
  const currentSelections = currentSlot ? selections[currentSlot.key] ?? [] : []
  const canAdvance = !isReview && currentSlot
    ? currentSlot.type === 'LEGACY'
      ? currentSelections.length === currentSlot.group.pickCount
      : currentSelections.length >= currentSlot.group.minSelect &&
        currentSelections.length <= currentSlot.group.maxSelect
    : true

  // Ek fiyat hesabı — gösterim için (backend gerçek otorite)
  const addPriceTotal = useMemo(() => {
    let extra = 0
    for (const slot of slots) {
      const picks = selections[slot.key] ?? []
      if (slot.type === 'LEGACY') {
        if (slot.group.priceMode !== 'ADD_PRICE') continue
        for (const id of picks) {
          const mi = menuItems.find((m) => m.id === id)
          if (mi) extra += num(mi.price)
        }
      } else {
        for (const id of picks) {
          const ogi = slot.group.items.find((it) => it.id === id)
          if (ogi) extra += num(ogi.extraPrice)
        }
      }
    }
    return extra
  }, [slots, selections, menuItems])

  const totalPrice = num(bundle.bundlePrice) + addPriceTotal

  // Hiç opsiyon yoksa direkt onaya geçilebilsin
  const noOptions = slots.length === 0
  const showReview = isReview || noOptions

  const handleConfirm = () => {
    // Cart entry için legacy+reusable seçimlerini ortak listede topla
    addBundle({
      bundleId: bundle.id,
      name: bundle.name,
      image: bundle.image || undefined,
      totalPrice,
      fixedItemNames: bundle.items.map((it) => `${it.quantity}x ${it.menuItem.name}`),
      selections: slots.map((slot) => {
        const picks = selections[slot.key] ?? []
        if (slot.type === 'LEGACY') {
          return {
            groupId: slot.group.id,
            groupName: slot.group.name,
            items: picks
              .map((id) => {
                const mi = menuItems.find((m) => m.id === id)
                return mi ? { id: mi.id, name: mi.name, price: num(mi.price) } : null
              })
              .filter(Boolean) as { id: string; name: string; price: number }[],
          }
        }
        // REUSABLE — id = OptionGroupItem.id, price = extraPrice
        return {
          groupId: `${slot.assignmentId}:${slot.slotIndex}`,
          groupName: slot.label,
          items: picks
            .map((id) => {
              const ogi = slot.group.items.find((it) => it.id === id)
              return ogi
                ? { id: ogi.id, name: ogi.menuItem.name, price: num(ogi.extraPrice) }
                : null
            })
            .filter(Boolean) as { id: string; name: string; price: number }[],
        }
      }),
    })
    onClose()
    setTimeout(() => openCart(), 200)
  }

  // Modal'ı body'ye portal et — sticky kategori bar'ın stacking context'inden
  // bağımsız olsun, hep en üstte render olsun.
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
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
          {slots.length > 0 && (
            <div className="flex gap-1.5 mt-4">
              {slots.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-white' : 'bg-white/30'}`}
                />
              ))}
              <div
                className={`h-1 flex-1 rounded-full ${step >= slots.length ? 'bg-white' : 'bg-white/30'}`}
              />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {!showReview && currentSlot ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-display font-bold text-lg">{currentSlot.label}</h4>
                <span className="text-sm text-foreground-muted">
                  {currentSelections.length} /
                  {currentSlot.type === 'LEGACY'
                    ? ` ${currentSlot.group.pickCount} seçildi`
                    : currentSlot.group.minSelect === currentSlot.group.maxSelect
                      ? ` ${currentSlot.group.maxSelect} seçildi`
                      : ` ${currentSlot.group.minSelect}-${currentSlot.group.maxSelect}`}
                </span>
              </div>
              <p className="text-xs text-foreground-muted mb-3">
                {currentSlot.type === 'LEGACY'
                  ? currentSlot.group.priceMode === 'ADD_PRICE'
                    ? '💡 Bu gruptaki seçim ürün fiyatınca pakete eklenir'
                    : '✓ Bu gruptaki seçim paket fiyatına dahil'
                  : '💡 Seçilen ürünün ek fiyatı (varsa) paket tabanına eklenir'}
              </p>

              {currentSlot.type === 'LEGACY' ? (
                <div className="grid sm:grid-cols-2 gap-2">
                  {eligibleForLegacy(currentSlot.group).map((mi) => {
                    const picked = currentSelections.includes(mi.id)
                    return (
                      <button
                        key={mi.id}
                        onClick={() => togglePick(currentSlot, mi.id)}
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
                            {currentSlot.group.priceMode === 'ADD_PRICE' && (
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
              ) : (
                <div className="grid sm:grid-cols-2 gap-2">
                  {currentSlot.group.items.map((it) => {
                    const picked = currentSelections.includes(it.id)
                    const extra = num(it.extraPrice)
                    return (
                      <button
                        key={it.id}
                        onClick={() => togglePick(currentSlot, it.id)}
                        className={`text-left rounded-xl p-3 border-2 transition-all ${
                          picked
                            ? 'border-accent bg-accent/5 shadow-sm'
                            : 'border-border-light hover:border-accent/40 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {it.menuItem.image ? (
                            <img
                              src={it.menuItem.image}
                              alt={it.menuItem.name}
                              className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-surface flex items-center justify-center text-2xl flex-shrink-0">
                              🍽️
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">
                              {it.menuItem.name}
                            </p>
                            {extra > 0 ? (
                              <p className="text-xs text-primary font-bold">+₺{extra}</p>
                            ) : (
                              <p className="text-xs text-foreground-muted">ücretsiz</p>
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
              )}
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
              {slots.map((slot) => {
                const picks = selections[slot.key] ?? []
                if (picks.length === 0) return null
                return (
                  <div key={slot.key} className="mb-4">
                    <p className="text-xs font-bold uppercase text-foreground-muted mb-2">
                      {slot.label}
                    </p>
                    <ul className="space-y-1 text-sm">
                      {picks.map((id) => {
                        if (slot.type === 'LEGACY') {
                          const mi = menuItems.find((m) => m.id === id)
                          if (!mi) return null
                          return (
                            <li key={id}>
                              • {mi.name}
                              {slot.group.priceMode === 'ADD_PRICE' && (
                                <span className="text-primary font-semibold">
                                  {' '}(+₺{num(mi.price)})
                                </span>
                              )}
                            </li>
                          )
                        }
                        const ogi = slot.group.items.find((it) => it.id === id)
                        if (!ogi) return null
                        const extra = num(ogi.extraPrice)
                        return (
                          <li key={id}>
                            • {ogi.menuItem.name}
                            {extra > 0 && (
                              <span className="text-primary font-semibold"> (+₺{extra})</span>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}
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
            {step > 0 && !showReview && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 py-3 rounded-xl border border-border bg-white font-semibold text-foreground hover:bg-surface"
              >
                ← Geri
              </button>
            )}
            {isReview && !noOptions && (
              <button
                onClick={() => setStep(slots.length - 1)}
                className="flex-1 py-3 rounded-xl border border-border bg-white font-semibold text-foreground hover:bg-surface"
              >
                ← Düzenle
              </button>
            )}
            {!showReview ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canAdvance}
                className="flex-[2] py-3 rounded-xl bg-accent text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent/90"
              >
                {step === slots.length - 1 ? 'Devam' : 'Sonraki'}
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
    </motion.div>,
    document.body,
  )
}
