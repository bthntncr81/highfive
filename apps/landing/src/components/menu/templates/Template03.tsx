import { motion } from 'framer-motion'
import {
  useMenuCard,
  badgeClass,
  AllergenPills,
  UpsellModal,
  type MenuCardProps,
} from '../useMenuCard'

// Şablon 03 — "Minimal Liste": görsel YOK. Kart aslında tek bir satır.
// Solda ad + tek satır açıklama, sağda fiyat + küçük ＋ ikon buton. Altında ince
// divider. Tipografi odaklı, çok sade. TÜM mantık useMenuCard'dan gelir.
export const Template03 = ({ item, cartEnabled }: MenuCardProps) => {
  const c = useMenuCard(item, cartEnabled)

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-30px' }}
        className={`group relative flex h-full flex-col justify-center border-b border-border py-4 transition-colors hover:bg-surface/60 ${
          c.isOutOfStock ? 'opacity-55' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          {/* Sol: ad + açıklama */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="truncate font-display text-lg font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
                {c.name}
              </h3>
              {c.featured && (
                <span className="shrink-0 font-display text-[11px] font-bold uppercase tracking-wider text-primary">
                  ⭐ Önerilen
                </span>
              )}
              {c.isOutOfStock && (
                <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                  {c.outOfStockReason || 'Tükendi'}
                </span>
              )}
              {c.badges.length > 0 && !c.isOutOfStock && (
                <span className="flex flex-wrap gap-1">
                  {c.badges.map((b, i) => (
                    <span key={i} className={badgeClass(b)}>
                      {b}
                    </span>
                  ))}
                </span>
              )}
              {c.allergens.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    c.toggleAllergens()
                  }}
                  className="shrink-0 text-sm leading-none opacity-70 transition-opacity hover:opacity-100"
                  title="Alerjen bilgisi"
                >
                  ⚠️
                </button>
              )}
            </div>

            {c.description && (
              <p className="mt-1 truncate font-body text-sm text-foreground-muted">
                {c.description}
              </p>
            )}

            {(c.prepTime || c.calories) && (
              <p className="mt-1 flex items-center gap-3 text-[11px] text-foreground-subtle">
                {c.prepTime && <span>⏱️ {c.prepTime} dk</span>}
                {c.calories && <span>🔥 {c.calories} kcal</span>}
              </p>
            )}
          </div>

          {/* Sağ: fiyat + küçük sepet ikonu */}
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex flex-col items-end leading-none">
              <span className="text-[11px] text-foreground-subtle line-through">₺{c.strikePrice}</span>
              <span className="font-display text-xl font-extrabold text-primary">
                ₺{c.displayPrice}
              </span>
            </div>
            {c.cartEnabled && (
              <motion.button
                onClick={c.addToCart}
                disabled={c.isOutOfStock}
                whileHover={{ scale: c.isOutOfStock ? 1 : 1.1 }}
                whileTap={{ scale: c.isOutOfStock ? 1 : 0.9 }}
                aria-label="Sepete ekle"
                title="Sepete ekle"
                className={`relative flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold leading-none text-white shadow-sm transition-colors ${
                  c.isOutOfStock ? 'cursor-not-allowed bg-gray-300' : ''
                }`}
                style={c.isOutOfStock ? undefined : { background: 'rgb(var(--brand-500))' }}
              >
                {c.showAdded ? '✓' : '＋'}
              </motion.button>
            )}
          </div>
        </div>

        <AllergenPills show={c.showAllergens} allergens={c.allergens} />
      </motion.article>
      <UpsellModal card={c} />
    </>
  )
}
