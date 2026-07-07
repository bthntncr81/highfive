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

// Şablon 07 — "Kompakt": yoğun; solda küçük kare thumbnail (görsel varsa),
// sağda ad+fiyat+mini açıklama, altında ince ＋ buton. Az yer kaplar, çok ürün sığar.
// Görselsizse baş harf avatarı. TÜM mantık useMenuCard hook'undan gelir.
export const Template07 = ({ item, cartEnabled }: MenuCardProps) => {
  const c = useMenuCard(item, cartEnabled)
  const img = imageUrl(c.itemImage)

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-30px' }}
        className={`group relative flex h-full flex-col rounded-lg border border-border bg-surface p-3 transition-shadow hover:shadow-md ${c.isOutOfStock ? 'opacity-60' : ''}`}
      >
        <div className="flex gap-3">
          {/* Sol: kare thumbnail veya baş harf avatarı */}
          <div className="relative shrink-0">
            {c.hasRealImage && img ? (
              <div className="h-14 w-14 overflow-hidden rounded-md bg-foreground/5">
                <img
                  src={img}
                  alt={c.name}
                  loading="lazy"
                  className={`h-full w-full object-cover transition-transform duration-500 ${c.isOutOfStock ? 'grayscale' : 'group-hover:scale-110'}`}
                />
              </div>
            ) : (
              <div
                className="flex h-14 w-14 items-center justify-center rounded-md font-display text-xl font-bold text-white"
                style={{ background: 'rgb(var(--brand-500))' }}
              >
                {c.name.charAt(0).toUpperCase()}
              </div>
            )}
            {c.featured && (
              <span className="absolute -right-1 -top-1 text-sm" title="Önerilen">⭐</span>
            )}
            <AddedBurst show={c.showAdded} />
          </div>

          {/* Sağ: ad + fiyat + mini açıklama */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate font-display text-sm leading-tight text-foreground">{c.name}</h3>
              <div className="flex shrink-0 flex-col items-end leading-none">
                <span className="font-display text-sm font-bold" style={{ color: 'rgb(var(--brand-500))' }}>
                  ₺{c.displayPrice}
                </span>
                {c.strikePrice && (
                  <span className="text-[10px] text-foreground-subtle line-through">₺{c.strikePrice}</span>
                )}
              </div>
            </div>

            <p className="mt-0.5 line-clamp-1 font-body text-xs text-foreground-muted">{c.description}</p>

            {/* Mini meta + rozetler */}
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-foreground-subtle">
              {c.prepTime && <span>⏱️ {c.prepTime} dk</span>}
              {c.calories && <span>🔥 {c.calories} kcal</span>}
              {c.badges.map((b, i) => (
                <span key={i} className={badgeClass(b)}>{b}</span>
              ))}
              {c.isOutOfStock && (
                <span className="rounded bg-red-100 px-1.5 py-0.5 font-semibold text-red-700">
                  {c.outOfStockReason || 'Tükendi'}
                </span>
              )}
            </div>
          </div>
        </div>

        <AllergenPills show={c.showAllergens} allergens={c.allergens} />

        {/* Alt: ince aksiyon şeridi */}
        {(c.allergens.length > 0 || c.cartEnabled) && (
          <div className="mt-auto flex items-center gap-2 pt-2">
            {c.allergens.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); c.toggleAllergens() }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-orange-300 text-xs text-orange-600 transition-colors hover:bg-orange-50"
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
                whileTap={{ scale: c.isOutOfStock ? 1 : 0.97 }}
                className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                  c.isOutOfStock
                    ? 'cursor-not-allowed bg-gray-200 text-gray-400'
                    : 'text-white hover:opacity-90'
                }`}
                style={c.isOutOfStock ? undefined : { background: 'rgb(var(--brand-500))' }}
              >
                {c.isOutOfStock ? 'Stokta Yok' : <><span className="text-sm leading-none">＋</span> Sepete Ekle</>}
              </motion.button>
            )}
          </div>
        )}
      </motion.article>
      <UpsellModal card={c} />
    </>
  )
}
