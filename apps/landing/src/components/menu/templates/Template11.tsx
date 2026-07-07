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

// Şablon 11 — "Polaroid": hafif eğik beyaz çerçeveli fotoğraf kartı, üstte bant (tape)
// efekti, altında el-yazısı hissi caption (ad) ve köşe fiyat etiketi. Görselsizse
// çerçeve içi marka renkli blok. TÜM mantık useMenuCard'dan gelir; burada sadece sunum.
export const Template11 = ({ item, cartEnabled }: MenuCardProps) => {
  const c = useMenuCard(item, cartEnabled)
  const img = imageUrl(c.itemImage)

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 24, rotate: -3 }}
        whileInView={{ opacity: 1, y: 0, rotate: -1.5 }}
        viewport={{ once: true, margin: '-40px' }}
        whileHover={{ rotate: 0, y: -6 }}
        className={`group relative flex h-full flex-col bg-white p-3 pb-4 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.35)] ${c.isOutOfStock ? 'opacity-60' : ''}`}
      >
        {/* Bant / tape efekti */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 -rotate-2 rounded-sm bg-white/40 shadow-sm"
          style={{ background: 'rgb(var(--brand-500) / 0.22)', backdropFilter: 'blur(1px)' }}
        />

        {/* Foto alanı */}
        <div className="relative aspect-square w-full overflow-hidden bg-surface">
          {c.hasRealImage && img ? (
            <img
              src={img}
              alt={c.name}
              loading="lazy"
              className={`h-full w-full object-cover transition-transform duration-500 ${c.isOutOfStock ? 'grayscale' : 'group-hover:scale-105'}`}
            />
          ) : (
            <div
              className="flex h-full w-full flex-col items-center justify-center gap-1 text-white"
              style={{ background: 'rgb(var(--brand-500))' }}
            >
              <span className="font-display text-3xl leading-none">₺{c.displayPrice}</span>
              <span className="text-xs line-through text-white/70">₺{c.strikePrice}</span>
            </div>
          )}

          {c.isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45">
              <span className="-rotate-12 rounded-full bg-red-500 px-3 py-1 font-display text-xs text-white shadow">
                {c.outOfStockReason || 'Tükendi'}
              </span>
            </div>
          )}

          {c.featured && !c.isOutOfStock && (
            <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-display text-yellow-300 shadow">
              ⭐ Önerilen
            </span>
          )}

          {c.badges.length > 0 && !c.isOutOfStock && !c.featured && (
            <div className="absolute left-2 top-2 flex flex-wrap gap-1">
              {c.badges.map((b, i) => (
                <span key={i} className={badgeClass(b)}>{b}</span>
              ))}
            </div>
          )}

          {c.allergens.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); c.toggleAllergens() }}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-xs text-white shadow hover:bg-orange-600"
              title="Alerjen bilgisi"
            >
              ⚠️
            </button>
          )}

          {/* Fiyat köşe etiketi (foto varken) */}
          {c.hasRealImage && img && (
            <div className="absolute bottom-2 right-2 flex flex-col items-end leading-none">
              <span className="rounded-sm bg-black/30 px-1 text-[10px] text-white/85 line-through">₺{c.strikePrice}</span>
              <span
                className="mt-0.5 rounded-md px-2 py-0.5 font-display text-lg text-white shadow"
                style={{ background: 'rgb(var(--brand-500))' }}
              >
                ₺{c.displayPrice}
              </span>
            </div>
          )}

          <AddedBurst show={c.showAdded} />
        </div>

        {/* Caption (el-yazısı hissi) */}
        <div className="flex flex-1 flex-col px-1 pt-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-lg italic leading-tight text-foreground" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              {c.name}
            </h3>
            {c.prepTime && <span className="mt-1 shrink-0 text-[11px] text-foreground-subtle">⏱️ {c.prepTime} dk</span>}
          </div>

          <p className="mt-1 line-clamp-2 flex-1 font-body text-sm text-foreground-muted">{c.description}</p>
          {c.calories && <p className="mt-1 text-[11px] text-foreground-subtle">🔥 {c.calories} kcal</p>}

          <AllergenPills show={c.showAllergens} allergens={c.allergens} />

          {c.cartEnabled && (
            <motion.button
              onClick={c.addToCart}
              disabled={c.isOutOfStock}
              whileHover={{ scale: c.isOutOfStock ? 1 : 1.02 }}
              whileTap={{ scale: c.isOutOfStock ? 1 : 0.98 }}
              className={`mt-3 w-full justify-center rounded-md border-2 border-primary py-2 font-display text-sm text-primary transition-colors hover:bg-primary hover:text-white ${c.isOutOfStock ? 'cursor-not-allowed border-gray-300 text-gray-400 hover:bg-transparent hover:text-gray-400' : ''}`}
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
