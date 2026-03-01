import { motion } from 'framer-motion'
import { useContent } from '../lib/contentStore'
import { SectionContainer, SectionHeading } from '../components/SectionContainer'
import { RevealOnScroll, StaggerContainer, StaggerItem } from '../components/RevealOnScroll'

export const About = () => {
  const { content } = useContent()

  return (
    <main>
      {/* Page Header */}
      <SectionContainer variant="chocolate" className="py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <motion.img
            src="/logo-white.svg"
            alt="High Five"
            className="h-28 md:h-36 w-auto mx-auto mb-4"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
          />
          <h1 className="font-heading font-bold text-5xl md:text-6xl text-white mb-4">
            Hakkımızda
          </h1>
          <p className="font-body text-xl text-background/80 max-w-xl mx-auto">
            High Five hikayesi
          </p>
        </motion.div>
      </SectionContainer>

      {/* Story Section */}
      <SectionContainer variant="paper">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <RevealOnScroll direction="left">
            <div>
              <h2 className="font-heading font-bold text-4xl text-foreground mb-6">
                {content.about.storyTitle}
              </h2>
              <div className="space-y-4">
                {content.about.storyParagraphs.map((paragraph, index) => (
                  <p
                    key={index}
                    className="font-body text-lg text-foreground-muted leading-relaxed"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Values */}
              <div className="mt-8 flex flex-wrap gap-3">
                {['Taze Malzeme', 'El Yapımı', 'Hızlı Teslimat', 'Müşteri Memnuniyeti'].map((value, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="badge-popular"
                  >
                    {value}
                  </motion.span>
                ))}
              </div>
            </div>
          </RevealOnScroll>

          {/* Image / Illustration */}
          <RevealOnScroll direction="right">
            <motion.div
              whileHover={{ rotate: 2 }}
              className="relative"
            >
              <div className="card rounded-2xl p-8 text-center">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="text-8xl mb-4"
                >
                  🍕
                </motion.div>
                <div className="font-heading font-bold text-3xl text-foreground mb-2">
                  2018'den beri
                </div>
                <div className="font-body text-xl text-foreground-muted">
                  Lezzet yolculuğu
                </div>
              </div>
            </motion.div>
          </RevealOnScroll>
        </div>
      </SectionContainer>

      {/* The High Five Concept */}
      <SectionContainer variant="red">
        <SectionHeading
          title="High Five Farkı ✋"
          subtitle="Beş parmağımızla verdiğimiz söz"
          className="[&_h2]:text-white [&_p]:text-background/80"
        />

        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {[
            { finger: '👆', title: 'Kalite', desc: 'Birinci sınıf malzemeler' },
            { finger: '✌️', title: 'Lezzet', desc: 'Damak çatlatan tarifler' },
            { finger: '🤟', title: 'Hız', desc: 'Hızlı ve sıcak teslimat' },
            { finger: '🖖', title: 'Hijyen', desc: 'A sınıfı temizlik' },
            { finger: '🖐️', title: 'Sevgi', desc: 'Her lokmada özen' },
          ].map((item, index) => (
            <StaggerItem key={index}>
              <motion.div
                whileHover={{ y: -8, scale: 1.05 }}
                className="bg-white/10 backdrop-blur rounded-xl p-6 text-center"
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2, delay: index * 0.2 }}
                  className="text-4xl mb-3"
                >
                  {item.finger}
                </motion.div>
                <h3 className="font-display text-xl text-white mb-1">
                  {item.title}
                </h3>
                <p className="font-body text-sm text-background/70">
                  {item.desc}
                </p>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </SectionContainer>

      {/* Gallery */}
      <SectionContainer variant="cream">
        <SectionHeading
          title="Mutfağımızdan 📸"
          subtitle="Lezzetli anlarımız"
        />

        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {content.about.galleryImages.map((image, index) => (
            <StaggerItem key={index}>
              <motion.div
                whileHover={{ scale: 1.05, rotate: index % 2 === 0 ? 2 : -2 }}
                className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer"
              >
                <img
                  src={image}
                  alt={`Galeri ${index + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/20 transition-colors" />
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </SectionContainer>

      {/* Team / Quality Promise */}
      <SectionContainer variant="kraft">
        <RevealOnScroll>
          <div className="dark-section max-w-3xl mx-auto text-center">
            <h3 className="text-3xl mb-6">Kalite Sözümüz 🤝</h3>
            <p className="text-lg text-background/90 leading-relaxed mb-6">
              "Her gün taze malzemelerle, sevgiyle hazırlanan lezzetler...
              Müşterilerimize her zaman en iyisini sunmak için çalışıyoruz.
              High Five ailesi olarak, sizlere verdiğimiz bu sözü her lokmada tutuyoruz."
            </p>
            <div className="font-body text-accent text-2xl">
              - High Five Ekibi ✋
            </div>
          </div>
        </RevealOnScroll>
      </SectionContainer>
    </main>
  )
}
