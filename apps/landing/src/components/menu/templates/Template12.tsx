import { motion } from 'framer-motion'
import {
  useMenuCard,
  badgeClass,
  AddedBurst,
  AllergenPills,
  UpsellModal,
  type MenuCardProps,
} from '../useMenuCard'

// Şablon 12 — "Fiş" (Receipt): termal fiş estetiği. Monospace font, kesik çizgi satırlar,
// ad solda ...... fiyat sağda (nokta lider). Görsel YOK — fiyat/isim öne çıkar.
// Sepet "＋ EKLE" mono buton. TÜM mantık useMenuCard'dan gelir; burada sadece sunum.
export const Template12 = ({ item, cartEnabled }: MenuCardProps) => {
  const c = useMenuCard(item, cartEnabled)

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        whileHover={{ y: -3 }}
        className={`group relative flex h-full flex-col bg-white px-4 pb-4 pt-3 font-mono text-foreground shadow-[0_6px_18px_-6px_rgba(0,0,0,0.25)] ${c.isOutOfStock ? 'opacity-60' : ''}`}
        style={{ fontFamily: '"Courier New", ui-monospace, monospace' }}
      >
        {/* Sepete eklendi parlaması için relative konteyner (görsel yok, tüm karta yay) */}
        <AddedBurst show={c.showAdded} />

        {/* Fiş başlığı */}
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-foreground-subtle">
          <span>* ADET 1 *</span>
          {c.prepTime && <span>⏱ {c.prepTime} DK</span>}
        </div>
        <div className="my-2 border-t border-dashed border-foreground/30" />

        {/* Ad ...... fiyat (nokta lider) */}
        <div className="flex items-baseline gap-1">
          <h3 className="shrink-0 text-sm font-bold uppercase leading-tight tracking-wide">
            {c.name}
          </h3>
          <span aria-hidden className="min-w-6 flex-1 translate-y-[-2px] overflow-hidden text-foreground/30">
            ...........................................................
          </span>
          <span className="shrink-0 text-sm font-bold" style={{ color: 'rgb(var(--brand-500))' }}>
            ₺{c.displayPrice}
          </span>
        </div>

        <div className="mt-0.5 flex items-baseline justify-end gap-2 text-[11px] text-foreground-subtle">
          <span className="line-through">liste ₺{c.strikePrice}</span>
          {c.hasDiscount && <span className="font-bold text-green-600">İNDİRİM</span>}
        </div>

        {c.featured && (
          <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-yellow-600">
            &gt;&gt; ⭐ ÖNERİLEN &lt;&lt;
          </p>
        )}

        {c.description && (
          <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-foreground-muted">
            {c.description}
          </p>
        )}

        {c.calories && (
          <p className="mt-1 text-[10px] uppercase tracking-wider text-foreground-subtle">
            KALORİ ... {c.calories} kcal
          </p>
        )}

        {c.badges.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {c.badges.map((b, i) => (
              <span key={i} className={badgeClass(b)}>{b}</span>
            ))}
          </div>
        )}

        {c.allergens.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); c.toggleAllergens() }}
            className="mt-2 self-start text-[11px] uppercase tracking-wider text-orange-600 underline decoration-dotted underline-offset-2 hover:text-orange-700"
            title="Alerjen bilgisi"
          >
            ⚠️ ALERJEN
          </button>
        )}
        <AllergenPills show={c.showAllergens} allergens={c.allergens} />

        <div className="my-3 border-t border-dashed border-foreground/30" />

        {c.isOutOfStock ? (
          <p className="mt-auto text-center text-xs font-bold uppercase tracking-[0.2em] text-red-600">
            [ {c.outOfStockReason || 'TÜKENDİ'} ]
          </p>
        ) : c.cartEnabled ? (
          <motion.button
            onClick={c.addToCart}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="mt-auto w-full border border-dashed border-primary bg-transparent py-2 text-xs font-bold uppercase tracking-[0.2em] text-primary transition-colors hover:bg-primary hover:text-white"
          >
            ＋ EKLE
          </motion.button>
        ) : (
          <p className="mt-auto text-center text-[10px] uppercase tracking-[0.2em] text-foreground-subtle">
            ~ teşekkürler ~
          </p>
        )}
      </motion.article>
      <UpsellModal card={c} />
    </>
  )
}
