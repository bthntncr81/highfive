import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Hero } from '../components/Hero'
import { useContent } from '../lib/contentStore'
import { useLoyalty } from '../lib/loyaltyStore'
import { SectionContainer, SectionHeading } from '../components/SectionContainer'
import { RevealOnScroll, StaggerContainer, StaggerItem } from '../components/RevealOnScroll'

export const Home = () => {
  const { content } = useContent()
  const { member } = useLoyalty()

  return (
    <main>
      {/* Hero Section */}
      <Hero />

      {/* Highlights Section */}
      <SectionContainer variant="paper">
        <SectionHeading
          title="Neden High Five?"
          subtitle="Lezzetin ve kalitenin buluşma noktası"
        />

        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {content.highlights.map((highlight, index) => (
            <StaggerItem key={index}>
              <motion.div
                whileHover={{ y: -4 }}
                className="card text-center h-full"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">{highlight.icon}</span>
                </div>
                <h3 className="font-display font-bold text-xl text-foreground mb-2">
                  {highlight.title}
                </h3>
                <p className="font-body text-foreground-muted text-sm">
                  {highlight.desc}
                </p>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </SectionContainer>

      {/* Featured Menu Preview */}
      <SectionContainer variant="cream">
        <div className="relative">
          <SectionHeading
            title="En Sevilenler"
            subtitle="Müşterilerimizin favorileri"
          />

          {/* Featured items */}
          <StaggerContainer className="grid md:grid-cols-3 gap-8 mb-12">
            {content.menu.items.slice(0, 3).map((item, index) => (
              <StaggerItem key={item.id}>
                <motion.div
                  whileHover={{ y: -4 }}
                  className="card-menu group cursor-pointer"
                >
                  {/* Image */}
                  <div className="relative aspect-video rounded-xl overflow-hidden mb-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    {/* Popular badge */}
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3, type: 'spring' }}
                      className="absolute top-3 right-3"
                    >
                      <span className="badge-popular">
                        FAVORİ
                      </span>
                    </motion.div>
                    {/* Price */}
                    <div className="absolute bottom-3 left-3 bg-primary text-white font-display font-bold text-lg px-3 py-1 rounded-full shadow-md">
                      ₺{item.price}
                    </div>
                  </div>
                  <h3 className="font-display font-bold text-xl text-foreground group-hover:text-primary transition-colors">
                    {item.name}
                  </h3>
                  <p className="font-body text-foreground-muted text-sm mt-1 line-clamp-2">
                    {item.desc}
                  </p>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* CTA to menu */}
          <RevealOnScroll className="text-center">
            <Link
              to="/menu"
              className="btn-primary text-xl inline-flex"
            >
              Tüm Menüyü Gör
              <motion.span
                animate={{ x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                →
              </motion.span>
            </Link>
          </RevealOnScroll>
        </div>
      </SectionContainer>

      {/* Social Proof / Stats */}
      <SectionContainer variant="red">
        <div className="grid sm:grid-cols-3 gap-8 text-center">
          {[
            { number: '10K+', label: 'Mutlu Müşteri', icon: '😋' },
            { number: '4.9', label: 'Google Puanı', icon: '⭐' },
            { number: '30dk', label: 'Ortalama Teslimat', icon: '🚀' },
          ].map((stat, index) => (
            <RevealOnScroll key={index} delay={index * 0.1}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="p-6"
              >
                <div className="text-4xl mb-3">
                  {stat.icon}
                </div>
                <div className="font-heading font-bold text-5xl text-white mb-2">
                  {stat.number}
                </div>
                <div className="font-body text-xl text-white/80">
                  {stat.label}
                </div>
              </motion.div>
            </RevealOnScroll>
          ))}
        </div>
      </SectionContainer>

      {/* Loyalty Program Section */}
      {!member ? (
        <SectionContainer variant="cream">
          <RevealOnScroll>
            <div className="relative bg-gradient-to-br from-accent to-accent-dark rounded-2xl p-8 md:p-12 overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl" />

              <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8">
                {/* Left side - Info */}
                <div className="flex-1 text-center lg:text-left">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                  </div>
                  <h2 className="font-heading font-bold text-4xl md:text-5xl text-white mb-4">
                    Sadakat Programı
                  </h2>
                  <p className="font-body text-xl text-white/90 mb-6 max-w-lg">
                    Ücretsiz üye ol, her siparişte puan kazan!
                    <span className="block mt-2 font-display font-semibold text-white">
                      İlk üyeliğe 50 puan hediye!
                    </span>
                  </p>

                  {/* Benefits */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    {[
                      { icon: '💰', text: 'Her 10₺ = 1 Puan' },
                      { icon: '🎁', text: '100 Puan = 10₺' },
                      { icon: '🌟', text: 'Özel Kampanyalar' },
                    ].map((benefit, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center"
                      >
                        <span className="text-2xl block mb-1">{benefit.icon}</span>
                        <span className="text-sm text-white font-display font-semibold">{benefit.text}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Right side - CTA */}
                <div className="flex-shrink-0 text-center">
                  <p className="text-white/80 font-body mb-4">
                    Sağ üstteki Üye Ol butonuna tıklayın
                  </p>
                  <Link to="/menu" className="btn bg-white text-accent font-bold text-xl inline-flex shadow-lg hover:shadow-xl transition-all">
                    Menüye Git →
                  </Link>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </SectionContainer>
      ) : (
        // Üye olanlar için puan bilgisi göster
        <SectionContainer variant="cream">
          <RevealOnScroll>
            <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-8 md:p-12 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

              <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8">
                <div className="flex-1 text-center lg:text-left">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <h2 className="font-heading font-bold text-4xl md:text-5xl text-white mb-2">
                    Merhaba, {member.name || 'Üye'}!
                  </h2>
                  <p className="font-body text-xl text-white/90 mb-4">
                    Sadakat programında aktif üyesiniz
                  </p>

                  {/* Puan Bilgisi */}
                  <div className="inline-flex items-center gap-4 bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-4">
                    <div className="text-center">
                      <p className="text-5xl font-bold text-white">{member.totalPoints}</p>
                      <p className="text-sm text-white/80">Puanınız</p>
                    </div>
                    <div className="w-px h-12 bg-white/30" />
                    <div className="text-center">
                      <p className="text-3xl font-bold text-white">
                        {Math.floor(member.totalPoints / 100) * 10}₺
                      </p>
                      <p className="text-sm text-white/80">Kullanılabilir</p>
                    </div>
                  </div>

                  {member.loyaltyTier && (
                    <div className="mt-4 inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                      <span className="text-xl">{member.loyaltyTier.icon}</span>
                      <span className="text-white font-display font-semibold">{member.loyaltyTier.name} Üye</span>
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0">
                  <Link
                    to="/menu"
                    className="bg-white text-emerald-600 font-display font-bold text-2xl px-10 py-5 rounded-full shadow-xl hover:shadow-2xl transition-all flex items-center gap-3"
                  >
                    Sipariş Ver →
                  </Link>
                  <p className="text-center text-white/80 text-sm mt-3">
                    Siparişte puanlarını kullan!
                  </p>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </SectionContainer>
      )}

      {/* CTA Section */}
      <SectionContainer variant="paper">
        <RevealOnScroll>
          <div className="relative bg-foreground rounded-2xl p-8 md:p-12 text-center overflow-hidden">
            {/* Content */}
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="font-heading font-bold text-4xl md:text-5xl text-white mb-4">
              Acıktın mı?
            </h2>
            <p className="font-body text-xl text-white/70 mb-8 max-w-xl mx-auto">
              WhatsApp'tan hızlıca sipariş ver, kapına gelsin!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={`https://wa.me/${content.whatsapp.phone}?text=${encodeURIComponent(content.whatsapp.defaultMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-whatsapp text-xl"
              >
                WhatsApp Sipariş
              </a>
              <Link to="/menu" className="btn bg-white text-foreground font-bold text-xl">
                Menüye Bak →
              </Link>
            </div>
          </div>
        </RevealOnScroll>
      </SectionContainer>

    </main>
  )
}
