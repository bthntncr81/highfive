import { useContent } from '../lib/contentStore'
import { RevealOnScroll, StaggerContainer, StaggerItem } from '../components/RevealOnScroll'
import { createWhatsAppLink } from '../lib/whatsapp'
import { useSettings } from '../hooks/useSettings'
import { HfPhone, HfWhatsapp, HfPin, HfClock, HfInstagram, HfTiktok, HfArrow } from '../components/BrandIcons'

const STOREFRONT = '/media/contact.jpg'

export const Contact = () => {
  const { content } = useContent()
  const { whatsappEnabled } = useSettings()
  const wa = createWhatsAppLink(content.whatsapp.phone, content.whatsapp.defaultMessage)

  return (
    <main className="overflow-hidden">
      {/* HERO */}
      <section className="section-cream pt-12 lg:pt-16 pb-16 lg:pb-20">
        <div className="container-diner grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6">
            <RevealOnScroll>
              <p className="text-sm font-bold tracking-wide text-primary uppercase">İletişim</p>
            </RevealOnScroll>
            <RevealOnScroll delay={0.08}>
              <h1 className="font-display font-extrabold text-5xl lg:text-6xl text-foreground mt-3">Bize ulaş</h1>
            </RevealOnScroll>
            <RevealOnScroll delay={0.16}>
              <p className="text-lg text-foreground-muted mt-4 max-w-md">
                {content.about.heroSubtitle || `${content.site.name} ile iletişime geç. Bizi ziyaret et, telefonla ara ya da WhatsApp'tan yaz.`}
              </p>
            </RevealOnScroll>
            <RevealOnScroll delay={0.24}>
              <div className="flex flex-wrap gap-3 mt-8">
                <a href={`tel:${content.links.phoneTel}`} className="btn-primary">
                  <HfPhone className="w-4 h-4" /> {content.links.phoneTel}
                </a>
                {whatsappEnabled && (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-whatsapp">
                    <HfWhatsapp className="w-4 h-4" /> WhatsApp
                  </a>
                )}
              </div>
            </RevealOnScroll>
          </div>
          <RevealOnScroll delay={0.12} className="lg:col-span-6">
            <img src={STOREFRONT} alt={content.site.name} loading="lazy"
              className="aspect-[4/3] w-full object-cover rounded-[2rem] shadow-2xl" />
          </RevealOnScroll>
        </div>
      </section>

      {/* CONTACT CARDS + HOURS */}
      <section className="section-cream pb-16 lg:pb-24">
        <div className="container-diner grid lg:grid-cols-12 gap-6">
          {/* left: cards */}
          <div className="lg:col-span-5 space-y-4">
            <RevealOnScroll>
              <a href={`tel:${content.links.phoneTel}`} className="card-menu flex items-center gap-4 bg-primary text-white">
                <span className="grid place-items-center h-12 w-12 rounded-2xl bg-white/15 shrink-0"><HfPhone className="w-6 h-6" /></span>
                <div><p className="text-white/70 text-sm">Telefonla sipariş</p><p className="font-display font-extrabold text-2xl">{content.links.phoneTel}</p></div>
              </a>
            </RevealOnScroll>
            {whatsappEnabled && (
              <RevealOnScroll delay={0.06}>
                <a href={wa} target="_blank" rel="noopener noreferrer" className="card-menu flex items-center gap-4">
                  <span className="grid place-items-center h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-600 shrink-0"><HfWhatsapp className="w-6 h-6" /></span>
                  <div><p className="text-foreground-muted text-sm">WhatsApp</p><p className="font-display font-extrabold text-xl text-foreground">Hızlıca yaz</p></div>
                </a>
              </RevealOnScroll>
            )}
            <RevealOnScroll delay={0.12}>
              <a href={content.links.googleMaps} target="_blank" rel="noopener noreferrer" className="card-menu flex items-start gap-4">
                <span className="grid place-items-center h-12 w-12 rounded-2xl bg-primary/10 text-primary shrink-0"><HfPin className="w-6 h-6" /></span>
                <div><p className="text-foreground-muted text-sm">Adres</p><p className="font-semibold text-foreground mt-0.5 leading-snug">{content.contact.address}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-primary mt-2">Yol tarifi al <HfArrow className="w-4 h-4" /></span></div>
              </a>
            </RevealOnScroll>
            <RevealOnScroll delay={0.18}>
              <div className="flex items-center gap-3 pt-1">
                {content.links.instagram && (
                  <a href={content.links.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                    className="grid place-items-center h-12 w-12 rounded-full bg-surface-elevated shadow-card text-primary hover:bg-primary hover:text-white transition"><HfInstagram className="w-6 h-6" /></a>
                )}
                {content.links.tiktok && (
                  <a href={content.links.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok"
                    className="grid place-items-center h-12 w-12 rounded-full bg-surface-elevated shadow-card text-primary hover:bg-primary hover:text-white transition"><HfTiktok className="w-6 h-6" /></a>
                )}
              </div>
            </RevealOnScroll>
          </div>

          {/* right: hours */}
          <RevealOnScroll delay={0.1} className="lg:col-span-7">
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <span className="grid place-items-center h-10 w-10 rounded-xl bg-primary/10 text-primary"><HfClock className="w-5 h-5" /></span>
                <h2 className="font-display font-extrabold text-2xl text-foreground">Çalışma Saatleri</h2>
              </div>
              <div className="divide-y divide-border">
                {content.contact.hours.map((h, i) => (
                  <div key={i} className="flex items-center justify-between py-3">
                    <span className="font-medium text-foreground-muted">{h.day}</span>
                    <span className={`font-display font-bold ${h.close === '00:00' ? 'text-primary' : 'text-foreground'}`}>{h.open} - {h.close}</span>
                  </div>
                ))}
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* MAP */}
      {content.contact.mapEmbedUrl && (
        <section className="section-cream pb-16 lg:pb-24">
          <div className="container-diner">
            <RevealOnScroll>
              <div className="relative rounded-[2rem] overflow-hidden shadow-xl">
                <div className="aspect-video md:aspect-[21/9]">
                  <iframe src={content.contact.mapEmbedUrl} width="100%" height="100%" style={{ border: 0 }}
                    allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title={`${content.site.name} Konum`} />
                </div>
                <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6">
                  <div className="card max-w-xs flex items-start gap-3">
                    <span className="grid place-items-center h-10 w-10 rounded-xl bg-primary/10 text-primary shrink-0"><HfPin className="w-5 h-5" /></span>
                    <div>
                      <h4 className="font-display font-bold text-foreground">{content.site.logoText}</h4>
                      <p className="text-sm text-foreground-muted">{content.contact.address}</p>
                      <a href={content.links.googleMaps} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm mt-3">Yol Tarifi Al</a>
                    </div>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </section>
      )}

      {/* CTA */}
      {whatsappEnabled && (
        <section className="section-cream pb-20 lg:pb-28">
          <div className="container-diner">
            <RevealOnScroll>
              <div className="relative overflow-hidden rounded-[2.5rem] bg-primary text-white px-8 lg:px-16 py-16 text-center shadow-2xl">
                <h2 className="font-display font-extrabold text-4xl lg:text-5xl">Acıktıysan bekleme!</h2>
                <p className="text-white/85 text-lg mt-4 max-w-xl mx-auto">WhatsApp'tan hızlıca sipariş ver, 18 dakikada kapında olsun.</p>
                <a href={wa} target="_blank" rel="noopener noreferrer" className="btn bg-white text-primary hover:bg-surface mt-8 inline-flex">
                  <HfWhatsapp className="w-5 h-5" /> Hemen Sipariş Ver
                </a>
              </div>
            </RevealOnScroll>
          </div>
        </section>
      )}
    </main>
  )
}
