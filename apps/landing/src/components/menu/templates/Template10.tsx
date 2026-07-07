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

// Şablon 10 — "Karanlık Neon": koyu kart (#0f172a), marka renginde neon kenar-parıltı,
// açık metin, fiyat neon çerçeveli. Gece modu hissi.
// TÜM mantık useMenuCard hook'undan gelir; burada SADECE sunum var.
export const Template10 = ({ item, cartEnabled }: MenuCardProps) => {
  const c = useMenuCard(item, cartEnabled)
  const img = imageUrl(c.itemImage)

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        whileHover={{ y: -4 }}
        className={`group relative flex h-full flex-col overflow-hidden rounded-2xl p-5 ${c.isOutOfStock ? 'opacity-60' : ''}`}
        style={{
          background: '#0f172a',
          border: '1px solid rgb(var(--brand-500) / 0.4)',
          boxShadow: '0 0 18px rgb(var(--brand-500) / 0.25), inset 0 0 24px rgb(var(--brand-500) / 0.06)',
        }}
      >
        {/* Görsel (varsa) üstte, hafif karartma */}
        {c.hasRealImage && img && (
          <div className="relative mb-4 aspect-[16/9] overflow-hidden rounded-xl">
            <img
              src={img}
              alt={c.name}
              loading="lazy"
              className={`h-full w-full object-cover transition-transform duration-500 ${c.isOutOfStock ? 'grayscale' : 'group-hover:scale-110'}`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/40 to-transparent" />
            {c.isOutOfStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <span className="-rotate-12 rounded-full border border-red-400 px-4 py-2 font-display text-sm text-red-300">
                  {c.outOfStockReason || 'Tükendi'}
                </span>
              </div>
            )}
            <AddedBurst show={c.showAdded} />
          </div>
        )}

        {/* Rozetler + önerilen (neon vurgulu) */}
        {(c.featured || c.badges.length > 0) && !c.isOutOfStock && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {c.featured && (
              <span
                className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider"
                style={{
                  color: 'rgb(var(--brand-500))',
                  border: '1px solid rgb(var(--brand-500) / 0.6)',
                  textShadow: '0 0 8px rgb(var(--brand-500) / 0.7)',
                }}
              >
                ⭐ Önerilen
              </span>
            )}
            {c.badges.map((b, i) => (
              <span key={i} className={badgeClass(b)}>{b}</span>
            ))}
          </div>
        )}

        {c.isOutOfStock && !c.hasRealImage && (
          <span className="mb-2 inline-block w-fit rounded-full border border-red-400 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-red-300">
            {c.outOfStockReason || 'Tükendi'}
          </span>
        )}

        <div className="mb-1 flex items-start justify-between gap-2">
          <h3
            className="font-display text-xl leading-tight text-slate-100"
            style={{ textShadow: '0 0 10px rgb(var(--brand-500) / 0.25)' }}
          >
            {c.name}
          </h3>
          {c.allergens.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); c.toggleAllergens() }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-orange-400/60 text-sm text-orange-300 transition-colors hover:bg-orange-400/10"
              title="Alerjen bilgisi"
            >
              ⚠️
            </button>
          )}
        </div>

        <p className="mb-3 flex-1 font-body text-sm leading-relaxed text-slate-400 line-clamp-2">{c.description}</p>

        <div className="mb-3 flex items-center gap-3 text-xs text-slate-500">
          {c.prepTime && <span>⏱️ {c.prepTime} dk</span>}
          {c.calories && <span>🔥 {c.calories} kcal</span>}
        </div>

        <div className="[&_.bg-orange-50]:bg-slate-800 [&_.border-orange-200]:border-slate-700">
          <AllergenPills show={c.showAllergens} allergens={c.allergens} />
        </div>

        {/* Fiyat: neon çerçeveli */}
        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <div
            className="flex items-baseline gap-2 rounded-lg px-3 py-1.5"
            style={{
              border: '1px solid rgb(var(--brand-500) / 0.5)',
              boxShadow: '0 0 12px rgb(var(--brand-500) / 0.3)',
            }}
          >
            {c.strikePrice && <span className="text-xs text-slate-500 line-through">₺{c.strikePrice}</span>}
            <span
              className="font-display text-xl"
              style={{ color: 'rgb(var(--brand-500))', textShadow: '0 0 10px rgb(var(--brand-500) / 0.6)' }}
            >
              ₺{c.displayPrice}
            </span>
          </div>

          {c.cartEnabled && (
            <motion.button
              onClick={c.addToCart}
              disabled={c.isOutOfStock}
              whileHover={{ scale: c.isOutOfStock ? 1 : 1.04 }}
              whileTap={{ scale: c.isOutOfStock ? 1 : 0.96 }}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                c.isOutOfStock ? 'cursor-not-allowed bg-slate-700 text-slate-400' : 'text-white'
              }`}
              style={c.isOutOfStock ? undefined : {
                background: 'rgb(var(--brand-500))',
                boxShadow: '0 0 16px rgb(var(--brand-500) / 0.55)',
              }}
            >
              {c.isOutOfStock ? <>❌ Yok</> : <>🛒 Ekle</>}
            </motion.button>
          )}
        </div>
      </motion.article>
      <UpsellModal card={c} />
    </>
  )
}
