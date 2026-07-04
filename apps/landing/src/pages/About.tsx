// Hakkımızda — misyon, vizyon, hikaye, ekip, değerler, iletişim.
// SEO için yapılandırılmış schema.org Organization data dahil.

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { HfTarget, HfStar, HfRollingPin, HfFlame, HfCheese, HfHeart, HfPin, HfPhone } from '../components/BrandIcons'

const GALLERY_PHOTOS = [
  '/gallery/MERT6934.jpg',
  '/gallery/MERT6953.jpg',
  '/gallery/MERT6946.jpg',
  '/gallery/MERT6943.jpg',
  '/gallery/MERT6835.jpg',
  '/gallery/MERT6883.jpg',
]

function GalleryCarousel() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % GALLERY_PHOTOS.length)
    }, 4500)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="relative">
      <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl bg-gray-100 relative">
        <AnimatePresence mode="wait">
          <motion.img
            key={index}
            src={GALLERY_PHOTOS[index]}
            alt={`HighFive Akçakoca ${index + 1}`}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.7 }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </AnimatePresence>

        {/* Dots */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
          {GALLERY_PHOTOS.map((_, i) => (
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

        {/* Prev/Next arrows */}
        <button
          onClick={() => setIndex((i) => (i - 1 + GALLERY_PHOTOS.length) % GALLERY_PHOTOS.length)}
          aria-label="Önceki foto"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 hover:bg-white shadow-lg flex items-center justify-center text-foreground z-10"
        >
          ←
        </button>
        <button
          onClick={() => setIndex((i) => (i + 1) % GALLERY_PHOTOS.length)}
          aria-label="Sonraki foto"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 hover:bg-white shadow-lg flex items-center justify-center text-foreground z-10"
        >
          →
        </button>
      </div>

      {/* Açılış chip */}
      <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl p-4 shadow-xl">
        <div className="text-xs uppercase tracking-wider text-foreground-muted">
          Açılış
        </div>
        <div className="text-2xl font-display font-extrabold text-primary">
          Mart 2026
        </div>
      </div>
    </div>
  )
}

export const About = () => {
  useEffect(() => {
    document.title = 'Hakkımızda | HighFive Pizza & Makarna — Akçakoca, Düzce'
    const meta = document.querySelector('meta[name="description"]')
    if (meta)
      meta.setAttribute(
        'content',
        'HighFive Pizza & Makarna — Akçakoca\'nın taş fırın İtalyan lezzet noktası. Misyonumuz, vizyonumuz, hikayemiz ve mutfak felsefemiz.',
      )

    // JSON-LD Organization schema
    const ldId = 'about-jsonld'
    document.getElementById(ldId)?.remove()
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = ldId
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      name: 'HighFive Pizza & Makarna',
      description:
        'Akçakoca, Düzce\'de taş fırın İtalyan pizzaları, el yapımı makarna ve premium İtalyan sandviçleri sunan restoran.',
      url: 'https://highfivepps.com',
      logo: 'https://highfivepps.com/logo.svg',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Cumhuriyet Mahallesi, İstanbul Caddesi No 151/1',
        addressLocality: 'Akçakoca',
        addressRegion: 'Düzce',
        addressCountry: 'TR',
      },
      telephone: '+90 555 243 81 81',
      servesCuisine: ['İtalyan', 'Pizza', 'Makarna', 'Sandviç'],
      priceRange: '₺₺',
      acceptsReservations: 'True',
      foundingDate: '2026-03',
      founder: [
        { '@type': 'Person', name: 'Orhan Geçtim' },
        { '@type': 'Person', name: 'Ömer Batuhan Tunçer' },
      ],
    })
    document.head.appendChild(script)

    return () => {
      document.getElementById(ldId)?.remove()
    }
  }, [])

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
          <img src="/logo-white.svg" alt="HighFive" className="h-32 mx-auto mb-4" />
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-display font-extrabold tracking-widest mb-3" style={{ backgroundColor: '#fbbf24', color: '#0f172a' }}>
            HİKAYEMİZ
          </span>
          <h1 className="font-heading font-bold text-4xl md:text-6xl">
            HighFive'ın Hikayesi
          </h1>
          <p className="font-body text-lg text-white/80 max-w-2xl mx-auto mt-4 px-4">
            Akçakoca'nın küçük bir köşesinden başlayan, taş fırından yükselen bir İtalyan lezzeti yolculuğu
          </p>
        </motion.div>
      </section>

      {/* Hikaye */}
      <section className="py-16 px-4">
        <div className="container-diner max-w-4xl">
          <div className="grid md:grid-cols-2 gap-10 items-center mb-16">
            <div>
              <span className="text-xs font-display font-extrabold uppercase tracking-widest text-primary mb-2 block">
                Hikayemiz
              </span>
              <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground mb-4">
                Akçakoca'da Samimi Bir İtalyan Lezzeti
              </h2>
              <p className="text-foreground-muted leading-relaxed mb-4">
                Mart 2026'da Akçakoca'nın kalbinde küçük bir mutfak kurduk. Aklımızda tek bir şey
                vardı: İtalya'nın gerçek tatlarını, sevdiğimiz titizlikle, mütevazı bir masada
                paylaşmak. <strong>San Marzano domatesi</strong>, <strong>mozzarella di bufala</strong>,
                taze fesleğen, kendi yoğurduğumuz Tip "00" hamur — küçük detaylar, büyük fark.
              </p>
              <p className="text-foreground-muted leading-relaxed mb-4">
                Her hamuru kendi ellerimizle yoğuruyoruz, her sosu kendi mutfağımızda pişiriyoruz,
                her pizzayı taş fırınımızda <strong>450 derecede dakikalar içinde</strong>
                {' '}buluşturuyoruz. Çünkü inanıyoruz ki iyi yemek aceleye gelmez — sabırla
                hazırlanan, gönülden gelen lezzettir.
              </p>
              <p className="text-foreground-muted leading-relaxed">
                Bugün Akçakoca'da yaşayanları; Düzce, Bolu, Sakarya'dan, hatta İstanbul ve
                Ankara'dan hafta sonu kaçamağına gelen misafirleri ağırlama şansını yakaladık.
                Sofranızda bir gülümseme bırakabildiysek ne mutlu bize. Her tabakta emeğimiz var,
                her lokmada hikayemiz.
              </p>
            </div>
            <div className="relative">
              <GalleryCarousel />
            </div>
          </div>
        </div>
      </section>

      {/* Misyon & Vizyon */}
      <section className="py-16 px-4 bg-cream">
        <div className="container-diner max-w-5xl">
          <div className="grid md:grid-cols-2 gap-6">
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
                Misyonumuz
              </h3>
              <p className="text-foreground-muted leading-relaxed">
                Akçakoca, Düzce ve çevre illerin sakinlerine ve ziyaretçilerine; geleneksel İtalyan
                mutfağının en iyi örneklerini, taze, kaliteli malzemelerle, taş fırın ustalığıyla,
                makul fiyatlarla sunmak. Her sipariş, her tabak ve her müşteri etkileşiminde
                <strong> kalite, dürüstlük ve içtenliği</strong> önceliklendirmek.
              </p>
            </motion.div>

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
                Vizyonumuz
              </h3>
              <p className="text-foreground-muted leading-relaxed">
                Karadeniz Bölgesi'nde "İtalyan mutfağı" denildiğinde ilk akla gelen marka olmak.
                Akçakoca'nın küçük bir restoranından başlayıp, gerçek lezzeti hak eden herkese
                ulaşan, müşterilerimizi <strong>misafir gibi</strong>, ekibimizi <strong>aile gibi</strong>
                gören bir kültür inşa etmek.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Değerlerimiz */}
      <section className="py-16 px-4">
        <div className="container-diner max-w-5xl">
          <div className="text-center mb-10">
            <span className="text-xs font-display font-extrabold uppercase tracking-widest text-primary mb-2 block">
              NEDEN HIGHFIVE?
            </span>
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground">
              Değerlerimiz
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                Icon: HfRollingPin,
                title: 'Taze Hamur',
                desc: 'Her gün taze yoğrulan, en az 72 saat soğuk fermantasyona bırakılan İtalyan stili hamur',
              },
              {
                Icon: HfFlame,
                title: 'Taş Fırın',
                desc: 'Geleneksel taş fırınımızda 450°C\'de dakikalar içinde pişen pizza ve sandviçler',
              },
              {
                Icon: HfCheese,
                title: 'Premium İtalyan',
                desc: 'San Marzano domatesi, suda mozzarella, taze fesleğen — kompromise yok',
              },
              {
                Icon: HfHeart,
                title: 'Yerel Aile',
                desc: 'Akçakoca\'da, ailecek işletilen bir restoran — her sipariş bir misafirperverlik',
              },
            ].map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl p-5 shadow-card text-center"
              >
                <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><v.Icon className="w-7 h-7" /></div>
                <h3 className="font-display font-bold text-base text-foreground mb-1">
                  {v.title}
                </h3>
                <p className="text-xs text-foreground-muted leading-snug">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mutfak Felsefesi (kısa) */}
      <section className="py-16 px-4 bg-cream">
        <div className="container-diner max-w-3xl text-center">
          <span className="text-xs font-display font-extrabold uppercase tracking-widest text-primary mb-2 block">
            MUTFAK FELSEFEMİZ
          </span>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground mb-6">
            "İyi yemek hızlı değil, doğru zamanlı yemektir"
          </h2>
          <p className="text-lg text-foreground-muted leading-relaxed mb-6">
            Napoli geleneğinden ilhamla, hamuru 72 saat dinlendiren, San Marzano domatesi seçen,
            taş fırını 450°C'de tutan ve müşterisine "hızlı bitsin" değil "doğru gelsin" diyen
            bir restoranız.
          </p>
          <Link
            to="/blog/napoli-pizzasinin-farki-mutfak-felsefemiz"
            className="inline-flex items-center gap-1 text-primary font-display font-bold text-lg hover:underline"
          >
            Mutfak felsefemizi okuyun →
          </Link>
        </div>
      </section>

      {/* Ekip / Kurucular */}
      <section className="py-16 px-4">
        <div className="container-diner max-w-4xl">
          <div className="text-center mb-10">
            <span className="text-xs font-display font-extrabold uppercase tracking-widest text-primary mb-2 block">
              KURUCULARIMIZ
            </span>
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground">
              HighFive'ın Arkasındaki İsimler
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-6 shadow-card text-center">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary to-red-700 flex items-center justify-center text-white text-3xl font-display font-extrabold mb-4">
                OG
              </div>
              <h3 className="font-display font-bold text-xl text-foreground">
                Orhan Geçtim
              </h3>
              <div className="text-xs uppercase tracking-wider text-primary font-bold mt-1">
                Kurucu Ortak
              </div>
            </div>
            <div className="bg-white rounded-3xl p-6 shadow-card text-center">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-3xl font-display font-extrabold mb-4">
                ÖT
              </div>
              <h3 className="font-display font-bold text-xl text-foreground">
                Ömer Batuhan Tunçer
              </h3>
              <div className="text-xs uppercase tracking-wider text-primary font-bold mt-1">
                Kurucu Ortak
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* İletişim */}
      <section className="py-16 px-4 bg-cream">
        <div className="container-diner max-w-3xl">
          <div className="bg-white rounded-3xl p-8 shadow-card">
            <div className="text-center mb-6">
              <h3 className="font-heading font-bold text-2xl text-foreground mb-2">
                Bize Ulaş
              </h3>
              <p className="text-sm text-foreground-muted">
                Akçakoca'da bizi ziyaret et, telefonla ara, ya da WhatsApp'tan yaz
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="text-primary mt-0.5"><HfPin className="w-6 h-6" /></div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-foreground-muted">
                    Adres
                  </div>
                  <div className="font-display font-bold text-foreground">
                    Cumhuriyet Mah. İstanbul Cad. No 151/1
                  </div>
                  <div className="text-sm text-foreground-muted">Akçakoca, Düzce</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-primary mt-0.5"><HfPhone className="w-6 h-6" /></div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-foreground-muted">
                    Telefon
                  </div>
                  <a
                    href="tel:+905552438181"
                    className="font-display font-bold text-foreground hover:text-primary"
                  >
                    0555 243 81 81
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
