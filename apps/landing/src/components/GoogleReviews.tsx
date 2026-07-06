// Ana sayfada Google Yorumlar bölümü — yatay kaydırmalı carousel.
// Backend /api/google-reviews'dan veri çeker (5-yıldız + foto öncelikli).

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { RevealOnScroll } from './RevealOnScroll'
import { useContent } from '../lib/contentStore'

const API_BASE = import.meta.env.VITE_API_URL || ''

type Review = {
  authorName: string
  authorPhoto: string | null
  rating: number
  text: string
  relativeTime: string
  hasPhoto?: boolean
}

type ReviewsResponse = {
  rating: number
  totalRatings: number
  reviews: Review[]
  source: 'google' | 'curated'
}

const StarRow = ({ count, size = 16 }: { count: number; size?: number }) => (
  <div className="flex" style={{ gap: 1 }}>
    {Array.from({ length: 5 }).map((_, i) => (
      <svg
        key={i}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={i < count ? '#fbbf24' : '#e5e7eb'}
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ))}
  </div>
)

export const GoogleReviews = () => {
  const { content } = useContent()
  const [data, setData] = useState<ReviewsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const url = `${API_BASE}/api/google-reviews`
    fetch(url)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const cardWidth = el.querySelector('article')?.clientWidth ?? 320
    el.scrollBy({ left: dir === 'left' ? -(cardWidth + 20) : cardWidth + 20, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <section className="py-12 px-4">
        <div className="container-diner text-center text-foreground-muted">
          Yorumlar yükleniyor...
        </div>
      </section>
    )
  }
  if (!data || data.reviews.length === 0) return null

  return (
    <section className="py-16 px-4 bg-paper">
      <div className="container-diner">
        <RevealOnScroll>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-card mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-xs font-display font-extrabold uppercase tracking-widest text-foreground">
                {data.source === 'google' ? 'Google Yorumları' : 'Müşteri Yorumları'}
              </span>
            </div>

            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-3xl font-display font-extrabold text-foreground">
                {data.rating.toFixed(1)}
              </span>
              <StarRow count={Math.round(data.rating)} size={20} />
            </div>
            <p className="text-sm text-foreground-muted">
              {data.totalRatings > 0 ? `${data.totalRatings}+ değerlendirme` : 'Müşteri yorumları'}
            </p>
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground mt-4">
              Misafirlerimiz Ne Diyor?
            </h2>
          </div>
        </RevealOnScroll>

        {/* Yatay kaydırmalı yorum carousel */}
        <div className="relative">
          {/* Sol/sağ butonlar (desktop) */}
          <button
            onClick={() => scroll('left')}
            aria-label="Önceki yorumlar"
            className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white shadow-lg items-center justify-center hover:bg-gray-50 transition"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          <button
            onClick={() => scroll('right')}
            aria-label="Sonraki yorumlar"
            className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white shadow-lg items-center justify-center hover:bg-gray-50 transition"
          >
            <ChevronRight className="w-6 h-6 text-foreground" />
          </button>

          {/* Carousel container */}
          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {data.reviews.map((r, i) => (
              <motion.article
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-white rounded-3xl p-6 shadow-card hover:shadow-lg transition flex flex-col flex-shrink-0 snap-start"
                style={{ width: 'min(85vw, 360px)' }}
              >
                <div className="flex items-center gap-3 mb-3">
                  {r.authorPhoto ? (
                    <img
                      src={r.authorPhoto}
                      alt={r.authorName}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white font-display font-extrabold text-base"
                      style={{
                        background: `linear-gradient(135deg, hsl(${(r.authorName.charCodeAt(0) * 7) % 360}, 60%, 55%), hsl(${(r.authorName.charCodeAt(0) * 7 + 60) % 360}, 65%, 50%))`,
                      }}
                    >
                      {r.authorName.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-foreground truncate">
                      {r.authorName}
                    </div>
                    <div className="text-[11px] text-foreground-muted">{r.relativeTime}</div>
                  </div>
                  <StarRow count={r.rating} />
                </div>

                <p className="text-sm text-foreground leading-relaxed flex-1">
                  {r.text}
                </p>
              </motion.article>
            ))}
          </div>

          {/* CSS scrollbar gizleyici */}
          <style>{`
            .scrollbar-hide::-webkit-scrollbar { display: none; }
          `}</style>
        </div>

        {/* CTA — Google'da görüntüle (tenant kendi Google Maps linkini verdiyse) */}
        {data.source === 'google' && content.links?.googleMaps && (
          <RevealOnScroll>
            <div className="text-center mt-8">
              <a
                href={content.links.googleMaps}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary font-display font-bold hover:underline"
              >
                Tüm yorumları Google Maps'te gör →
              </a>
            </div>
          </RevealOnScroll>
        )}
      </div>
    </section>
  )
}
