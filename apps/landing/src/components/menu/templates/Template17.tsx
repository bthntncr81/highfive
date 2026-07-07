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

// Şablon 17 — "Fast-Food": enerjik, kalın, iştah açıcı. Büyük fiyat, köşeli rozetler,
// marka-renkli tam-genişlik "SEPETE EKLE" bandı, hover'da canlılaşan görsel.
// Genç/hızlı his. TÜM mantık useMenuCard'dan; burada SADECE sunum.
export const Template17 = ({ item, cartEnabled }: MenuCardProps) => {
  const c = useMenuCard(item, cartEnabled)
  const img = imageUrl(c.itemImage)

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        whileHover={{ y: -6 }}
        className={`group relative flex h-full flex-col overflow-hidden rounded-lg border-2 border-foreground/10 bg-surface shadow-[0_4px_0_0_rgb(var(--brand-500))] transition-shadow hover:shadow-[0_8px_0_0_rgb(var(--brand-500))] ${c.isOutOfStock ? 'opacity-60' : ''}`}
      >
        {c.hasRealImage && img ? (
          <div className="relative aspect-[16/10] overflow-hidden bg-foreground/5">
            <img
              src={img}
              alt={c.name}
              loading="lazy"
              className={`h-full w-full object-cover transition-transform duration-300 ${c.isOutOfStock ? 'grayscale' : 'group-hover:scale-110'}`}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />

            {c.isOutOfStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="-rotate-6 rounded bg-red-500 px-4 py-2 font-display text-sm uppercase tracking-wider text-white shadow-lg">
                  {c.outOfStockReason || 'Tükendi'}
                </div>
              </div>
            )}

            {/* Köşeli rozetler + Önerilen — sol üst */}
            <div className="absolute left-0 top-3 flex flex-col items-start gap-1.5">
              {c.featured && !c.isOutOfStock && (
                <span
                  className="px-3 py-1 text-xs font-black uppercase tracking-wide text-white shadow-md"
                  style={{ background: 'rgb(var(--brand-500))' }}
                >
                  ⭐ Önerilen
                </span>
              )}
              {!c.isOutOfStock &&
                c.badges.map((b, i) => (
                  <span key={i} className={`${badgeClass(b)} !rounded-none uppercase tracking-wide`}>
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
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded bg-orange-500 text-sm text-white shadow-lg hover:bg-orange-600"
                title="Alerjen bilgisi"
              >
                ⚠️
              </button>
            )}

            {/* Büyük fiyat — sağ alt, köşeli */}
            <div className="absolute bottom-2.5 right-2.5 flex items-end gap-1.5">
              {c.strikePrice && (
                <span className="mb-1 text-sm font-bold text-white/70 line-through">₺{c.strikePrice}</span>
              )}
              <span
                className="rounded px-3 py-1 font-display text-2xl font-black leading-none text-white shadow-lg"
                style={{ background: 'rgb(var(--brand-500))' }}
              >
                ₺{c.displayPrice}
              </span>
            </div>

            <AddedBurst show={c.showAdded} />
          </div>
        ) : (
          // Görselsiz varyant — fiyat öne çıkar
          <div className="relative border-b-2 border-foreground/10 bg-foreground/5 px-4 py-6">
            <div className="flex flex-col items-start gap-1.5">
              {c.featured && (
                <span
                  className="px-3 py-1 text-xs font-black uppercase tracking-wide text-white shadow-sm"
                  style={{ background: 'rgb(var(--brand-500))' }}
                >
                  ⭐ Önerilen
                </span>
              )}
              {c.badges.map((b, i) => (
                <span key={i} className={`${badgeClass(b)} !rounded-none uppercase tracking-wide`}>
                  {b}
                </span>
              ))}
            </div>
            <div className="mt-3 flex items-end gap-2">
              <span className="font-display text-4xl font-black leading-none text-primary">₺{c.displayPrice}</span>
              {c.strikePrice && (
                <span className="mb-1 text-base font-bold text-foreground-subtle line-through">₺{c.strikePrice}</span>
              )}
            </div>
            <AddedBurst show={c.showAdded} />
          </div>
        )}

        <div className="flex flex-1 flex-col p-4">
          <div className="mb-1 flex items-start justify-between gap-2">
            <h3 className="font-display text-lg font-black uppercase leading-tight tracking-tight text-foreground transition-colors group-hover:text-primary">
              {c.name}
            </h3>
            {c.prepTime && (
              <span className="mt-0.5 shrink-0 whitespace-nowrap text-xs font-bold text-foreground-subtle">
                ⏱️ {c.prepTime} dk
              </span>
            )}
          </div>

          <p className="mb-2 line-clamp-2 flex-1 font-body text-sm text-foreground-muted">{c.description}</p>

          {c.calories && <p className="mb-2 text-xs font-semibold text-foreground-subtle">🔥 {c.calories} kcal</p>}

          <AllergenPills show={c.showAllergens} allergens={c.allergens} />

          {c.cartEnabled && (
            <motion.button
              onClick={c.addToCart}
              disabled={c.isOutOfStock}
              whileTap={{ scale: c.isOutOfStock ? 1 : 0.97 }}
              className={`mt-auto flex w-full items-center justify-center gap-2 rounded font-display text-base font-black uppercase tracking-wide text-white shadow-md transition-transform ${
                c.isOutOfStock ? 'cursor-not-allowed bg-gray-400' : 'hover:brightness-110'
              }`}
              style={c.isOutOfStock ? undefined : { background: 'rgb(var(--brand-500))' }}
            >
              <span className="w-full py-3">{c.isOutOfStock ? '❌ Stokta Yok' : '🛒 Sepete Ekle'}</span>
            </motion.button>
          )}
        </div>
      </motion.article>

      <UpsellModal card={c} />
    </>
  )
}
