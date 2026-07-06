// Hakkımızda — misyon, vizyon, hikaye, ekip, değerler, iletişim.
// SEO için yapılandırılmış schema.org Organization data dahil.
// İçerik tamamen tenant'a bağlı (useContent) — beyaz-etiket.

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { HfTarget, HfStar, HfPin, HfPhone } from '../components/BrandIcons'
import { useContent } from '../lib/contentStore'
import { useTheme } from '../hooks/useTheme'
import { imageUrl } from '../lib/api'

function GalleryCarousel({ photos, alt, openingDate }: { photos: string[]; alt: string; openingDate?: string }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (photos.length < 2) return
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % photos.length)
    }, 4500)
    return () => clearInterval(t)
  }, [photos.length])

  return (
    <div className="relative">
      <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl bg-gray-100 relative">
        <AnimatePresence mode="wait">
          <motion.img
            key={index}
            src={photos[index]}
            alt={`${alt} ${index + 1}`}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.7 }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </AnimatePresence>

        {/* Dots */}
        {photos.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Foto ${i + 1}`}
                className="rounded-full transition-all"
                style={{
                  width: i === index ? 24 : 8,
                  height: 8,
                  backgroundColor: i === index ? '#fbbf24' : 'rgba(255,255,255,0.6)',
                }}
              />
            ))}
          </div>
        )}

        {/* Prev/Next arrows */}
        {photos.length > 1 && (
          <>
            <button
              onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
              aria-label="Önceki foto"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 hover:bg-white shadow-lg flex items-center justify-center text-foreground z-10"
            >
              ←
            </button>
            <button
              onClick={() => setIndex((i) => (i + 1) % photos.length)}
              aria-label="Sonraki foto"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 hover:bg-white shadow-lg flex items-center justify-center text-foreground z-10"
            >
              →
            </button>
          </>
        )}
      </div>

      {/* Açılış chip */}
      {openingDate && (
        <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl p-4 shadow-xl">
          <div className="text-xs uppercase tracking-wider text-foreground-muted">
            Açılış
          </div>
          <div className="text-2xl font-display font-extrabold text-primary">
            {openingDate}
          </div>
        </div>
      )}
    </div>
  )
}

export const About = () => {
  const { content } = useContent()
  const theme = useTheme()

  const about = content.about || ({} as typeof content.about)
  const siteName = content.site?.name || 'Restoran'
  const brandLogo = imageUrl(theme?.logoUrl)

  const heroEyebrow = about.heroEyebrow || 'Hakkımızda'
  const heroTitle = about.heroTitle || about.storyTitle || siteName
  const heroSubtitle = about.heroSubtitle || ''

  const storyTitle = about.storyTitle || 'Hikayemiz'
  const storyParagraphs = about.storyParagraphs || []

  const missionTitle = about.missionTitle || 'Misyonumuz'
  const mission = about.mission || ''
  const visionTitle = about.visionTitle || 'Vizyonumuz'
  const vision = about.vision || ''

  const valuesTitle = about.valuesTitle || 'Değerlerimiz'
  const values = about.values || []

  const philosophyTitle = about.philosophyTitle || 'Mutfak Felsefemiz'
  const philosophyQuote = about.philosophyQuote || ''
  const philosophyBody = about.philosophyBody || ''

  const foundersTitle = about.foundersTitle || 'Ekibimiz'
  const founders = about.founders || []

  const galleryImages = (about.galleryImages || [])
    .map((src) => imageUrl(src))
    .filter((src): src is string => !!src)

  const address = content.contact?.address || ''
  const phoneTel = content.links?.phoneTel || content.whatsapp?.phone || ''
  const firstPost = content.blog && content.blog.length > 0 ? content.blog[0] : null

  useEffect(() => {
    const seoTitle = content.seo?.title || `Hakkımızda | ${siteName}`
    const seoDesc = content.seo?.description || ''
    document.title = seoTitle
    const meta = document.querySelector('meta[name="description"]')
    if (meta && seoDesc) meta.setAttribute('content', seoDesc)

    // JSON-LD Organization/Restaurant schema — sadece dolu alanlar eklenir.
    const ldId = 'about-jsonld'
    document.getElementById(ldId)?.remove()

    const domain = content.site?.domain
    const baseUrl = domain ? `https://${domain}` : undefined

    const ld: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      name: siteName,
    }
    if (seoDesc) ld.description = seoDesc
    if (baseUrl) {
      ld.url = baseUrl
      ld.logo = `${baseUrl}/logo.svg`
    }
    if (address) {
      ld.address = {
        '@type': 'PostalAddress',
        streetAddress: address,
        addressCountry: 'TR',
      }
    }
    if (phoneTel) ld.telephone = phoneTel
    if (about.openingDate) ld.foundingDate = about.openingDate
    if (founders.length > 0) {
      ld.founder = founders.map((f) => ({ '@type': 'Person', name: f.name }))
    }

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = ldId
    script.text = JSON.stringify(ld)
    document.head.appendChild(script)

    return () => {
      document.getElementById(ldId)?.remove()
    }
  }, [content, siteName, address, phoneTel, about.openingDate, founders])

  return (
    <main className="min-h-screen bg-paper">
      {/* Hero */}
      <section
        className="py-20 text-center text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #dc2626 0%, #bb1e10 50%, #8b1a1a 100%)' }}
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-300/15 rounded-full blur-3xl" />
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          {brandLogo ? (
            <img src={brandLogo} alt={siteName} className="h-32 mx-auto mb-4" />
          ) : (
            <div className="font-heading font-extrabold text-4xl md:text-5xl mb-4">
              {siteName}
            </div>
          )}
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-display font-extrabold tracking-widest mb-3 uppercase" style={{ backgroundColor: '#fbbf24', color: '#0f172a' }}>
            {heroEyebrow}
          </span>
          <h1 className="font-heading font-bold text-4xl md:text-6xl">
            {heroTitle}
          </h1>
          {heroSubtitle && (
            <p className="font-body text-lg text-white/80 max-w-2xl mx-auto mt-4 px-4">
              {heroSubtitle}
            </p>
          )}
        </motion.div>
      </section>

      {/* Hikaye */}
      {(storyParagraphs.length > 0 || galleryImages.length > 0) && (
        <section className="py-16 px-4">
          <div className="container-diner max-w-4xl">
            <div className="grid md:grid-cols-2 gap-10 items-center mb-16">
              <div>
                <span className="text-xs font-display font-extrabold uppercase tracking-widest text-primary mb-2 block">
                  {storyTitle}
                </span>
                <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground mb-4">
                  {heroTitle}
                </h2>
                {storyParagraphs.map((p, i) => (
                  <p key={i} className="text-foreground-muted leading-relaxed mb-4 last:mb-0">
                    {p}
                  </p>
                ))}
              </div>
              {galleryImages.length > 0 && (
                <div className="relative">
                  <GalleryCarousel photos={galleryImages} alt={siteName} openingDate={about.openingDate} />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Misyon & Vizyon */}
      {(mission || vision) && (
        <section className="py-16 px-4 bg-cream">
          <div className="container-diner max-w-5xl">
            <div className="grid md:grid-cols-2 gap-6">
              {mission && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl p-8 shadow-card"
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4"
                    style={{ backgroundColor: '#fef3c7' }}
                  >
                    <HfTarget className="w-7 h-7 text-amber-600" />
                  </div>
                  <h3 className="font-heading font-bold text-2xl text-foreground mb-3">
                    {missionTitle}
                  </h3>
                  <p className="text-foreground-muted leading-relaxed">
                    {mission}
                  </p>
                </motion.div>
              )}

              {vision && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-3xl p-8 shadow-card"
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4"
                    style={{ backgroundColor: '#dbeafe' }}
                  >
                    <HfStar className="w-7 h-7 text-accent" />
                  </div>
                  <h3 className="font-heading font-bold text-2xl text-foreground mb-3">
                    {visionTitle}
                  </h3>
                  <p className="text-foreground-muted leading-relaxed">
                    {vision}
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Değerlerimiz */}
      {values.length > 0 && (
        <section className="py-16 px-4">
          <div className="container-diner max-w-5xl">
            <div className="text-center mb-10">
              <span className="text-xs font-display font-extrabold uppercase tracking-widest text-primary mb-2 block">
                {valuesTitle}
              </span>
              <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground">
                {valuesTitle}
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {values.map((v, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -4 }}
                  className="bg-white rounded-2xl p-5 shadow-card text-center"
                >
                  <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary text-2xl">
                    {v.icon}
                  </div>
                  <h3 className="font-display font-bold text-base text-foreground mb-1">
                    {v.title}
                  </h3>
                  <p className="text-xs text-foreground-muted leading-snug">{v.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Mutfak Felsefesi (kısa) */}
      {(philosophyQuote || philosophyBody) && (
        <section className="py-16 px-4 bg-cream">
          <div className="container-diner max-w-3xl text-center">
            <span className="text-xs font-display font-extrabold uppercase tracking-widest text-primary mb-2 block">
              {philosophyTitle}
            </span>
            {philosophyQuote && (
              <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground mb-6">
                "{philosophyQuote}"
              </h2>
            )}
            {philosophyBody && (
              <p className="text-lg text-foreground-muted leading-relaxed mb-6">
                {philosophyBody}
              </p>
            )}
            {firstPost && (
              <Link
                to={`/blog/${firstPost.slug}`}
                className="inline-flex items-center gap-1 text-primary font-display font-bold text-lg hover:underline"
              >
                {firstPost.title} →
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Ekip / Kurucular */}
      {founders.length > 0 && (
        <section className="py-16 px-4">
          <div className="container-diner max-w-4xl">
            <div className="text-center mb-10">
              <span className="text-xs font-display font-extrabold uppercase tracking-widest text-primary mb-2 block">
                {foundersTitle}
              </span>
              <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground">
                {foundersTitle}
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {founders.map((f, i) => (
                <div key={i} className="bg-white rounded-3xl p-6 shadow-card text-center">
                  <div
                    className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center text-white text-3xl font-display font-extrabold mb-4 ${
                      i % 2 === 0
                        ? 'bg-gradient-to-br from-primary to-red-700'
                        : 'bg-gradient-to-br from-amber-500 to-orange-600'
                    }`}
                  >
                    {f.initials}
                  </div>
                  <h3 className="font-display font-bold text-xl text-foreground">
                    {f.name}
                  </h3>
                  {f.role && (
                    <div className="text-xs uppercase tracking-wider text-primary font-bold mt-1">
                      {f.role}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* İletişim */}
      {(address || phoneTel) && (
        <section className="py-16 px-4 bg-cream">
          <div className="container-diner max-w-3xl">
            <div className="bg-white rounded-3xl p-8 shadow-card">
              <div className="text-center mb-6">
                <h3 className="font-heading font-bold text-2xl text-foreground mb-2">
                  Bize Ulaş
                </h3>
                <p className="text-sm text-foreground-muted">
                  Bizi ziyaret et, telefonla ara ya da WhatsApp'tan yaz
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {address && (
                  <div className="flex items-start gap-3">
                    <div className="text-primary mt-0.5"><HfPin className="w-6 h-6" /></div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-foreground-muted">
                        Adres
                      </div>
                      <div className="font-display font-bold text-foreground">
                        {address}
                      </div>
                    </div>
                  </div>
                )}
                {phoneTel && (
                  <div className="flex items-start gap-3">
                    <div className="text-primary mt-0.5"><HfPhone className="w-6 h-6" /></div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-foreground-muted">
                        Telefon
                      </div>
                      <a
                        href={`tel:${phoneTel}`}
                        className="font-display font-bold text-foreground hover:text-primary"
                      >
                        {phoneTel}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
