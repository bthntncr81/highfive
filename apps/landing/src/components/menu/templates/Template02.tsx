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

// Şablon 02 — "Dergi": editöryel büyük kart. Geniş görsel üstte, kalın display
// başlık, uzun açıklama, ince ayraç çizgisi ve alt barda fiyat solda / sepet sağda.
// Bol beyaz boşluk. TÜM mantık useMenuCard'dan gelir; burada SADECE sunum var.
export const Template02 = ({ item, cartEnabled }: MenuCardProps) => {
  const c = useMenuCard(item, cartEnabled)
  const img = imageUrl(c.itemImage)

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-sm transition-shadow duration-300 hover:shadow-lg ${
          c.isOutOfStock ? 'opacity-60' : ''
        }`}
      >
        {/* Görsel — geniş editöryel üst blok */}
        {c.hasRealImage && img ? (
          <div className="relative aspect-[16/10] overflow-hidden bg-surface">
            <img
              src={img}
              alt={c.name}
              loading="lazy"
              className={`h-full w-full object-cover transition-transform duration-700 ${
                c.isOutOfStock ? 'grayscale' : 'group-hover:scale-105'
              }`}
            />
            {c.isOutOfStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <span className="-rotate-6 rounded-full bg-red-500 px-4 py-2 font-display text-sm text-white shadow-lg">
                  {c.outOfStockReason || 'Tükendi'}
                </span>
              </div>
            )}
            {c.featured && !c.isOutOfStock && (
              <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 font-display text-xs font-bold uppercase tracking-widest text-primary shadow-md">
                ⭐ Önerilen
              </span>
            )}
            {c.badges.length > 0 && !c.isOutOfStock && !c.featured && (
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                {c.badges.map((b, i) => (
                  <span key={i} className={badgeClass(b)}>
                    {b}
                  </span>
                ))}
              </div>
            )}
            {c.allergens.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  c.toggleAllergens()
                }}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-sm shadow-md transition-colors hover:bg-white"
                title="Alerjen bilgisi"
              >
                ⚠️
              </button>
            )}
            <AddedBurst show={c.showAdded} />
          </div>
        ) : (
          // Görselsiz: büyük tipografik blok, fiyat öne çıkar
          <div className="relative flex flex-col justify-center px-6 pt-8 pb-2">
            {c.featured && (
              <span className="mb-2 font-display text-xs font-bold uppercase tracking-widest text-primary">
                ⭐ Önerilen
              </span>
            )}
            <span className="font-display text-5xl font-extrabold leading-none text-foreground">
              ₺{c.displayPrice}
            </span>
            <AddedBurst show={c.showAdded} />
          </div>
        )}

        {/* İçerik */}
        <div className="flex flex-1 flex-col px-6 pt-5">
          <div className="mb-2 flex items-start justify-between gap-3">
            <h3 className="font-display text-2xl font-extrabold leading-tight text-foreground transition-colors group-hover:text-primary">
              {c.name}
            </h3>
            {c.prepTime && (
              <span className="mt-1 shrink-0 text-xs text-foreground-subtle">⏱️ {c.prepTime} dk</span>
            )}
          </div>

          <p className="mb-4 line-clamp-3 font-body text-sm leading-relaxed text-foreground-muted">
            {c.description}
          </p>

          {c.calories && (
            <p className="mb-3 text-xs text-foreground-subtle">🔥 {c.calories} kcal</p>
          )}

          <AllergenPills show={c.showAllergens} allergens={c.allergens} />

          {/* İnce ayraç */}
          <div className="mt-auto border-t border-border-light pt-4 pb-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col leading-none">
                <span className="text-xs text-foreground-subtle line-through">₺{c.strikePrice}</span>
                <span className="font-display text-2xl font-extrabold text-primary">
                  ₺{c.displayPrice}
                </span>
              </div>
              {c.cartEnabled && (
                <motion.button
                  onClick={c.addToCart}
                  disabled={c.isOutOfStock}
                  whileHover={{ scale: c.isOutOfStock ? 1 : 1.03 }}
                  whileTap={{ scale: c.isOutOfStock ? 1 : 0.97 }}
                  className={`rounded-full px-5 py-2.5 font-display text-sm font-bold text-white shadow-md transition-colors ${
                    c.isOutOfStock ? 'cursor-not-allowed bg-gray-300' : ''
                  }`}
                  style={c.isOutOfStock ? undefined : { background: 'rgb(var(--brand-500))' }}
                >
                  {c.isOutOfStock ? 'Stokta Yok' : 'Sepete Ekle'}
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </motion.article>
      <UpsellModal card={c} />
    </>
  )
}
