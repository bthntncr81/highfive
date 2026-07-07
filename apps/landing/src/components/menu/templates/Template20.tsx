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

// Şablon 20 — "Tam Görsel": kart tümüyle görsel; altta güçlü gradient üstüne
// ad + açıklama + fiyat. Görünür "Sepete Ekle" butonu altta. Görselsizse marka
// renk gradyan dolgu + büyük ad. TÜM mantık useMenuCard hook'undan gelir.
export const Template20 = ({ item, cartEnabled }: MenuCardProps) => {
  const c = useMenuCard(item, cartEnabled)
  const img = imageUrl(c.itemImage)
  const showImage = c.hasRealImage && !!img

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        whileHover={{ y: -4 }}
        className={`group relative flex h-full min-h-[24rem] flex-col overflow-hidden rounded-2xl shadow-lg ${c.isOutOfStock ? 'opacity-70' : ''}`}
      >
        {/* Arka plan: gerçek görsel veya marka renk gradyanı */}
        {showImage ? (
          <img
            src={img as string}
            alt={c.name}
            loading="lazy"
            className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 ${c.isOutOfStock ? 'grayscale' : 'group-hover:scale-110'}`}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(135deg, rgb(var(--brand-500)) 0%, rgb(var(--brand-600, var(--brand-500)) / 0.75) 100%)',
            }}
          >
            {/* Görselsiz: büyük ad ortada, dev tipografi */}
            <div className="flex h-full items-center justify-center p-6">
              <span className="font-display text-center text-3xl leading-tight text-white/90 line-clamp-4">
                {c.name}
              </span>
            </div>
          </div>
        )}

        {/* Okunabilirlik için alt gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 top-1/3 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

        {/* Sepete eklendi parlaması — konteyner relative olduğu için tam kaplar */}
        <AddedBurst show={c.showAdded} />

        {/* Üst rozetler / önerilen */}
        <div className="relative z-[1] flex items-start justify-between gap-2 p-4">
          <div className="flex flex-wrap gap-2">
            {c.featured && !c.isOutOfStock && (
              <span
                className="rounded-full px-3 py-1 text-xs font-display text-white shadow-lg backdrop-blur"
                style={{ background: 'rgb(var(--brand-500) / 0.9)' }}
              >
                ⭐ Önerilen
              </span>
            )}
            {!c.featured && c.badges.map((b, i) => (
              <span key={i} className={badgeClass(b)}>{b}</span>
            ))}
            {c.isOutOfStock && (
              <span className="rounded-full bg-black/70 px-3 py-1 text-xs font-display text-white shadow-lg backdrop-blur">
                {c.outOfStockReason || 'Tükendi'}
              </span>
            )}
          </div>
          {c.allergens.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); c.toggleAllergens() }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/40 text-sm text-white shadow-lg backdrop-blur transition-colors hover:bg-black/60"
              title="Alerjen bilgisi"
            >
              ⚠️
            </button>
          )}
        </div>

        {/* Alt içerik: ad + açıklama + fiyat + buton, gradient üstünde */}
        <div className="relative z-[1] mt-auto flex flex-col p-4">
          <div className="mb-2 flex items-end justify-between gap-3">
            <h3 className="font-display text-2xl leading-tight text-white drop-shadow">{c.name}</h3>
            <div className="shrink-0 text-right">
              {c.hasDiscount && (
                <div className="text-xs leading-none text-white/70 line-through">₺{c.strikePrice}</div>
              )}
              <div className={`font-display text-xl leading-none drop-shadow ${c.hasDiscount ? 'text-green-400' : 'text-white'}`}>
                ₺{c.displayPrice}
              </div>
            </div>
          </div>

          {c.description && (
            <p className="mb-1 text-sm leading-snug text-white/80 line-clamp-2">{c.description}</p>
          )}

          {(c.prepTime || c.calories) && (
            <div className="mb-3 flex items-center gap-3 text-xs text-white/70">
              {c.prepTime && <span>⏱️ {c.prepTime} dk</span>}
              {c.calories && <span>🔥 {c.calories} kcal</span>}
            </div>
          )}

          {/* Alerjen açılır — koyu zeminde okunur şekilde */}
          <div className="[&>div>div]:bg-black/60 [&>div>div]:border-white/20 [&_p]:text-white [&_span]:!bg-white/15 [&_span]:!text-white">
            <AllergenPills show={c.showAllergens} allergens={c.allergens} />
          </div>

          {c.cartEnabled && (
            <motion.button
              onClick={c.addToCart}
              disabled={c.isOutOfStock}
              whileHover={{ scale: c.isOutOfStock ? 1 : 1.02 }}
              whileTap={{ scale: c.isOutOfStock ? 1 : 0.98 }}
              className={`mt-2 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-display transition-colors ${
                c.isOutOfStock
                  ? 'cursor-not-allowed bg-white/20 text-white/60'
                  : 'text-white shadow-lg hover:brightness-110'
              }`}
              style={c.isOutOfStock ? undefined : { background: 'rgb(var(--brand-500))' }}
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
