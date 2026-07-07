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

// Şablon 04 — "Izgara Fotoğraf": görsel-baskın. Görsel tüm kartı kaplar, altta
// koyu gradient üzerine ad + fiyat overlay. Hover'da hafif zoom. Görselsizse marka
// rengi dolgulu blok + ad ortada. Sağ altta küçük ＋ buton. Mantık useMenuCard'dan.
export const Template04 = ({ item, cartEnabled }: MenuCardProps) => {
  const c = useMenuCard(item, cartEnabled)
  const img = imageUrl(c.itemImage)
  const hasImg = c.hasRealImage && !!img

  return (
    <>
      <motion.article
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-40px' }}
        className={`group relative flex h-full min-h-[280px] flex-col overflow-hidden rounded-2xl shadow-md transition-shadow duration-300 hover:shadow-xl ${
          c.isOutOfStock ? 'opacity-70' : ''
        }`}
      >
        {/* Arka plan: görsel veya marka rengi dolgusu */}
        {hasImg ? (
          <img
            src={img as string}
            alt={c.name}
            loading="lazy"
            className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 ${
              c.isOutOfStock ? 'grayscale' : 'group-hover:scale-110'
            }`}
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center px-5 text-center"
            style={{ background: 'rgb(var(--brand-500))' }}
          >
            <h3 className="font-display text-2xl font-extrabold leading-tight text-white">
              {c.name}
            </h3>
          </div>
        )}

        {/* Alt gradient — okunabilirlik için (yalnızca görselli) */}
        {hasImg && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
        )}

        {/* Stokta yok bandı */}
        {c.isOutOfStock && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
            <span className="-rotate-6 rounded-full bg-red-500 px-4 py-2 font-display text-sm text-white shadow-lg">
              {c.outOfStockReason || 'Tükendi'}
            </span>
          </div>
        )}

        {/* Üst rozetler */}
        <div className="relative z-10 flex items-start justify-between p-3">
          <div className="flex flex-wrap gap-2">
            {c.featured && !c.isOutOfStock && (
              <span className="rounded-full bg-white/95 px-2.5 py-1 font-display text-[11px] font-bold uppercase tracking-wider text-primary shadow-sm">
                ⭐ Önerilen
              </span>
            )}
            {c.badges.length > 0 &&
              !c.isOutOfStock &&
              !c.featured &&
              c.badges.map((b, i) => (
                <span key={i} className={badgeClass(b)}>
                  {b}
                </span>
              ))}
          </div>
          {c.allergens.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                c.toggleAllergens()
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sm shadow-sm transition-colors hover:bg-white"
              title="Alerjen bilgisi"
            >
              ⚠️
            </button>
          )}
        </div>

        {/* Alt overlay: ad + fiyat + ＋ buton */}
        <div className="relative z-10 mt-auto p-4">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              {hasImg && (
                <h3 className="mb-0.5 truncate font-display text-xl font-extrabold leading-tight text-white drop-shadow">
                  {c.name}
                </h3>
              )}
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-xs line-through ${hasImg ? 'text-white/70' : 'text-white/80'}`}
                >
                  ₺{c.strikePrice}
                </span>
                <span className="font-display text-2xl font-extrabold text-white drop-shadow">
                  ₺{c.displayPrice}
                </span>
              </div>
              {(c.prepTime || c.calories) && (
                <p className="mt-0.5 flex items-center gap-2 text-[11px] text-white/70">
                  {c.prepTime && <span>⏱️ {c.prepTime} dk</span>}
                  {c.calories && <span>🔥 {c.calories} kcal</span>}
                </p>
              )}
            </div>
            {c.cartEnabled && (
              <motion.button
                onClick={c.addToCart}
                disabled={c.isOutOfStock}
                whileHover={{ scale: c.isOutOfStock ? 1 : 1.1 }}
                whileTap={{ scale: c.isOutOfStock ? 1 : 0.9 }}
                aria-label="Sepete ekle"
                title="Sepete ekle"
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl font-bold leading-none text-primary shadow-lg transition-transform ${
                  c.isOutOfStock ? 'cursor-not-allowed bg-gray-300 text-white' : 'bg-white'
                }`}
              >
                {c.showAdded ? '✓' : '＋'}
              </motion.button>
            )}
          </div>

          {/* Alerjen açılır liste — okunabilir koyu zemin */}
          {c.showAllergens && (
            <div className="mt-2 rounded-lg bg-white/95 p-1">
              <AllergenPills show={c.showAllergens} allergens={c.allergens} />
            </div>
          )}
        </div>

        <AddedBurst show={c.showAdded} />
      </motion.article>
      <UpsellModal card={c} />
    </>
  )
}
