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

// Şablon 16 — "Geniş Izgara" (Dense 4-col): kompakt fotoğraf kartı. Üstte kare görsel
// (görselsizse renk bloğu + ad), altında ad + fiyat tek satır, minik ＋ buton. Çok sıkı,
// 4 sütuna uygun. TÜM mantık useMenuCard'dan gelir; burada SADECE sunum var.
export const Template16 = ({ item, cartEnabled }: MenuCardProps) => {
  const c = useMenuCard(item, cartEnabled)
  const img = imageUrl(c.itemImage)

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-30px' }}
        whileHover={{ y: -3 }}
        className={`group relative flex h-full flex-col overflow-hidden rounded-xl border border-border-light bg-white shadow-sm transition-shadow hover:shadow-md ${c.isOutOfStock ? 'opacity-60' : ''}`}
      >
        {/* Kare görsel / renk bloğu */}
        <div className="relative aspect-square overflow-hidden bg-surface">
          {c.hasRealImage && img ? (
            <img
              src={img}
              alt={c.name}
              loading="lazy"
              className={`h-full w-full object-cover transition-transform duration-500 ${c.isOutOfStock ? 'grayscale' : 'group-hover:scale-110'}`}
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center p-2 text-center"
              style={{ background: 'rgb(var(--brand-500) / 0.12)' }}
            >
              <span className="line-clamp-3 font-display text-sm leading-tight" style={{ color: 'rgb(var(--brand-500))' }}>
                {c.name}
              </span>
            </div>
          )}

          {c.featured && !c.isOutOfStock && (
            <span className="absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-display text-white shadow" style={{ background: 'rgb(var(--brand-500))' }}>
              ⭐
            </span>
          )}
          {c.badges.length > 0 && !c.isOutOfStock && !c.featured && (
            <span className={`absolute left-1.5 top-1.5 !px-1.5 !py-0.5 !text-[10px] ${badgeClass(c.badges[0])}`}>
              {c.badges[0]}
            </span>
          )}
          {c.allergens.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); c.toggleAllergens() }}
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500/90 text-[11px] text-white shadow hover:bg-orange-600"
              title="Alerjen bilgisi"
            >
              ⚠️
            </button>
          )}
          {c.isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-display text-white -rotate-12">
                {c.outOfStockReason || 'Tükendi'}
              </span>
            </div>
          )}
          <AddedBurst show={c.showAdded} />
        </div>

        {/* Alt: ad + fiyat tek satır */}
        <div className="flex flex-1 flex-col p-2.5">
          <h3 className="mb-1 truncate font-display text-sm text-foreground transition-colors group-hover:text-primary">
            {c.name}
          </h3>

          <AllergenPills show={c.showAllergens} allergens={c.allergens} />

          <div className="mt-auto flex items-center justify-between gap-1.5 pt-1">
            <div className="flex min-w-0 flex-col leading-none">
              <span className="font-display text-base" style={{ color: 'rgb(var(--brand-500))' }}>₺{c.displayPrice}</span>
              <span className="text-[11px] text-foreground-subtle line-through">₺{c.strikePrice}</span>
            </div>
            {c.cartEnabled && (
              <motion.button
                onClick={c.addToCart}
                disabled={c.isOutOfStock}
                whileHover={{ scale: c.isOutOfStock ? 1 : 1.1 }}
                whileTap={{ scale: c.isOutOfStock ? 1 : 0.9 }}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg font-display text-white shadow-sm ${c.isOutOfStock ? 'cursor-not-allowed bg-gray-300' : ''}`}
                style={c.isOutOfStock ? undefined : { background: 'rgb(var(--brand-500))' }}
                title={c.isOutOfStock ? 'Stokta yok' : 'Sepete ekle'}
              >
                {c.isOutOfStock ? '✕' : '＋'}
              </motion.button>
            )}
          </div>
        </div>
      </motion.article>
      <UpsellModal card={c} />
    </>
  )
}
