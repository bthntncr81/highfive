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

// Şablon 01 — "Klasik Kart": görsel üstte, yuvarlak köşe, fiyat rozeti, sepet butonu.
// Diğer 19 şablon için referans desen. TÜM mantık useMenuCard hook'undan gelir;
// burada SADECE sunum var.
export const Template01 = ({ item, cartEnabled }: MenuCardProps) => {
  const c = useMenuCard(item, cartEnabled)
  const img = imageUrl(c.itemImage)

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        whileHover={{ y: -4 }}
        className={`card-menu group relative flex flex-col ${c.isOutOfStock ? 'opacity-60' : ''}`}
      >
        {c.hasRealImage && img ? (
          <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-4 bg-surface">
            <img
              src={img}
              alt={c.name}
              loading="lazy"
              className={`w-full h-full object-cover transition-transform duration-500 ${c.isOutOfStock ? 'grayscale' : 'group-hover:scale-110'}`}
            />
            {c.isOutOfStock && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="bg-red-500 text-white px-4 py-2 rounded-full font-display text-sm -rotate-12">
                  {c.outOfStockReason || 'Tükendi'}
                </div>
              </div>
            )}
            {c.featured && !c.isOutOfStock && (
              <span className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-display shadow-lg">⭐ Önerilen</span>
            )}
            {c.badges.length > 0 && !c.isOutOfStock && !c.featured && (
              <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                {c.badges.map((b, i) => (
                  <span key={i} className={badgeClass(b)}>{b}</span>
                ))}
              </div>
            )}
            {c.allergens.length > 0 && (
              <button onClick={(e) => { e.stopPropagation(); c.toggleAllergens() }} className="absolute top-3 right-3 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm shadow-lg hover:bg-orange-600" title="Alerjen bilgisi">⚠️</button>
            )}
            <div className="absolute bottom-3 right-3 flex flex-col items-end">
              <span className="text-sm line-through text-white/80 bg-black/30 px-2 rounded">₺{c.strikePrice}</span>
              <span className="bg-green-500 text-white font-display text-xl px-3 py-1 rounded-full shadow-md">₺{c.displayPrice}</span>
            </div>
            <AddedBurst show={c.showAdded} />
          </div>
        ) : (
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm line-through text-foreground-subtle">₺{c.strikePrice}</span>
              <span className="bg-green-500 text-white font-display text-lg px-3 py-1 rounded-full shadow-md">₺{c.displayPrice}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col flex-1">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-display text-xl text-foreground group-hover:text-primary transition-colors">{c.name}</h3>
            {c.prepTime && <span className="text-xs text-foreground-subtle flex items-center gap-1">⏱️ {c.prepTime} dk</span>}
          </div>
          <p className="font-body text-foreground-muted text-sm flex-1 mb-2 line-clamp-2">{c.description}</p>
          {c.calories && <p className="text-xs text-foreground-subtle mb-2">🔥 {c.calories} kcal</p>}
          <AllergenPills show={c.showAllergens} allergens={c.allergens} />
          {c.cartEnabled && (
            <motion.button
              onClick={c.addToCart}
              disabled={c.isOutOfStock}
              whileHover={{ scale: c.isOutOfStock ? 1 : 1.02 }}
              whileTap={{ scale: c.isOutOfStock ? 1 : 0.98 }}
              className={`btn-secondary w-full justify-center text-base mt-auto ${c.isOutOfStock ? 'opacity-50 cursor-not-allowed bg-gray-300' : ''}`}
            >
              {c.isOutOfStock ? <><span>❌</span> Stokta Yok</> : <><span>🛒</span> Sepete Ekle</>}
            </motion.button>
          )}
        </div>
      </motion.article>
      <UpsellModal card={c} />
    </>
  )
}
