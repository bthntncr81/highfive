// Pizza & Sandwich Builder — landing 5-step wizard.
// Backend /api/builder/config?type=PIZZA|SANDWICH ile config çekilir.
// Steps: BASE → BASE_SAUCE → CHEESE → CONTENT → TOP_SAUCE
// Live 2D preview: base + her seçilen ingredient'in layerImage'ı stack edilir.

import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, ShoppingCart, X } from 'lucide-react'
import { builderApi, imageUrl, type BuilderConfig } from '../lib/api'
import { useCart } from '../lib/cartStore'

const PREVIEW_SIZE = 280

export default function Builder() {
  const { type } = useParams<{ type: string }>()
  const navigate = useNavigate()
  const { addBuilderItem, openCart } = useCart()

  const builderType = (type === 'sandwich' ? 'SANDWICH' : 'PIZZA') as
    | 'PIZZA'
    | 'SANDWICH'
  const isPizza = builderType === 'PIZZA'

  const [config, setConfig] = useState<BuilderConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [stepIndex, setStepIndex] = useState(0)
  const [baseId, setBaseId] = useState<string | null>(null)
  const [selections, setSelections] = useState<Record<string, string[]>>({})
  const [contentSubTab, setContentSubTab] = useState<'MEAT' | 'VEGETABLE'>('MEAT')

  useEffect(() => {
    setLoading(true)
    builderApi
      .getConfig(builderType.toLowerCase() as 'pizza' | 'sandwich')
      .then((r) => {
        if (r.success && r.data) {
          setConfig(r.data)
          if (r.data.bases.length > 0) setBaseId(r.data.bases[0].id)
        }
      })
      .finally(() => setLoading(false))
  }, [builderType])

  const currentStep = config?.steps?.[stepIndex]
  const totalSteps = config?.steps?.length ?? 0
  const isFirstStep = stepIndex === 0
  const isLastStep = stepIndex === totalSteps - 1

  const selectedBase = useMemo(
    () => config?.bases.find((b) => b.id === baseId) ?? null,
    [config, baseId]
  )

  const selectedIngredients = useMemo(() => {
    if (!config) return []
    const all = new Set<string>()
    Object.values(selections).forEach((ids) => ids.forEach((id) => all.add(id)))
    return config.ingredients
      .filter((i) => all.has(i.id))
      .sort((a, b) => a.layerOrder - b.layerOrder)
  }, [config, selections])

  const totalPrice = useMemo(() => {
    let total = selectedBase?.basePrice ?? 0
    for (const ing of selectedIngredients) total += ing.extraPrice
    return total
  }, [selectedBase, selectedIngredients])

  const canAdvance = useMemo(() => {
    if (!currentStep) return false
    if (currentStep.type === 'BASE') return !!baseId
    if (currentStep.required) return (selections[currentStep.key]?.length ?? 0) > 0
    return true
  }, [currentStep, baseId, selections])

  const handleSelectBase = (id: string) => setBaseId(id)

  const handleToggleIngredient = (ingId: string) => {
    if (!currentStep) return
    const cur = selections[currentStep.key] ?? []
    const isSel = cur.includes(ingId)

    if (isSel) {
      setSelections({ ...selections, [currentStep.key]: cur.filter((x) => x !== ingId) })
      return
    }
    if (!currentStep.multi) {
      setSelections({ ...selections, [currentStep.key]: [ingId] })
      return
    }
    if (currentStep.max && cur.length >= currentStep.max) {
      // Bu seçim ekleme — UI tarafı uyarı verir
      alert(`Bu adımda en fazla ${currentStep.max} seçim yapabilirsin.`)
      return
    }
    setSelections({ ...selections, [currentStep.key]: [...cur, ingId] })
  }

  const handleNext = () => {
    if (!canAdvance) return
    if (isLastStep) {
      handleAddToCart()
    } else {
      setStepIndex((i) => i + 1)
    }
  }

  const handleBack = () => {
    if (isFirstStep) return
    setStepIndex((i) => i - 1)
  }

  const handleSkip = () => {
    if (!currentStep || currentStep.required) return
    if (isLastStep) handleAddToCart()
    else setStepIndex((i) => i + 1)
  }

  const handleAddToCart = () => {
    if (!selectedBase || !config) return

    const ingredientIds = selectedIngredients.map((i) => i.id).sort()
    // Selections'ı kategori bazlı grupla (cart UI gösterimi için)
    const selByCat = new Map<string, { id: string; name: string; extraPrice: number }[]>()
    for (const ing of selectedIngredients) {
      const arr = selByCat.get(ing.category) ?? []
      arr.push({ id: ing.id, name: ing.name, extraPrice: ing.extraPrice })
      selByCat.set(ing.category, arr)
    }

    addBuilderItem({
      builderType: builderType.toLowerCase() as 'pizza' | 'sandwich',
      baseId: selectedBase.id,
      baseName: selectedBase.name,
      baseImage: imageUrl(selectedBase.baseImage) ?? undefined,
      ingredientIds,
      totalPrice,
      selections: Array.from(selByCat.entries()).map(([cat, items]) => ({
        category: cat,
        items,
      })),
    })

    setTimeout(() => {
      navigate('/order')
      openCart()
    }, 200)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-pulse">{isPizza ? '🍕' : '🥪'}</div>
          <p className="mt-3 text-foreground-muted">Hazırlanıyor...</p>
        </div>
      </div>
    )
  }

  if (!config || config.bases.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="text-7xl">{isPizza ? '🍕' : '🥪'}</div>
          <h2 className="mt-4 text-2xl font-display font-bold">
            Bu özellik henüz aktif değil
          </h2>
          <p className="mt-2 text-foreground-muted">
            Yöneticiler {isPizza ? 'pizza' : 'sandviç'} tabanlarını ve malzemeleri
            eklediğinde burası açılır.
          </p>
          <Link
            to="/menu"
            className="mt-6 inline-flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-full font-display font-bold"
          >
            Menüye git
          </Link>
        </div>
      </div>
    )
  }

  // Mevcut step için ingredient listesi
  const stepIngredients =
    currentStep?.type === 'INGREDIENT'
      ? config.ingredients.filter((i) =>
          currentStep.categories?.includes(i.category)
        )
      : []
  const visibleIngredients =
    currentStep?.key === 'CONTENT'
      ? stepIngredients.filter((i) => i.category === contentSubTab)
      : stepIngredients

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-border-light">
        <div className="container-diner py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-surface hover:bg-border transition"
            aria-label="Geri"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-display font-extrabold flex-1 text-center mx-3 truncate">
            {isPizza ? '🍕 Pizzanı Tasarla' : '🥪 Sandviçini Tasarla'}
          </h1>
          <div className="px-3 py-1 bg-primary/10 rounded-full">
            <span className="text-xs font-extrabold text-primary">
              {stepIndex + 1}/{totalSteps}
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="container-diner pb-2 flex gap-1">
          {config.steps.map((s, i) => (
            <div
              key={s.key}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= stepIndex ? 'bg-primary' : 'bg-border-light'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="container-diner py-4">
        {/* Live preview (sticky positioned for desktop, top for mobile) */}
        <div className="flex justify-center mb-6">
          <div
            className="relative"
            style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
          >
            {selectedBase && (
              <img
                src={imageUrl(selectedBase.baseImage) ?? ''}
                alt={selectedBase.name}
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  borderRadius: isPizza ? '50%' : '16px',
                  zIndex: 0,
                }}
              />
            )}
            <AnimatePresence>
              {selectedIngredients.map((ing) => {
                const url = imageUrl(ing.layerImage)
                if (!url) return null
                return (
                  <motion.img
                    key={ing.id}
                    src={url}
                    alt={ing.name}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    style={{
                      borderRadius: isPizza ? '50%' : '16px',
                      zIndex: ing.layerOrder,
                    }}
                  />
                )
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Step header */}
        {currentStep && (
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-foreground-muted">
              Adım {stepIndex + 1}
            </p>
            <h2 className="mt-1 text-2xl font-display font-extrabold text-foreground">
              {currentStep.title}
            </h2>
            <p className="mt-0.5 text-sm text-foreground-muted">
              {currentStep.helper}
              {currentStep.multi && currentStep.max
                ? ` (${selections[currentStep.key]?.length ?? 0}/${currentStep.max})`
                : ''}
            </p>
          </div>
        )}

        {/* CONTENT sub-tabs */}
        {currentStep?.key === 'CONTENT' && (
          <div className="mb-4 flex gap-2 p-1 bg-surface rounded-2xl">
            {(['MEAT', 'VEGETABLE'] as const).map((t) => {
              const active = t === contentSubTab
              return (
                <button
                  key={t}
                  onClick={() => setContentSubTab(t)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition ${
                    active
                      ? 'bg-white shadow-sm text-foreground'
                      : 'text-foreground-muted'
                  }`}
                >
                  {t === 'MEAT' ? '🥩 Et' : '🥗 Sebze / Mantar'}
                </button>
              )
            })}
          </div>
        )}

        {/* Step content */}
        {currentStep?.type === 'BASE' ? (
          // BASE selection
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {config.bases.map((b) => {
              const checked = b.id === baseId
              const url = imageUrl(b.baseImage)
              return (
                <motion.button
                  key={b.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSelectBase(b.id)}
                  className={`relative rounded-2xl border-2 p-3 text-left transition ${
                    checked
                      ? 'border-primary bg-primary/5'
                      : 'border-border-light bg-white hover:border-primary/40'
                  }`}
                >
                  <div
                    className="bg-surface rounded-xl flex items-center justify-center"
                    style={{ aspectRatio: '1/1' }}
                  >
                    {url ? (
                      <img
                        src={url}
                        alt={b.name}
                        className="w-[85%] h-[85%] object-cover"
                        style={{ borderRadius: isPizza ? '50%' : '12px' }}
                      />
                    ) : (
                      <div className="text-5xl">{isPizza ? '🍕' : '🥪'}</div>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-bold truncate">{b.name}</p>
                  <p className="text-xs text-primary font-bold">
                    {b.basePrice.toFixed(2)} ₺
                  </p>
                  {checked && (
                    <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </motion.button>
              )
            })}
          </div>
        ) : visibleIngredients.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl">🤷</div>
            <p className="mt-3 text-sm text-foreground-muted">
              Bu kategoride malzeme yok
            </p>
            {!currentStep?.required && (
              <button
                onClick={handleSkip}
                className="mt-4 px-5 py-2.5 bg-primary text-white rounded-full text-sm font-bold"
              >
                Geç →
              </button>
            )}
          </div>
        ) : (
          // INGREDIENT selection
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {visibleIngredients.map((ing) => {
              const checked = (selections[currentStep!.key] ?? []).includes(ing.id)
              const thumb = imageUrl(ing.layerImage)
              return (
                <motion.button
                  key={ing.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleToggleIngredient(ing.id)}
                  className={`relative rounded-2xl border-2 p-2 text-center transition ${
                    checked
                      ? 'border-primary bg-primary/5'
                      : 'border-border-light bg-white hover:border-primary/40'
                  }`}
                >
                  <div
                    className="bg-surface rounded-xl flex items-center justify-center"
                    style={{ aspectRatio: '1/1' }}
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={ing.name}
                        className="w-[75%] h-[75%] object-contain"
                      />
                    ) : (
                      <div className="text-3xl">🍽️</div>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] font-bold truncate">{ing.name}</p>
                  <p className="text-[10px] text-primary font-bold">
                    {ing.extraPrice > 0 ? `+${ing.extraPrice.toFixed(0)} ₺` : 'ücretsiz'}
                  </p>
                  {checked && (
                    <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </motion.button>
              )
            })}
          </div>
        )}

        {/* Skip link for opsiyonel steps */}
        {currentStep && !currentStep.required && visibleIngredients.length > 0 && (
          <div className="mt-4 text-center">
            <button
              onClick={handleSkip}
              className="text-sm text-foreground-muted underline font-semibold"
            >
              Bu adımı atla →
            </button>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border-light shadow-lg z-30">
        <div className="container-diner py-3 flex items-center justify-between gap-3">
          <button
            onClick={handleBack}
            disabled={isFirstStep}
            className={`h-12 w-12 flex items-center justify-center rounded-full transition ${
              isFirstStep
                ? 'bg-surface text-border'
                : 'bg-foreground/10 text-foreground hover:bg-foreground/15'
            }`}
            aria-label="Geri"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="text-center flex-1">
            <p className="text-[10px] uppercase tracking-widest text-foreground-muted">
              Toplam
            </p>
            <p className="text-2xl font-display font-extrabold text-primary">
              {totalPrice.toFixed(2)} ₺
            </p>
          </div>

          <button
            onClick={handleNext}
            disabled={!canAdvance}
            className={`flex items-center gap-2 px-5 py-3 rounded-full font-bold transition ${
              canAdvance
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-border text-foreground-subtle cursor-not-allowed'
            }`}
          >
            {isLastStep ? (
              <>
                <ShoppingCart className="w-5 h-5" />
                <span>Sepete Ekle</span>
              </>
            ) : (
              <>
                <span>İleri</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
