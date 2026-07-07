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

// Şablon 09 — "Şerit Rozet" (Ribbon): köşede diyagonal marka-renkli şerit,
// oyuncu yuvarlak kart, görsel üstte, fiyat dairesel rozet. Neşeli.
// TÜM mantık useMenuCard hook'undan gelir; burada SADECE sunum var.
export const Template09 = ({ item, cartEnabled }: MenuCardProps) => {
  const c = useMenuCard(item, cartEnabled)
  const img = imageUrl(c.itemImage)

  // Şerit metni: "Yeni"/"Popüler" varsa onu, yoksa "Önerilen" için featured'ı kullan
  const ribbon =
    c.badges.find((b) => ['yeni', 'popüler'].includes(b.toLowerCase())) ||
    (c.featured ? 'Önerilen' : null)

  return (
    <>
      <motion.article
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-40px' }}
        whileHover={{ y: -6 }}
        className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-white shadow-sm transition-shadow hover:shadow-xl ${c.isOutOfStock ? 'opacity-60' : ''}`}
      >
        {/* Diyagonal köşe şeridi */}
        {ribbon && !c.isOutOfStock && (
          <div className="pointer-events-none absolute -right-11 top-5 z-20 w-40 rotate-45 py-1 text-center shadow-md" style={{ background: 'rgb(var(--brand-500))' }}>
            <span className="text-xs font-bold uppercase tracking-wider text-white">{ribbon}</span>
          </div>
        )}

        {/* Görsel üstte VEYA görselsiz zarif varyant */}
        {c.hasRealImage && img ? (
          <div className="relative aspect-[5/4] overflow-hidden bg-surface">
            <img
              src={img}
              alt={c.name}
              loading="lazy"
              className={`h-full w-full object-cover transition-transform duration-500 ${c.isOutOfStock ? 'grayscale' : 'group-hover:scale-110'}`}
            />
            {c.isOutOfStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <span className="-rotate-12 rounded-full bg-red-500 px-4 py-2 font-display text-sm text-white">
                  {c.outOfStockReason || 'Tükendi'}
                </span>
              </div>
            )}
            <AddedBurst show={c.showAdded} />
            {/* Dairesel fiyat rozeti — görsele bindirilmiş */}
            <div className="absolute -bottom-6 right-4 z-10 flex h-16 w-16 flex-col items-center justify-center rounded-full text-white shadow-lg ring-4 ring-white" style={{ background: 'rgb(var(--brand-500))' }}>
              {c.strikePrice && <span className="text-[10px] leading-none line-through opacity-80">₺{c.strikePrice}</span>}
              <span className="font-display text-base leading-none">₺{c.displayPrice}</span>
            </div>
          </div>
        ) : (
          <div className="relative flex items-center justify-center bg-surface py-8">
            {c.isOutOfStock && (
              <span className="absolute left-4 top-4 -rotate-6 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
                {c.outOfStockReason || 'Tükendi'}
              </span>
            )}
            <div className="flex flex-col items-center">
              {c.strikePrice && <span className="text-sm text-foreground-subtle line-through">₺{c.strikePrice}</span>}
              <span className="font-display text-4xl" style={{ color: 'rgb(var(--brand-500))' }}>₺{c.displayPrice}</span>
            </div>
          </div>
        )}

        <div className={`flex flex-1 flex-col p-5 ${c.hasRealImage && img ? 'pt-8' : 'pt-4'}`}>
          <div className="mb-1 flex items-start justify-between gap-2">
            <h3 className="font-display text-lg leading-tight text-foreground">{c.name}</h3>
            {c.allergens.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); c.toggleAllergens() }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm text-orange-600 transition-colors hover:bg-orange-200"
                title="Alerjen bilgisi"
              >
                ⚠️
              </button>
            )}
          </div>

          <p className="mb-2 flex-1 font-body text-sm leading-relaxed text-foreground-muted line-clamp-2">{c.description}</p>

          {/* Görselsiz varyantta rozetler burada; diğer meta bilgiler */}
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-foreground-subtle">
            {c.prepTime && <span>⏱️ {c.prepTime} dk</span>}
            {c.calories && <span>🔥 {c.calories} kcal</span>}
            {(!c.hasRealImage || !img) && c.badges.filter((b) => b !== ribbon).map((b, i) => (
              <span key={i} className={badgeClass(b)}>{b}</span>
            ))}
          </div>

          <AllergenPills show={c.showAllergens} allergens={c.allergens} />

          {c.cartEnabled && (
            <motion.button
              onClick={c.addToCart}
              disabled={c.isOutOfStock}
              whileHover={{ scale: c.isOutOfStock ? 1 : 1.03 }}
              whileTap={{ scale: c.isOutOfStock ? 1 : 0.97 }}
              className={`mt-auto flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-white transition-opacity ${
                c.isOutOfStock ? 'cursor-not-allowed bg-gray-300' : 'hover:opacity-90'
              }`}
              style={c.isOutOfStock ? undefined : { background: 'rgb(var(--brand-500))' }}
            >
              {c.isOutOfStock ? <>❌ Stokta Yok</> : <>🛒 Sepete Ekle</>}
            </motion.button>
          )}
        </div>
      </motion.article>
      <UpsellModal card={c} />
    </>
  )
}
