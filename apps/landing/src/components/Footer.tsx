import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useContent } from '../lib/contentStore'

export const Footer = () => {
  const { content } = useContent()

  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative bg-diner-chocolate text-diner-cream overflow-hidden">
      {/* Checkered top border */}
      <div className="h-4 checkered" />
      
      {/* Main footer content */}
      <div className="container-diner py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="inline-block mb-6 group">
              <motion.img 
                src="/logow.png"
                alt={content.site.logoText}
                className="h-24 w-auto drop-shadow-lg"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              />
            </Link>
            <p className="font-body text-diner-cream/80 mb-6 max-w-xs">
              {content.site.tagline}
            </p>
            {/* Social Links */}
            <div className="flex gap-3">
              {content.links.instagram && (
                <a
                  href={content.links.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 flex items-center justify-center bg-diner-chocolate-light rounded-diner text-2xl hover:bg-diner-mustard hover:text-diner-chocolate transition-colors"
                  aria-label="Instagram"
                >
                  📸
                </a>
              )}
              {content.links.tiktok && (
                <a
                  href={content.links.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 flex items-center justify-center bg-diner-chocolate-light rounded-diner text-2xl hover:bg-diner-mustard hover:text-diner-chocolate transition-colors"
                  aria-label="TikTok"
                >
                  🎵
                </a>
              )}
              <a
                href={`https://wa.me/${content.whatsapp.phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 flex items-center justify-center bg-diner-chocolate-light rounded-diner text-2xl hover:bg-green-500 transition-colors"
                aria-label="WhatsApp"
              >
                💬
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display text-xl text-diner-mustard mb-6">
              Keşfet
            </h4>
            <ul className="space-y-3">
              {[
                { to: '/', label: 'Ana Sayfa' },
                { to: '/menu', label: 'Menü' },
                { to: '/about', label: 'Hakkımızda' },
                { to: '/contact', label: 'İletişim' },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="font-body text-diner-cream/80 hover:text-diner-mustard transition-colors inline-flex items-center gap-2 group"
                  >
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Menu Categories */}
          <div>
            <h4 className="font-display text-xl text-diner-mustard mb-6">
              Menümüz
            </h4>
            <ul className="space-y-3">
              {content.menu.categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    to={`/menu?category=${cat.id}`}
                    className="font-body text-diner-cream/80 hover:text-diner-mustard transition-colors inline-flex items-center gap-2"
                  >
                    <span>{cat.icon}</span>
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-display text-xl text-diner-mustard mb-6">
              İletişim
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="text-xl">📍</span>
                <span className="font-body text-diner-cream/80 text-sm">
                  {content.contact.address}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-xl">📞</span>
                <a
                  href={`tel:${content.links.phoneTel}`}
                  className="font-body text-diner-cream/80 hover:text-diner-mustard transition-colors"
                >
                  {content.links.phoneTel}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-xl">🕐</span>
                <div className="font-body text-diner-cream/80 text-sm">
                  {content.contact.hours.slice(0, 2).map((h, i) => (
                    <div key={i}>
                      {h.day}: {h.open} - {h.close}
                    </div>
                  ))}
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="diner-divider opacity-30" />

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-center">
          <p className="font-body text-diner-cream/60 text-sm">
            © {currentYear} {content.site.name}. Tüm hakları saklıdır.
          </p>
          <p className="font-hand text-diner-mustard text-lg">
            ❤️ ile yapıldı
          </p>
        </div>
      </div>

      {/* Decorative corner */}
      <div className="absolute bottom-0 right-0 w-32 h-32 opacity-10">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <text x="50" y="60" textAnchor="middle" fontSize="60" fill="currentColor">🍕</text>
        </svg>
      </div>
    </footer>
  )
}
