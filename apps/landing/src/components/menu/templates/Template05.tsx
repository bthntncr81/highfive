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

// Şablon 05 — "Bistro / Ticket": kağıt hissi, kesik-çizgi kenarlık, köşe delik efekti.
// Ad serif (font-display), fiyat sağda kutu içinde. Sıcak, el yapımı menü hissi.
// Görsel küçük yuvarlak solda (opsiyonel). TÜM mantık useMenuCard hook'undan gelir.
export const Template05 = ({ item, cartEnabled }: MenuCardProps) => {
  const c = useMenuCard(item, cartEnabled)
  const img = imageUrl(c.itemImage)

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        whileHover={{ y: -3, rotate: -0.3 }}
        className={`group relative flex h-full flex-col rounded-md border-2 border-dashed border-foreground/25 bg-[#fdfaf3] p-5 shadow-sm ${c.isOutOfStock ? 'opacity-60' : ''}`}
      >
        {/* Köşe delik efekti (bistro fişi hissi) */}
        <span className="pointer-events-none absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-surface ring-2 ring-foreground/15" />
        <span className="pointer-events-none absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-surface ring-2 ring-foreground/15" />

        {/* Üst şerit: görsel + ad/açıklama + fiyat kutusu */}
        <div className="flex items-start gap-4">
          {c.hasRealImage && img && (
            <div className="relative shrink-0">
              <div className={`h-16 w-16 overflow-hidden rounded-full border-2 border-foreground/20 ${c.isOutOfStock ? 'grayscale' : ''}`}>
                <img
                  src={img}
                  alt={c.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <AddedBurst show={c.showAdded} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <h3 className="truncate font-display text-lg leading-tight tracking-tight text-foreground">
                {c.name}
              </h3>
              {c.featured && (
                <span className="shrink-0 whitespace-nowrap text-[11px] font-semibold" style={{ color: 'rgb(var(--brand-500))' }}>
                  ⭐ Önerilen
                </span>
              )}
            </div>
            {/* Kesik menü satırı çizgisi */}
            <div className="mt-2 border-b border-dashed border-foreground/20" />
          </div>

          {/* Fiyat kutusu — sağda */}
          <div className="flex shrink-0 flex-col items-end">
            {c.strikePrice && (
              <span className="text-xs text-foreground-subtle line-through">₺{c.strikePrice}</span>
            )}
            <span
              className="mt-0.5 rounded-sm border-2 px-2.5 py-1 font-display text-lg leading-none"
              style={{ color: 'rgb(var(--brand-500))', borderColor: 'rgb(var(--brand-500))' }}
            >
              ₺{c.displayPrice}
            </span>
            {c.hasDiscount && (
              <span className="mt-1 text-[11px] font-semibold text-green-600">İndirimli</span>
            )}
          </div>
        </div>

        <p className="mt-2 line-clamp-2 font-body text-sm italic text-foreground-muted">
          {c.description}
        </p>

        {/* Meta + rozetler */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground-subtle">
          {c.prepTime && <span>⏱️ {c.prepTime} dk</span>}
          {c.calories && <span>🔥 {c.calories} kcal</span>}
          {c.badges.map((b, i) => (
            <span key={i} className={badgeClass(b)}>{b}</span>
          ))}
          {c.isOutOfStock && (
            <span className="rounded-sm bg-red-100 px-2 py-0.5 font-semibold text-red-700">
              {c.outOfStockReason || 'Tükendi'}
            </span>
          )}
        </div>

        <AllergenPills show={c.showAllergens} allergens={c.allergens} />

        {/* Alt aksiyon şeridi */}
        {(c.allergens.length > 0 || c.cartEnabled) && (
          <div className="mt-auto flex items-center gap-2 pt-3">
            {c.allergens.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); c.toggleAllergens() }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-orange-300 text-sm text-orange-600 transition-colors hover:bg-orange-50"
                title="Alerjen bilgisi"
              >
                ⚠️
              </button>
            )}
            {c.cartEnabled && (
              <motion.button
                onClick={c.addToCart}
                disabled={c.isOutOfStock}
                whileHover={{ scale: c.isOutOfStock ? 1 : 1.02 }}
                whileTap={{ scale: c.isOutOfStock ? 1 : 0.98 }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-sm border-2 border-dashed py-2 font-display text-sm tracking-wide transition-colors ${
                  c.isOutOfStock
                    ? 'cursor-not-allowed border-gray-300 text-gray-400'
                    : 'border-primary text-primary hover:bg-primary hover:text-white'
                }`}
              >
                {c.isOutOfStock ? <><span>❌</span> Stokta Yok</> : <><span>＋</span> Sepete Ekle</>}
              </motion.button>
            )}
          </div>
        )}
      </motion.article>
      <UpsellModal card={c} />
    </>
  )
}
