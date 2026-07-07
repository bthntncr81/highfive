import { motion } from 'framer-motion'
import { imageUrl } from '../../../lib/api'
import {
  useMenuCard,
  badgeClass,
  AddedBurst,
  AllergenPills,
  UpsellModal,
  type MenuCardProps,
} from '../useMenuCard'

// Şablon 18 — "Kafe": sıcak, yumuşak gölge, yuvarlak, krem tonlar. Ad serif-ish,
// açıklama italik; küçük yuvarlak görsel solda (opsiyonel). Butik kafe menüsü hissi.
// TÜM mantık useMenuCard'dan; burada SADECE sunum.
export const Template18 = ({ item, cartEnabled }: MenuCardProps) => {
  const c = useMenuCard(item, cartEnabled)
  const img = imageUrl(c.itemImage)

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        whileHover={{ y: -3 }}
        className={`group relative flex h-full flex-col rounded-3xl border border-amber-900/10 bg-[#fbf7f0] p-5 shadow-[0_10px_30px_-12px_rgba(120,80,40,0.25)] transition-shadow hover:shadow-[0_16px_40px_-14px_rgba(120,80,40,0.35)] ${
          c.isOutOfStock ? 'opacity-60' : ''
        }`}
      >
        <div className="flex items-start gap-4">
          {/* Küçük yuvarlak görsel — opsiyonel, solda */}
          {c.hasRealImage && img && (
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full ring-2 ring-amber-900/10 ring-offset-2 ring-offset-[#fbf7f0]">
              <img
                src={img}
                alt={c.name}
                loading="lazy"
                className={`h-full w-full object-cover transition-transform duration-500 ${
                  c.isOutOfStock ? 'grayscale' : 'group-hover:scale-110'
                }`}
              />
              <AddedBurst show={c.showAdded} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display text-xl italic leading-snug text-amber-950 transition-colors group-hover:text-primary">
                {c.name}
              </h3>
              {/* Kafe menü noktalı ayraç */}
              <span className="mx-1 mb-1 hidden flex-1 self-end border-b border-dotted border-amber-900/30 sm:block" />
              <span className="flex shrink-0 items-baseline gap-1.5">
                {c.strikePrice && (
                  <span className="text-sm text-amber-900/40 line-through">₺{c.strikePrice}</span>
                )}
                <span className="font-display text-xl font-semibold text-primary">₺{c.displayPrice}</span>
              </span>
            </div>

            {/* Rozetler — yumuşak, yuvarlak */}
            {(c.featured || c.badges.length > 0) && !c.isOutOfStock && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {c.featured && (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-medium text-white"
                    style={{ background: 'rgb(var(--brand-500))' }}
                  >
                    ⭐ Önerilen
                  </span>
                )}
                {c.badges.map((b, i) => (
                  <span key={i} className={`${badgeClass(b)} !rounded-full`}>
                    {b}
                  </span>
                ))}
              </div>
            )}

            {c.isOutOfStock && (
              <span className="mt-1.5 inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-medium text-red-600">
                {c.outOfStockReason || 'Tükendi'}
              </span>
            )}
          </div>
        </div>

        <p className="mt-3 line-clamp-3 flex-1 font-body text-sm italic leading-relaxed text-amber-950/70">
          {c.description}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-amber-900/50">
          {c.prepTime && <span>⏱️ {c.prepTime} dk</span>}
          {c.calories && <span>🔥 {c.calories} kcal</span>}
          {c.allergens.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                c.toggleAllergens()
              }}
              className="inline-flex items-center gap-1 text-orange-500 transition-colors hover:text-orange-600"
              title="Alerjen bilgisi"
            >
              ⚠️ Alerjen
            </button>
          )}
        </div>

        <AllergenPills show={c.showAllergens} allergens={c.allergens} />

        {/* Görselsiz kartta 'Sepete eklendi' geri bildirimi için relatif konteyner */}
        {c.cartEnabled && (
          <div className="relative mt-3">
            {!c.hasRealImage && <AddedBurst show={c.showAdded} />}
            <motion.button
              onClick={c.addToCart}
              disabled={c.isOutOfStock}
              whileHover={{ scale: c.isOutOfStock ? 1 : 1.02 }}
              whileTap={{ scale: c.isOutOfStock ? 1 : 0.98 }}
              className={`flex w-full items-center justify-center gap-2 rounded-full border py-2.5 font-display text-sm transition-colors ${
                c.isOutOfStock
                  ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                  : 'border-primary bg-transparent text-primary hover:bg-primary hover:text-white'
              }`}
            >
              {c.isOutOfStock ? '❌ Stokta Yok' : '☕ Sepete Ekle'}
            </motion.button>
          </div>
        )}
      </motion.article>

      <UpsellModal card={c} />
    </>
  )
}
