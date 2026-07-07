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

// Şablon 08 — "Şık Serif" (Fine-dining): ortalanmış, ince çizgiler üstte/altta,
// serif başlık, fiyat noktalı liderle (name .... ₺). Zarif, minimal, marka rengi ince vurgu.
// TÜM mantık useMenuCard hook'undan gelir; burada SADECE sunum var.
export const Template08 = ({ item, cartEnabled }: MenuCardProps) => {
  const c = useMenuCard(item, cartEnabled)
  const img = imageUrl(c.itemImage)

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        className={`relative flex h-full flex-col items-center bg-white px-6 py-7 text-center ${c.isOutOfStock ? 'opacity-60' : ''}`}
      >
        {/* Üst ince çizgi */}
        <div className="mb-5 h-px w-16" style={{ background: 'rgb(var(--brand-500))' }} />

        {/* Opsiyonel küçük yuvarlak görsel */}
        {c.hasRealImage && img && (
          <div className="relative mb-4">
            <div
              className="relative h-24 w-24 overflow-hidden rounded-full ring-1"
              style={{ boxShadow: '0 0 0 4px rgb(var(--brand-500) / 0.08)' }}
            >
              <img
                src={img}
                alt={c.name}
                loading="lazy"
                className={`h-full w-full object-cover ${c.isOutOfStock ? 'grayscale' : ''}`}
              />
              <AddedBurst show={c.showAdded} />
            </div>
          </div>
        )}

        {/* Önerilen / rozetler */}
        {(c.featured || c.badges.length > 0) && !c.isOutOfStock && (
          <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
            {c.featured && (
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: 'rgb(var(--brand-500))' }}
              >
                ⭐ Önerilen
              </span>
            )}
            {c.badges.map((b, i) => (
              <span key={i} className={badgeClass(b)}>{b}</span>
            ))}
          </div>
        )}

        {c.isOutOfStock && (
          <span className="mb-2 inline-block rounded-full border border-red-300 bg-red-50 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-red-600">
            {c.outOfStockReason || 'Tükendi'}
          </span>
        )}

        {/* Serif başlık + noktalı lider + fiyat */}
        <div className="flex w-full items-end gap-2">
          <h3 className="font-display text-xl leading-tight text-foreground">{c.name}</h3>
          <span className="mb-1.5 flex-1 border-b border-dotted border-foreground-subtle/50" />
          <div className="flex shrink-0 items-baseline gap-1.5">
            {c.strikePrice && (
              <span className="text-xs text-foreground-subtle line-through">₺{c.strikePrice}</span>
            )}
            <span
              className="font-display text-xl"
              style={{ color: c.hasDiscount ? undefined : 'rgb(var(--brand-500))' }}
            >
              <span className={c.hasDiscount ? 'text-green-600' : ''}>₺{c.displayPrice}</span>
            </span>
          </div>
        </div>

        <p className="mt-2 max-w-[42ch] font-body text-sm italic leading-relaxed text-foreground-muted line-clamp-2">
          {c.description}
        </p>

        <div className="mt-2 flex items-center justify-center gap-3 text-xs text-foreground-subtle">
          {c.prepTime && <span>⏱️ {c.prepTime} dk</span>}
          {c.calories && <span>🔥 {c.calories} kcal</span>}
          {c.allergens.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); c.toggleAllergens() }}
              className="transition-colors hover:text-orange-600"
              title="Alerjen bilgisi"
            >
              ⚠️ Alerjen
            </button>
          )}
        </div>

        <div className="w-full">
          <AllergenPills show={c.showAllergens} allergens={c.allergens} />
        </div>

        {c.cartEnabled && (
          <motion.button
            onClick={c.addToCart}
            disabled={c.isOutOfStock}
            whileHover={{ scale: c.isOutOfStock ? 1 : 1.03 }}
            whileTap={{ scale: c.isOutOfStock ? 1 : 0.97 }}
            className={`mt-4 border-b pb-1 text-sm font-semibold uppercase tracking-[0.15em] transition-colors ${
              c.isOutOfStock
                ? 'cursor-not-allowed border-transparent text-foreground-subtle'
                : 'text-primary border-primary hover:opacity-70'
            }`}
          >
            {c.isOutOfStock ? 'Stokta Yok' : 'Sepete Ekle'}
          </motion.button>
        )}

        {/* Alt ince çizgi */}
        <div className="mt-5 h-px w-16 bg-foreground-subtle/30" />
      </motion.article>
      <UpsellModal card={c} />
    </>
  )
}
