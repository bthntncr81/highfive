import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HfPizza, HfSandwich, HfPasta, HfDrink, HfDessert, HfRollingPin, HfArrow, HfPhone, HfStar, HfDelivery, HIGHLIGHT_ICON } from '../components/BrandIcons'
import { useContent } from '../lib/contentStore'
import { orderApi, type MenuItem as APIMenuItem } from '../lib/api'
import { useSettings } from '../hooks/useSettings'
import { RevealOnScroll, StaggerContainer, StaggerItem } from '../components/RevealOnScroll'
import { LoyaltyMegaSection } from '../components/LoyaltyMegaSection'
import { AppDownload } from '../components/AppDownload'
import { GoogleReviews } from '../components/GoogleReviews'

// Appetizing food imagery per category (placeholder — restoran kendi fotoğraflarıyla
// değiştirebilir). Her görsel yüklenemezse marka degradesine düşer (kırık görsel olmaz).
const CAT_IMG: Record<string, string> = {
  pizza: '/media/cat-pizza.jpg',
  makarna: '/media/cat-makarna.jpg',
  sandvic: '/media/cat-sandvic.jpg',
  icecek: '/media/cat-icecek.jpg',
  tatli: '/media/cat-tatli.jpg',
}
const HERO_IMG = '/media/hero.jpg'
const STORY_IMG = '/media/story.jpg'
const CAT_VIDEO: Record<string, string> = {
  pizza: '/media/vid-pizza.mp4',
  makarna: '/media/vid-makarna.mp4',
  sandvic: '/media/vid-sandvic.mp4',
}
const CAT_POSTER: Record<string, string> = {
  pizza: '/media/poster-pizza.jpg',
  makarna: '/media/poster-makarna.jpg',
  sandvic: '/media/poster-sandvic.jpg',
}
const CAT_ICON: Record<string, (p: any) => JSX.Element> = { pizza: HfPizza, makarna: HfPasta, sandvic: HfSandwich, icecek: HfDrink, tatli: HfDessert }

// Image that degrades to a warm brand gradient (with brand icon) if the source fails.
const FoodImg = ({ src, alt, Icon, className }: { src: string; alt: string; Icon?: (p: any) => JSX.Element; className?: string }) => {
  const [failed, setFailed] = useState(false)
  const Fallback = Icon || HfPizza
  if (failed || !src) {
    return (
      <div className={`flex items-center justify-center ${className || ''}`}
        style={{ background: 'linear-gradient(135deg,#d4382a,#8a1610)' }}>
        <Fallback className="w-20 h-20 text-white/90" />
      </div>
    )
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)}
    className={`object-cover ${className || ''}`} />
}

export const Home = () => {
  const { content } = useContent()
  const { whatsappEnabled } = useSettings()
  const [featuredItems, setFeaturedItems] = useState<APIMenuItem[]>([])

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const response = await orderApi.getMenu()
        if (response.success && response.data?.items) {
          const withImages = response.data.items.filter(
            (item) => item.image && item.image.startsWith('/uploads/')
          )
          setFeaturedItems(withImages.slice(0, 3))
        }
      } catch {
        /* fall back to content */
      }
    }
    fetchFeatured()
  }, [])

  const displayItems = featuredItems.length > 0
    ? featuredItems.map((item) => ({
        id: item.id, name: item.name, desc: item.description || '',
        price: Number(item.price), image: item.image || '',
        category: (item as { category?: string }).category || 'pizza',
      }))
    : content.menu.items
        .filter((i) => (i.badges || []).includes('Popüler'))
        .slice(0, 3)
        .map((i) => ({ id: i.id, name: i.name, desc: i.desc, price: i.price, image: i.image, category: i.category }))

  const headlineWords = (content.hero.headline || content.site.name).split(' ')
  const headFirst = headlineWords[0]
  const headRest = headlineWords.slice(1).join(' ')

  const cats = content.menu.categories.filter((c) => ['pizza', 'makarna', 'sandvic'].includes(c.id))
  const catCount = (id: string) => content.menu.items.filter((i) => i.category === id).length
  const waLink = `https://wa.me/${content.whatsapp.phone}?text=${encodeURIComponent(content.whatsapp.defaultMessage)}`

  return (
    <div className="overflow-hidden">

      {/* ============ HERO ============ */}
      <section className="relative section-cream pt-12 lg:pt-20 pb-16 lg:pb-24">
        <div className="absolute -top-24 -right-24 h-[520px] w-[520px] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="container-diner grid lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          <div className="lg:col-span-6">
            <RevealOnScroll>
              <p className="inline-flex items-center gap-2 text-[13px] font-bold tracking-wide text-primary bg-primary/10 rounded-full px-4 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {content.contact.address?.split(',').slice(-2).join(',').trim() || content.site.name}
              </p>
            </RevealOnScroll>
            <RevealOnScroll delay={0.08}>
              <h1 className="font-display font-extrabold text-[clamp(2.6rem,6.5vw,4.8rem)] leading-[0.98] mt-5">
                <span className="text-foreground">{headFirst}</span>{' '}
                <span className="text-primary">{headRest}</span>
              </h1>
            </RevealOnScroll>
            <RevealOnScroll delay={0.16}>
              <p className="mt-6 text-lg text-foreground-muted leading-relaxed max-w-[46ch]">
                {content.hero.subheadline}
              </p>
            </RevealOnScroll>
            <RevealOnScroll delay={0.24}>
              <div className="flex flex-wrap items-center gap-3 mt-8">
                <Link to="/menu" className="btn-primary text-[15px]">
                  Hemen Sipariş Ver <HfArrow className="w-4 h-4" />
                </Link>
                <Link to="/menu" className="btn bg-surface-elevated text-foreground border border-border hover:border-primary/40">
                  Menüyü Gör
                </Link>
              </div>
            </RevealOnScroll>
            <RevealOnScroll delay={0.32}>
              <div className="flex items-center gap-5 mt-9 text-sm text-foreground-subtle">
                <span className="flex items-center gap-2"><HfDelivery className="w-5 h-5 text-primary" /> 18 dk teslimat</span>
                <span className="h-4 w-px bg-border" />
                <span className="flex items-center gap-2"><HfStar className="w-5 h-5 text-amber-500" /> 4.9 / 5 Google</span>
              </div>
            </RevealOnScroll>
          </div>

          <RevealOnScroll delay={0.12} className="lg:col-span-6">
            <div className="relative">
              <FoodImg src={HERO_IMG} alt={content.site.name} Icon={HfPizza}
                className="aspect-[4/5] w-full rounded-[2rem] shadow-2xl" />
              <div className="absolute -left-3 lg:-left-6 bottom-10 bg-surface-elevated rounded-2xl px-4 py-3 shadow-2xl border border-border-light">
                <p className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-wide">{displayItems[0]?.name || 'Margherita'}</p>
                <p className="font-display font-extrabold text-2xl text-foreground leading-none mt-1">{displayItems[0]?.price || 149}<span className="text-primary text-lg">₺</span></p>
              </div>
              <div className="absolute -right-2 lg:-right-4 top-8 bg-primary text-white rounded-2xl px-4 py-3 shadow-2xl rotate-3">
                <p className="text-[11px] font-semibold opacity-80 uppercase tracking-wide">Bugün</p>
                <p className="font-display font-extrabold text-lg leading-none mt-0.5">Sıcacık kapında</p>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ============ HIGHLIGHTS BAND ============ */}
      <section className="border-y border-border bg-surface-elevated/60">
        <div className="container-diner grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border">
          {content.highlights.map((h, i) => {
            const Icon = HIGHLIGHT_ICON[h.icon] || HfDelivery
            return (
            <div key={i} className="flex items-center gap-4 p-6 lg:p-8">
              <span className="grid place-items-center h-12 w-12 rounded-2xl bg-primary/10 text-primary shrink-0"><Icon className="w-6 h-6" /></span>
              <div>
                <p className="font-display font-bold text-foreground">{h.title}</p>
                <p className="text-sm text-foreground-muted mt-0.5">{h.desc}</p>
              </div>
            </div>
          )})}
        </div>
      </section>

      {/* ============ FEATURED / POPULAR ============ */}
      <SectionLite>
        <div className="flex items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-sm font-bold tracking-wide text-primary uppercase">Çok sevilenler</p>
            <h2 className="font-display font-extrabold text-4xl lg:text-5xl text-foreground mt-3">Masada en çok buluşanlar</h2>
          </div>
          <Link to="/menu" className="hidden sm:inline-flex items-center gap-2 font-bold text-foreground hover:text-primary transition shrink-0">
            Tüm menü <HfArrow className="w-4 h-4" />
          </Link>
        </div>
        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayItems.map((item) => (
            <StaggerItem key={item.id}>
              <Link to="/menu" className="card-menu group block">
                <div className="relative aspect-[16/11] rounded-2xl overflow-hidden mb-4">
                  <FoodImg src={item.image && item.image.startsWith('/uploads/') ? item.image : (CAT_IMG[item.category] || CAT_IMG.pizza)}
                    alt={item.name} Icon={CAT_ICON[item.category] || HfPizza}
                    className="w-full h-full transition-transform duration-500 group-hover:scale-105" />
                  <span className="absolute top-3 left-3 badge-popular">Popüler</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display font-bold text-lg text-foreground group-hover:text-primary transition-colors">{item.name}</h3>
                  <p className="font-display font-extrabold text-xl text-foreground shrink-0">{item.price}<span className="text-primary text-sm">₺</span></p>
                </div>
                <p className="text-sm text-foreground-muted mt-1 line-clamp-2">{item.desc}</p>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </SectionLite>

      {/* ============ CATEGORIES ============ */}
      <section className="pb-16 lg:pb-24 section-cream">
        <div className="container-diner grid md:grid-cols-3 gap-5">
          {cats.map((c, i) => (
            <RevealOnScroll key={c.id} delay={i * 0.08} className={i === 1 ? 'md:mt-10' : ''}>
              <Link to={`/menu?category=${c.id}`} className="relative block aspect-[4/3] md:aspect-[3/4] rounded-[1.75rem] overflow-hidden shadow-lg group">
                {CAT_VIDEO[c.id] ? (
                  <video src={CAT_VIDEO[c.id]} poster={CAT_POSTER[c.id]} autoPlay muted loop playsInline preload="none"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <FoodImg src={CAT_IMG[c.id]} alt={c.name} Icon={CAT_ICON[c.id] || HfPizza} className="w-full h-full transition-transform duration-700 group-hover:scale-105" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-6 text-white">
                  <p className="text-sm opacity-80">{catCount(c.id)} çeşit</p>
                  <p className="font-display font-extrabold text-3xl">{c.name}</p>
                </div>
              </Link>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      {/* ============ BUILDER (Tasarla) ============ */}
      <SectionLite>
        <div className="grid md:grid-cols-2 gap-5 lg:gap-6">
          <RevealOnScroll delay={0.05}>
            <Link to="/build/pizza" className="block group h-full">
              <motion.div whileHover={{ y: -6 }} className="relative overflow-hidden rounded-3xl p-8 md:p-10 text-white shadow-xl h-full flex flex-col"
                style={{ background: 'linear-gradient(135deg,#d4382a 0%,#bb1e10 55%,#8a1610 100%)' }}>
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/15 rounded-full blur-3xl" />
                <div className="relative z-10 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-6">
                    <HfPizza className="w-24 h-24 drop-shadow-lg" />
                    <span className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-display font-bold tracking-wider">5 ADIM</span>
                  </div>
                  <h3 className="font-display font-extrabold text-3xl md:text-4xl mb-2">Kendi Pizzanı Tasarla</h3>
                  <p className="text-white/90 text-base md:text-lg mb-6">Hamur → Sos → Peynir → İçerik → Üst Sos</p>
                  <span className="inline-flex items-center gap-2 bg-white text-primary font-display font-bold text-lg px-6 py-3 rounded-full shadow-lg self-start mt-auto">
                    Tasarlamaya Başla <HfArrow className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </motion.div>
            </Link>
          </RevealOnScroll>
          <RevealOnScroll delay={0.12}>
            <Link to="/build/sandwich" className="block group h-full">
              <motion.div whileHover={{ y: -6 }} className="relative overflow-hidden rounded-3xl p-8 md:p-10 text-white shadow-xl h-full flex flex-col"
                style={{ background: 'linear-gradient(135deg,#b91c1c 0%,#991b1b 55%,#7f1d1d 100%)' }}>
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-300/25 rounded-full blur-3xl" />
                <div className="relative z-10 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-6">
                    <HfSandwich className="w-24 h-24 drop-shadow-lg" />
                    <span className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-display font-bold tracking-wider">5 ADIM</span>
                  </div>
                  <h3 className="font-display font-extrabold text-3xl md:text-4xl mb-2">Kendi Sandviçini Tasarla</h3>
                  <p className="text-white/90 text-base md:text-lg mb-6">Ekmek → Sos → Peynir → İçerik → Üst Sos</p>
                  <span className="inline-flex items-center gap-2 bg-white text-primary font-display font-bold text-lg px-6 py-3 rounded-full shadow-lg self-start mt-auto">
                    Tasarlamaya Başla <HfArrow className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </motion.div>
            </Link>
          </RevealOnScroll>
        </div>
      </SectionLite>

      {/* ============ STATS BAND ============ */}
      <section className="section-red">
        <div className="container-diner py-16 lg:py-20 grid sm:grid-cols-3 gap-8 text-center">
          {[['10K+', 'Mutlu Müşteri'], ['4.9', 'Google Puanı'], ['18dk', 'Ortalama Teslimat']].map(([n, l], i) => (
            <RevealOnScroll key={i} delay={i * 0.1}>
              <div className="font-display font-extrabold text-5xl lg:text-6xl text-white">{n}</div>
              <div className="text-lg text-white/80 mt-2">{l}</div>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      {/* ============ STORY ============ */}
      <section className="bg-[#1a1512] text-white">
        <div className="container-diner py-20 lg:py-28 grid lg:grid-cols-2 gap-12 items-center">
          <RevealOnScroll className="order-2 lg:order-1">
            <FoodImg src={STORY_IMG} alt={content.about.storyTitle} Icon={HfRollingPin} className="aspect-[5/4] w-full rounded-[2rem] shadow-2xl" />
          </RevealOnScroll>
          <div className="order-1 lg:order-2">
            <RevealOnScroll><p className="text-sm font-bold tracking-wide text-primary-light uppercase">{content.about.heroEyebrow || content.site.tagline}</p></RevealOnScroll>
            <RevealOnScroll delay={0.08}><h2 className="font-display font-extrabold text-4xl lg:text-5xl mt-3">{content.about.storyTitle || content.hero.headline}</h2></RevealOnScroll>
            <RevealOnScroll delay={0.16}>
              <p className="text-white/70 leading-relaxed mt-6 text-lg max-w-[52ch]">{content.about.storyParagraphs?.[0] || content.site.description}</p>
            </RevealOnScroll>
            <RevealOnScroll delay={0.24}>
              <Link to="/about" className="inline-flex items-center gap-2 mt-8 rounded-full border border-white/20 px-6 py-3.5 font-bold hover:bg-white hover:text-foreground transition">
                Hikayemiz <HfArrow className="w-4 h-4" />
              </Link>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* ============ Korunan zengin bölümler (premium sisteme otomatik geçer) ============ */}
      <GoogleReviews />
      <LoyaltyMegaSection />
      <AppDownload />

      {/* ============ ORDER CTA ============ */}
      <SectionLite>
        <RevealOnScroll>
          <div className="relative overflow-hidden rounded-[2.5rem] bg-primary text-white px-8 lg:px-16 py-16 lg:py-20 shadow-2xl">
            <div className="absolute -bottom-24 -right-12 opacity-[0.06] select-none pointer-events-none text-white"><HfPizza className="w-[26rem] h-[26rem]" /></div>
            <div className="relative max-w-xl">
              <h2 className="font-display font-extrabold text-4xl lg:text-5xl">Karnın mı acıktı?</h2>
              <p className="text-white/85 text-lg mt-4">{content.hero.subheadline || 'Hızlı teslimat. Şimdi sipariş ver, sıcacık kapına gelsin.'}</p>
              <div className="flex flex-wrap gap-3 mt-8">
                <Link to="/menu" className="btn bg-white text-primary hover:bg-surface">Sipariş Ver</Link>
                <a href={`tel:${content.links.phoneTel}`} className="btn bg-white/15 backdrop-blur border border-white/25 text-white hover:bg-white/25">
                  <HfPhone className="w-4 h-4" /> {content.links.phoneTel}
                </a>
                {whatsappEnabled && (
                  <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn bg-white/15 backdrop-blur border border-white/25 text-white hover:bg-white/25">
                    WhatsApp'tan Yaz
                  </a>
                )}
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </SectionLite>
    </div>
  )
}

// Lightweight section wrapper (premium spacing on warm paper).
const SectionLite = ({ children }: { children: React.ReactNode }) => (
  <section className="section-cream py-16 lg:py-24">
    <div className="container-diner">{children}</div>
  </section>
)
