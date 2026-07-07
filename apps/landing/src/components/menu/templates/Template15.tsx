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

// Şablon 15 — "Kabarcık" (Bubble): aşırı yuvarlak (rounded-3xl), yumuşak pastel gölge,
// üstte yuvarlak görsel, altta büyük hap "Sepete Ekle" butonu marka renginde. Sevimli,
// mobil-dostu. TÜM mantık useMenuCard'dan gelir; burada SADECE sunum var.
export const Template15 = ({ item, cartEnabled }: MenuCardProps) => {
  const c = useMenuCard(item, cartEnabled)
  const img = imageUrl(c.itemImage)

  return (
    <>
      <motion.article
        initial={{ opacity: 0, scale: 0.94 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-40px' }}
        whileHover={{ y: -5 }}
        className={`group relative flex h-full flex-col items-center rounded-3xl bg-white p-5 text-center shadow-[0_10px_40px_-15px_rgba(0,0,0,0.15)] transition-shadow hover:shadow-[0_18px_50px_-15px_rgba(0,0,0,0.22)] ${c.isOutOfStock ? 'opacity-60' : ''}`}
      >
        {/* Yuvarlak görsel / görselsiz baş-harf dairesi */}
        <div className="relative mb-4">
          <div
            className="relative h-28 w-28 overflow-hidden rounded-full ring-4"
            style={{ '--tw-ring-color': 'rgb(var(--brand-500) / 0.15)' } as React.CSSProperties}
          >
            {c.hasRealImage && img ? (
              <img
                src={img}
                alt={c.name}
                loading="lazy"
                className={`h-full w-full object-cover transition-transform duration-500 ${c.isOutOfStock ? 'grayscale' : 'group-hover:scale-110'}`}
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{ background: 'rgb(var(--brand-500) / 0.12)' }}
              >
                <span className="font-display text-2xl" style={{ color: 'rgb(var(--brand-500))' }}>
                  ₺{c.displayPrice}
                </span>
              </div>
            )}
            {c.isOutOfStock && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                <span className="px-2 text-center text-[11px] font-display text-white">
                  {c.outOfStockReason || 'Tükendi'}
                </span>
              </div>
            )}
            <AddedBurst show={c.showAdded} />
          </div>

          {c.featured && !c.isOutOfStock && (
            <span className="absolute -right-1 -top-1 rounded-full px-2 py-0.5 text-xs font-display text-white shadow-md" style={{ background: 'rgb(var(--brand-500))' }}>
              ⭐
            </span>
          )}
          {c.allergens.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); c.toggleAllergens() }}
              className="absolute -left-1 bottom-0 flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-xs text-white shadow-md hover:bg-orange-600"
              title="Alerjen bilgisi"
            >
              ⚠️
            </button>
          )}
        </div>

        <h3 className="mb-1 font-display text-lg text-foreground transition-colors group-hover:text-primary">{c.name}</h3>
        <p className="mb-3 line-clamp-2 flex-1 font-body text-sm text-foreground-muted">{c.description}</p>

        {c.badges.length > 0 && !c.isOutOfStock && (
          <div className="mb-3 flex flex-wrap justify-center gap-1.5">
            {c.badges.map((b, i) => (
              <span key={i} className={badgeClass(b)}>{b}</span>
            ))}
          </div>
        )}

        <div className="w-full">
          <AllergenPills show={c.showAllergens} allergens={c.allergens} />
        </div>

        <div className="mb-3 flex items-baseline justify-center gap-2">
          <span className="font-display text-2xl" style={{ color: 'rgb(var(--brand-500))' }}>₺{c.displayPrice}</span>
          <span className="text-sm text-foreground-subtle line-through">₺{c.strikePrice}</span>
        </div>

        {c.cartEnabled && (
          <motion.button
            onClick={c.addToCart}
            disabled={c.isOutOfStock}
            whileHover={{ scale: c.isOutOfStock ? 1 : 1.03 }}
            whileTap={{ scale: c.isOutOfStock ? 1 : 0.97 }}
            className={`mt-auto w-full rounded-full py-3 font-display text-base text-white shadow-md transition-opacity ${c.isOutOfStock ? 'cursor-not-allowed bg-gray-300' : ''}`}
            style={c.isOutOfStock ? undefined : { background: 'rgb(var(--brand-500))' }}
          >
            {c.isOutOfStock ? '❌ Stokta Yok' : '🛒 Sepete Ekle'}
          </motion.button>
        )}
      </motion.article>
      <UpsellModal card={c} />
    </>
  )
}
