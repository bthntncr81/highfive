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

// Şablon 14 — "Yan Görsel" (Horizontal): yatay kart. Solda kare görsel (görselsizse
// marka-renkli baş-harf bloğu), sağda ad + açıklama + fiyat + sepet butonu. Liste hissi
// ama zengin. TÜM mantık useMenuCard'dan gelir; burada SADECE sunum var.
export const Template14 = ({ item, cartEnabled }: MenuCardProps) => {
  const c = useMenuCard(item, cartEnabled)
  const img = imageUrl(c.itemImage)

  return (
    <>
      <motion.article
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        whileHover={{ y: -3 }}
        className={`group relative h-full flex flex-row overflow-hidden rounded-2xl border border-border-light bg-white shadow-sm transition-shadow hover:shadow-lg ${c.isOutOfStock ? 'opacity-60' : ''}`}
      >
        {/* Sol: görsel veya baş-harf bloğu */}
        <div className="relative w-28 sm:w-36 shrink-0 overflow-hidden bg-surface">
          {c.hasRealImage && img ? (
            <img
              src={img}
              alt={c.name}
              loading="lazy"
              className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 ${c.isOutOfStock ? 'grayscale' : 'group-hover:scale-105'}`}
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'rgb(var(--brand-500) / 0.12)' }}
            >
              <span className="font-display text-5xl select-none" style={{ color: 'rgb(var(--brand-500))' }}>
                {c.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {c.featured && !c.isOutOfStock && (
            <span className="absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-display text-white shadow-md" style={{ background: 'rgb(var(--brand-500))' }}>
              ⭐ Önerilen
            </span>
          )}
          {c.isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-display text-white -rotate-12">
                {c.outOfStockReason || 'Tükendi'}
              </span>
            </div>
          )}
          <AddedBurst show={c.showAdded} />
        </div>

        {/* Sağ: içerik */}
        <div className="flex min-w-0 flex-1 flex-col p-4">
          <div className="mb-1 flex items-start justify-between gap-2">
            <h3 className="min-w-0 truncate font-display text-lg text-foreground transition-colors group-hover:text-primary">
              {c.name}
            </h3>
            {c.allergens.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); c.toggleAllergens() }}
                className="shrink-0 rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-700 hover:bg-orange-200"
                title="Alerjen bilgisi"
              >
                ⚠️
              </button>
            )}
          </div>

          <p className="mb-2 line-clamp-2 flex-1 font-body text-sm text-foreground-muted">{c.description}</p>

          {c.badges.length > 0 && !c.isOutOfStock && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {c.badges.map((b, i) => (
                <span key={i} className={badgeClass(b)}>{b}</span>
              ))}
            </div>
          )}

          <AllergenPills show={c.showAllergens} allergens={c.allergens} />

          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-xl" style={{ color: 'rgb(var(--brand-500))' }}>₺{c.displayPrice}</span>
              <span className="text-sm text-foreground-subtle line-through">₺{c.strikePrice}</span>
            </div>
            {c.cartEnabled && (
              <motion.button
                onClick={c.addToCart}
                disabled={c.isOutOfStock}
                whileHover={{ scale: c.isOutOfStock ? 1 : 1.05 }}
                whileTap={{ scale: c.isOutOfStock ? 1 : 0.95 }}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-display text-white shadow-sm transition-opacity ${c.isOutOfStock ? 'cursor-not-allowed bg-gray-300' : ''}`}
                style={c.isOutOfStock ? undefined : { background: 'rgb(var(--brand-500))' }}
              >
                {c.isOutOfStock ? 'Stokta Yok' : '＋ Ekle'}
              </motion.button>
            )}
          </div>
        </div>
      </motion.article>
      <UpsellModal card={c} />
    </>
  )
}
