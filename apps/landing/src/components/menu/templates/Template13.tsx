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

// Şablon 13 — "Cam" (Glassmorphism): yarı saydam bulanık kart, ince beyaz kenar,
// yumuşak gölge. Görsel üstte yuvarlak, fiyat cam hap. Koyu/renkli arkaplanda güzel
// durur. TÜM mantık useMenuCard'dan gelir; burada sadece sunum.
export const Template13 = ({ item, cartEnabled }: MenuCardProps) => {
  const c = useMenuCard(item, cartEnabled)
  const img = imageUrl(c.itemImage)

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        whileHover={{ y: -5 }}
        className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/25 bg-white/10 p-5 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.35)] backdrop-blur-xl ${c.isOutOfStock ? 'opacity-60' : ''}`}
        style={{ WebkitBackdropFilter: 'blur(20px)' }}
      >
        {/* Yumuşak marka renkli parıltı */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-30 blur-2xl"
          style={{ background: 'rgb(var(--brand-500))' }}
        />

        <div className="relative z-[1] flex flex-1 flex-col">
          {/* Görsel: yuvarlak, üstte ortalı */}
          <div className="relative mx-auto mb-4 aspect-square w-28">
            <div className="h-full w-full overflow-hidden rounded-full border border-white/40 shadow-lg">
              {c.hasRealImage && img ? (
                <img
                  src={img}
                  alt={c.name}
                  loading="lazy"
                  className={`h-full w-full object-cover transition-transform duration-500 ${c.isOutOfStock ? 'grayscale' : 'group-hover:scale-110'}`}
                />
              ) : (
                <div
                  className="flex h-full w-full flex-col items-center justify-center text-white"
                  style={{ background: 'rgb(var(--brand-500) / 0.85)' }}
                >
                  <span className="font-display text-xl leading-none">₺{c.displayPrice}</span>
                </div>
              )}
              <AddedBurst show={c.showAdded} />
            </div>

            {c.allergens.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); c.toggleAllergens() }}
                className="absolute -right-1 top-0 flex h-7 w-7 items-center justify-center rounded-full border border-white/40 bg-orange-500/90 text-xs text-white shadow backdrop-blur hover:bg-orange-600"
                title="Alerjen bilgisi"
              >
                ⚠️
              </button>
            )}
          </div>

          {/* Rozetler / önerilen */}
          <div className="mb-2 flex flex-wrap items-center justify-center gap-1">
            {c.featured && (
              <span className="rounded-full border border-white/40 bg-white/20 px-2 py-0.5 text-[11px] font-display text-yellow-200 backdrop-blur">
                ⭐ Önerilen
              </span>
            )}
            {c.badges.map((b, i) => (
              <span key={i} className={badgeClass(b)}>{b}</span>
            ))}
          </div>

          <h3 className="text-center font-display text-lg text-white drop-shadow-sm">{c.name}</h3>
          <p className="mt-1 line-clamp-2 flex-1 text-center font-body text-sm text-white/80">{c.description}</p>

          <div className="mt-2 flex items-center justify-center gap-3 text-[11px] text-white/70">
            {c.prepTime && <span>⏱️ {c.prepTime} dk</span>}
            {c.calories && <span>🔥 {c.calories} kcal</span>}
          </div>

          {/* Fiyat cam hap */}
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="text-xs text-white/60 line-through">₺{c.strikePrice}</span>
            <span
              className="rounded-full border border-white/40 px-4 py-1.5 font-display text-lg text-white shadow-lg backdrop-blur"
              style={{ background: 'rgb(var(--brand-500) / 0.55)' }}
            >
              ₺{c.displayPrice}
            </span>
          </div>

          <AllergenPills show={c.showAllergens} allergens={c.allergens} />

          {c.isOutOfStock && (
            <p className="mt-3 text-center text-xs font-display text-red-200">
              {c.outOfStockReason || 'Tükendi'}
            </p>
          )}

          {c.cartEnabled && (
            <motion.button
              onClick={c.addToCart}
              disabled={c.isOutOfStock}
              whileHover={{ scale: c.isOutOfStock ? 1 : 1.02 }}
              whileTap={{ scale: c.isOutOfStock ? 1 : 0.98 }}
              className={`mt-4 w-full justify-center rounded-full border border-white/40 bg-white/20 py-2.5 font-display text-sm text-white shadow-lg backdrop-blur transition-colors hover:bg-white/30 ${c.isOutOfStock ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              {c.isOutOfStock ? '❌ Stokta Yok' : '🛒 Sepete Ekle'}
            </motion.button>
          )}
        </div>
      </motion.article>
      <UpsellModal card={c} />
    </>
  )
}
