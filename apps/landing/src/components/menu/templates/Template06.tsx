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

// Şablon 06 — "Modern Bold": keskin köşe, çok kalın büyük başlık, yüksek kontrast,
// marka rengi blok vurgular, fiyat dev punto. Görsel üstte tam genişlik,
// sepet butonu tam genişlik keskin. TÜM mantık useMenuCard hook'undan gelir.
export const Template06 = ({ item, cartEnabled }: MenuCardProps) => {
  const c = useMenuCard(item, cartEnabled)
  const img = imageUrl(c.itemImage)

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        whileHover={{ y: -4 }}
        className={`group relative flex h-full flex-col overflow-hidden rounded-sm border-2 border-foreground bg-surface ${c.isOutOfStock ? 'opacity-60' : ''}`}
      >
        {/* Görsel — üstte tam genişlik (opsiyonel) */}
        {c.hasRealImage && img ? (
          <div className="relative aspect-[16/10] overflow-hidden bg-foreground/5">
            <img
              src={img}
              alt={c.name}
              loading="lazy"
              className={`h-full w-full object-cover transition-transform duration-500 ${c.isOutOfStock ? 'grayscale' : 'group-hover:scale-105'}`}
            />
            {c.featured && !c.isOutOfStock && (
              <span
                className="absolute left-0 top-3 px-3 py-1 text-xs font-black uppercase tracking-widest text-white"
                style={{ background: 'rgb(var(--brand-500))' }}
              >
                ⭐ Önerilen
              </span>
            )}
            {c.isOutOfStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                <span className="border-2 border-white px-4 py-1.5 text-sm font-black uppercase tracking-widest text-white">
                  {c.outOfStockReason || 'Tükendi'}
                </span>
              </div>
            )}
            {c.allergens.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); c.toggleAllergens() }}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-sm bg-white/90 text-sm shadow hover:bg-white"
                title="Alerjen bilgisi"
              >
                ⚠️
              </button>
            )}
            <AddedBurst show={c.showAdded} />
          </div>
        ) : (
          // Görselsiz zarif varyant — marka rengi blok, fiyat öne çıkar
          <div className="relative flex items-center justify-between px-5 py-4 text-white" style={{ background: 'rgb(var(--brand-500))' }}>
            {c.featured && (
              <span className="text-xs font-black uppercase tracking-widest">⭐ Önerilen</span>
            )}
            <span className="ml-auto font-display text-3xl font-black leading-none">₺{c.displayPrice}</span>
            {c.isOutOfStock && (
              <span className="absolute right-3 top-2 rounded-sm bg-black/40 px-2 py-0.5 text-[11px] font-bold uppercase">
                {c.outOfStockReason || 'Tükendi'}
              </span>
            )}
            <AddedBurst show={c.showAdded} />
          </div>
        )}

        {/* Gövde */}
        <div className="flex flex-1 flex-col p-5">
          {/* Başlık — çok kalın, dev */}
          <h3 className="font-display text-2xl font-black uppercase leading-none tracking-tight text-foreground">
            {c.name}
          </h3>

          {/* Fiyat — dev punto blok (yalnızca görselli varyantta üstte tekrar) */}
          {c.hasRealImage && img && (
            <div className="mt-3 flex items-end gap-2">
              <span className="font-display text-4xl font-black leading-none" style={{ color: 'rgb(var(--brand-500))' }}>
                ₺{c.displayPrice}
              </span>
              {c.strikePrice && (
                <span className="pb-1 text-base text-foreground-subtle line-through">₺{c.strikePrice}</span>
              )}
              {c.hasDiscount && (
                <span className="mb-1 ml-auto bg-green-500 px-2 py-0.5 text-xs font-black uppercase text-white">İndirim</span>
              )}
            </div>
          )}

          <p className="mt-3 line-clamp-2 font-body text-sm text-foreground-muted">{c.description}</p>

          {/* Meta + rozetler — blok stil */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {c.prepTime && (
              <span className="border border-foreground/30 px-2 py-0.5 text-xs font-bold uppercase text-foreground-muted">
                ⏱️ {c.prepTime} dk
              </span>
            )}
            {c.calories && (
              <span className="border border-foreground/30 px-2 py-0.5 text-xs font-bold uppercase text-foreground-muted">
                🔥 {c.calories} kcal
              </span>
            )}
            {c.badges.map((b, i) => (
              <span key={i} className={badgeClass(b)}>{b}</span>
            ))}
          </div>

          <AllergenPills show={c.showAllergens} allergens={c.allergens} />

          {/* Sepet butonu — tam genişlik keskin */}
          {c.cartEnabled && (
            <motion.button
              onClick={c.addToCart}
              disabled={c.isOutOfStock}
              whileHover={{ scale: c.isOutOfStock ? 1 : 1.01 }}
              whileTap={{ scale: c.isOutOfStock ? 1 : 0.98 }}
              className={`mt-auto w-full py-3 font-display text-base font-black uppercase tracking-widest text-white transition-opacity ${
                c.isOutOfStock ? 'cursor-not-allowed bg-gray-400' : 'hover:opacity-90'
              }`}
              style={c.isOutOfStock ? undefined : { background: 'rgb(var(--brand-500))' }}
            >
              {c.isOutOfStock ? 'Stokta Yok' : 'Sepete Ekle ＋'}
            </motion.button>
          )}
        </div>
      </motion.article>
      <UpsellModal card={c} />
    </>
  )
}
