import { motion } from 'framer-motion'
import { useContent } from '../lib/contentStore'
import { SectionContainer, SectionHeading } from '../components/SectionContainer'
import { RevealOnScroll, StaggerContainer, StaggerItem } from '../components/RevealOnScroll'
import { createWhatsAppLink } from '../lib/whatsapp'

export const Contact = () => {
  const { content } = useContent()

  return (
    <main>
      {/* Page Header */}
      <SectionContainer variant="red" className="py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <motion.img
            src="/logo-white.svg"
            alt="High Five"
            className="h-24 md:h-32 w-auto mx-auto mb-4"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
          />
          <h1 className="font-heading font-bold text-5xl md:text-6xl text-white mb-4">
            İletişim
          </h1>
          <p className="font-body text-xl text-background/80 max-w-xl mx-auto">
            Bize ulaşın, siparişinizi verin!
          </p>
        </motion.div>
      </SectionContainer>

      {/* Contact Info Cards */}
      <SectionContainer variant="paper">
        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {/* Address */}
          <StaggerItem>
            <motion.div
              whileHover={{ y: -8, rotate: -2 }}
              className="card h-full"
            >
              <div className="text-4xl mb-4">📍</div>
              <h3 className="font-display text-lg text-foreground mb-2">
                Adres
              </h3>
              <p className="font-body text-foreground-muted text-sm">
                {content.contact.address}
              </p>
              <a
                href={content.links.googleMaps}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-display text-sm text-primary mt-3 hover:underline"
              >
                Haritada Gör →
              </a>
            </motion.div>
          </StaggerItem>

          {/* Phone */}
          <StaggerItem>
            <motion.div
              whileHover={{ y: -8, rotate: 2 }}
              className="card h-full"
            >
              <div className="text-4xl mb-4">📞</div>
              <h3 className="font-display text-lg text-foreground mb-2">
                Telefon
              </h3>
              <a
                href={`tel:${content.links.phoneTel}`}
                className="font-body text-foreground-muted hover:text-primary transition-colors"
              >
                {content.links.phoneTel}
              </a>
            </motion.div>
          </StaggerItem>

          {/* WhatsApp */}
          <StaggerItem>
            <motion.div
              whileHover={{ y: -8, rotate: -2 }}
              className="card h-full"
            >
              <div className="text-4xl mb-4">💬</div>
              <h3 className="font-display text-lg text-foreground mb-2">
                WhatsApp Sipariş
              </h3>
              <a
                href={createWhatsAppLink(content.whatsapp.phone, content.whatsapp.defaultMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-whatsapp text-sm mt-2"
              >
                Sipariş Ver
              </a>
            </motion.div>
          </StaggerItem>

          {/* Social */}
          <StaggerItem>
            <motion.div
              whileHover={{ y: -8, rotate: 2 }}
              className="card h-full"
            >
              <div className="text-4xl mb-4">📱</div>
              <h3 className="font-display text-lg text-foreground mb-2">
                Sosyal Medya
              </h3>
              <div className="flex gap-3 mt-3">
                {content.links.instagram && (
                  <a
                    href={content.links.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 flex items-center justify-center bg-accent rounded-xl text-xl text-white hover:bg-primary transition-colors"
                  >
                    📸
                  </a>
                )}
                {content.links.tiktok && (
                  <a
                    href={content.links.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 flex items-center justify-center bg-accent rounded-xl text-xl text-white hover:bg-primary transition-colors"
                  >
                    🎵
                  </a>
                )}
              </div>
            </motion.div>
          </StaggerItem>
        </StaggerContainer>

        {/* Opening Hours */}
        <RevealOnScroll>
          <div className="max-w-2xl mx-auto">
            <SectionHeading title="Çalışma Saatleri 🕐" />

            <div className="bg-accent text-white rounded-xl p-6">
              {content.contact.hours.map((hour, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="flex justify-between items-baseline py-2 border-b border-white/10"
                >
                  <span className="font-body text-lg">{hour.day}</span>
                  <span className="font-display font-bold text-accent-light">
                    {hour.open} - {hour.close}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </RevealOnScroll>
      </SectionContainer>

      {/* Map */}
      <SectionContainer variant="cream">
        <SectionHeading
          title="Bizi Bulun 🗺️"
          subtitle="Haritada konumumuz"
        />

        <RevealOnScroll>
          <div className="relative rounded-2xl overflow-hidden shadow-xl">
            {/* Map container */}
            <div className="aspect-video md:aspect-[21/9]">
              <iframe
                src={content.contact.mapEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="High Five Konum"
              />
            </div>

            {/* Overlay card */}
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="absolute bottom-4 left-4 md:bottom-8 md:left-8"
            >
              <div className="card max-w-xs">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">📍</span>
                  <div>
                    <h4 className="font-display text-lg text-foreground">
                      High Five
                    </h4>
                    <p className="font-body text-sm text-foreground-muted">
                      {content.contact.address}
                    </p>
                    <a
                      href={content.links.googleMaps}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary text-sm mt-3"
                    >
                      Yol Tarifi Al
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </RevealOnScroll>
      </SectionContainer>

      {/* CTA */}
      <SectionContainer variant="red">
        <RevealOnScroll>
          <div className="text-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-6xl mb-6"
            >
              🍕
            </motion.div>
            <h2 className="font-heading font-bold text-4xl text-white mb-4">
              Acıktıysan bekleme!
            </h2>
            <p className="font-body text-xl text-background/80 mb-8 max-w-xl mx-auto">
              WhatsApp'tan hızlıca sipariş ver, 30 dakikada kapında olsun!
            </p>
            <a
              href={createWhatsAppLink(content.whatsapp.phone, content.whatsapp.defaultMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xl inline-flex"
            >
              <span>📱</span>
              Hemen Sipariş Ver
            </a>
          </div>
        </RevealOnScroll>
      </SectionContainer>
    </main>
  )
}
