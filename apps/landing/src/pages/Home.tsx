import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Hero } from '../components/Hero'
import { useContent } from '../lib/contentStore'
import { useLoyalty } from '../lib/loyaltyStore'
import { SectionContainer, SectionHeading } from '../components/SectionContainer'
import { RevealOnScroll, StaggerContainer, StaggerItem } from '../components/RevealOnScroll'
import { PizzaSlice } from '../components/FoodAnimations'

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
          title="Neden High Five? ✋"
          subtitle="Lezzetin ve kalitenin buluşma noktası"
        />

        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {content.highlights.map((highlight, index) => (
            <StaggerItem key={index}>
              <motion.div
                whileHover={{ y: -8, rotate: index % 2 === 0 ? 2 : -2 }}
                className="card kraft-paper text-center h-full"
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 4, delay: index * 0.5 }}
                  className="text-5xl mb-4"
                >
                  {highlight.icon}
                </motion.div>
                <h3 className="font-display text-xl text-diner-chocolate mb-2">
                  {highlight.title}
                </h3>
                <p className="font-body text-diner-chocolate-light text-sm">
                  {highlight.desc}
                </p>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </SectionContainer>

      {/* Featured Menu Preview */}
      <SectionContainer variant="cream" withPattern>
        <div className="relative">
          {/* Decorative pizza slice */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
            className="absolute -top-10 -right-10 opacity-10 hidden lg:block"
          >
            <PizzaSlice className="w-32 h-40" />
          </motion.div>

          <SectionHeading
            title="En Sevilenler 🔥"
            subtitle="Müşterilerimizin favorileri"
          />

          {/* Featured items */}
          <StaggerContainer className="grid md:grid-cols-3 gap-8 mb-12">
            {content.menu.items.slice(0, 3).map((item, index) => (
              <StaggerItem key={item.id}>
                <motion.div
                  whileHover={{ scale: 1.03, rotate: index % 2 === 0 ? 1 : -1 }}
                  className="card-menu group cursor-pointer"
                >
                  {/* Image */}
                  <div className="relative aspect-video rounded-diner overflow-hidden mb-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    {/* Popular stamp */}
                    <motion.div
                      initial={{ scale: 0, rotate: -20 }}
                      whileInView={{ scale: 1, rotate: -12 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3, type: 'spring' }}
                      className="absolute top-3 right-3 stamp-red"
                    >
                      <span className="text-[8px]">
                        FAVORİ
                      </span>
                    </motion.div>
                    {/* Price */}
                    <div className="absolute bottom-3 left-3 bg-diner-mustard text-diner-chocolate font-display text-lg px-3 py-1 rounded-stamp shadow-stamp transform -rotate-2">
                      ₺{item.price}
                    </div>
                  </div>
                  <h3 className="font-display text-xl text-diner-chocolate group-hover:text-diner-red transition-colors">
                    {item.name}
                  </h3>
                  <p className="font-body text-diner-chocolate-light text-sm mt-1 line-clamp-2">
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
              <span>🍕</span>
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
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 3, delay: index * 0.5 }}
                  className="text-5xl mb-3"
                >
                  {stat.icon}
                </motion.div>
                <div className="font-heading text-5xl text-white mb-2">
                  {stat.number}
                </div>
                <div className="font-hand text-xl text-diner-mustard">
                  {stat.label}
                </div>
              </motion.div>
            </RevealOnScroll>
          ))}
        </div>
      </SectionContainer>

      {/* Loyalty Program Section - Sadece üye olmayanlara göster */}
      {!member ? (
        <SectionContainer variant="cream" withPattern>
          <RevealOnScroll>
            <div className="relative bg-gradient-to-br from-amber-400 via-orange-400 to-red-500 rounded-diner-lg p-8 md:p-12 overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-yellow-300/20 rounded-full blur-2xl" />
              
              <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8">
                {/* Left side - Info */}
                <div className="flex-1 text-center lg:text-left">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 3 }}
                    className="text-6xl mb-4"
                  >
                    🎁
                  </motion.div>
                  <h2 className="font-heading text-4xl md:text-5xl text-white mb-4 drop-shadow-lg">
                    Sadakat Programı
                  </h2>
                  <p className="font-body text-xl text-white/90 mb-6 max-w-lg">
                    Ücretsiz üye ol, her siparişte puan kazan!
                    <span className="block mt-2 font-display text-yellow-200">
                      🎉 İlk üyeliğe 50 puan hediye!
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
                        className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center"
                      >
                        <span className="text-2xl block mb-1">{benefit.icon}</span>
                        <span className="text-sm text-white font-display">{benefit.text}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
                
                {/* Right side - CTA - Header'daki modal açılıyor */}
                <div className="flex-shrink-0 text-center">
                  <p className="text-white/90 font-display mb-4">
                    Sağ üstteki 🎁 Üye Ol butonuna tıklayın
                  </p>
                  <Link to="/menu" className="btn-secondary text-xl inline-flex">
                    <span>📋</span>
                    Menüye Git
                  </Link>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </SectionContainer>
      ) : (
        // Üye olanlar için puan bilgisi göster
        <SectionContainer variant="cream" withPattern>
          <RevealOnScroll>
            <div className="relative bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 rounded-diner-lg p-8 md:p-12 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              
              <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8">
                <div className="flex-1 text-center lg:text-left">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-6xl mb-4"
                  >
                    👑
                  </motion.div>
                  <h2 className="font-heading text-4xl md:text-5xl text-white mb-2 drop-shadow-lg">
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
                      <p className="text-3xl font-bold text-yellow-200">
                        {Math.floor(member.totalPoints / 100) * 10}₺
                      </p>
                      <p className="text-sm text-white/80">Kullanılabilir</p>
                    </div>
                  </div>
                  
                  {member.loyaltyTier && (
                    <div className="mt-4 inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                      <span className="text-xl">{member.loyaltyTier.icon}</span>
                      <span className="text-white font-display">{member.loyaltyTier.name} Üye</span>
                    </div>
                  )}
                </div>
                
                <div className="flex-shrink-0">
                  <Link 
                    to="/menu" 
                    className="bg-white text-emerald-600 font-display text-2xl px-10 py-5 rounded-full shadow-2xl hover:shadow-3xl transition-all flex items-center gap-3"
                  >
                    <span className="text-3xl">🍕</span>
                    Sipariş Ver
                    <motion.span
                      animate={{ x: [0, 5, 0] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                    >
                      →
                    </motion.span>
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
          <div className="relative bg-diner-chocolate rounded-diner-lg p-8 md:p-12 text-center overflow-hidden">
            {/* Checkered decoration */}
            <div className="absolute top-0 left-0 w-full h-4 checkered opacity-50" />
            <div className="absolute bottom-0 left-0 w-full h-4 checkered opacity-50" />
            
            {/* Content */}
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              className="text-6xl mb-6"
            >
              🍕🍝🥪
            </motion.div>
            <h2 className="font-heading text-4xl md:text-5xl text-white mb-4">
              Acıktın mı?
            </h2>
            <p className="font-body text-xl text-diner-cream/80 mb-8 max-w-xl mx-auto">
              WhatsApp'tan hızlıca sipariş ver, kapına gelsin!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={`https://wa.me/${content.whatsapp.phone}?text=${encodeURIComponent(content.whatsapp.defaultMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-whatsapp text-xl"
              >
                <span>📱</span>
                WhatsApp Sipariş
              </a>
              <Link to="/menu" className="btn-secondary text-xl">
                <span>📋</span>
                Menüye Bak
              </Link>
            </div>
          </div>
        </RevealOnScroll>
      </SectionContainer>

    </main>
  )
}
