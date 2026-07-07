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

// Şablon 19 — "Lüks": siyah-beyaz, geniş boşluk, ince hairline kurallar, serif.
// Fiyat sağda küçük; marka rengi yalnızca minik bir nokta/çizgi vurgu. Sofistike, sessiz.
// TÜM mantık useMenuCard hook'undan gelir; burada SADECE sunum var.
export const Template19 = ({ item, cartEnabled }: MenuCardProps) => {
  const c = useMenuCard(item, cartEnabled)
  const img = imageUrl(c.itemImage)

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        className={`group relative flex h-full flex-col bg-white border-t border-b border-foreground/15 px-6 py-8 ${c.isOutOfStock ? 'opacity-60' : ''}`}
      >
        {/* Marka rengi: sol üstte minik dikey çizgi vurgusu */}
        <span
          className="absolute left-0 top-8 h-8 w-[3px]"
          style={{ background: 'rgb(var(--brand-500))' }}
          aria-hidden
        />

        {/* Üst satır: önerilen/rozetler solda, fiyat sağda küçük */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex flex-wrap items-center gap-2 min-h-[1rem]">
            {c.featured && !c.isOutOfStock && (
              <span
                className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/70"
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'rgb(var(--brand-500))' }} />
                Önerilen
              </span>
            )}
            {!c.featured && c.badges.map((b, i) => (
              <span key={i} className={badgeClass(b)}>{b}</span>
            ))}
          </div>
          <div className="text-right shrink-0">
            {c.hasDiscount && (
              <div className="text-[11px] leading-none text-foreground-subtle line-through">₺{c.strikePrice}</div>
            )}
            <div
              className={`font-display text-lg leading-none ${c.hasDiscount ? 'text-green-600 mt-1' : 'text-foreground'}`}
            >
              ₺{c.displayPrice}
            </div>
          </div>
        </div>

        {/* Opsiyonel küçük görsel — kare, incelikli */}
        {c.hasRealImage && img && (
          <div className="relative mb-5 h-40 w-full overflow-hidden bg-surface">
            <img
              src={img}
              alt={c.name}
              loading="lazy"
              className={`h-full w-full object-cover transition-all duration-700 ${c.isOutOfStock ? 'grayscale' : 'group-hover:scale-105'}`}
            />
            {c.isOutOfStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-foreground">
                  {c.outOfStockReason || 'Tükendi'}
                </span>
              </div>
            )}
            <AddedBurst show={c.showAdded} />
          </div>
        )}

        {/* Görselsiz ve stokta yok: sade metin rozet */}
        {!c.hasRealImage && c.isOutOfStock && (
          <span className="mb-4 inline-block w-fit text-[10px] font-semibold uppercase tracking-[0.25em] text-foreground-subtle">
            {c.outOfStockReason || 'Tükendi'}
          </span>
        )}

        {/* İçerik */}
        <div className="flex flex-1 flex-col">
          <h3 className="font-display text-2xl leading-tight text-foreground">{c.name}</h3>

          <p className="mt-3 font-body text-sm leading-relaxed text-foreground-muted line-clamp-3">
            {c.description}
          </p>

          {/* İnce meta satırı */}
          {(c.prepTime || c.calories) && (
            <div className="mt-4 flex items-center gap-4 text-[11px] uppercase tracking-[0.15em] text-foreground-subtle">
              {c.prepTime && <span>{c.prepTime} dk</span>}
              {c.prepTime && c.calories && <span className="h-3 w-px bg-foreground/20" />}
              {c.calories && <span>{c.calories} kcal</span>}
            </div>
          )}

          {c.allergens.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); c.toggleAllergens() }}
              className="mt-3 inline-flex w-fit items-center gap-1 text-[11px] uppercase tracking-[0.15em] text-foreground-subtle transition-colors hover:text-foreground"
              title="Alerjen bilgisi"
            >
              ⚠️ Alerjen
            </button>
          )}
          <AllergenPills show={c.showAllergens} allergens={c.allergens} />

          {/* Sepete ekle: sade metin buton, hairline alt çizgi */}
          {c.cartEnabled && (
            <motion.button
              onClick={c.addToCart}
              disabled={c.isOutOfStock}
              whileTap={{ scale: c.isOutOfStock ? 1 : 0.97 }}
              className={`mt-6 flex items-center justify-between border-t border-foreground/15 pt-4 text-left text-xs font-semibold uppercase tracking-[0.25em] transition-colors ${
                c.isOutOfStock
                  ? 'cursor-not-allowed text-foreground-subtle'
                  : 'text-foreground hover:text-primary'
              }`}
            >
              <span>{c.isOutOfStock ? 'Stokta Yok' : 'Sepete Ekle'}</span>
              {!c.isOutOfStock && <span className="text-base tracking-normal" style={{ color: 'rgb(var(--brand-500))' }}>→</span>}
            </motion.button>
          )}
        </div>
      </motion.article>
      <UpsellModal card={c} />
    </>
  )
}
