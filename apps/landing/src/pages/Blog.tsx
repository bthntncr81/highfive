// Blog ana sayfa — tüm yazıların listesi (SEO için)
// /blog → liste, /blog/:slug → tek post

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useContent } from '../lib/contentStore'
import { SectionContainer, SectionHeading } from '../components/SectionContainer'

export const Blog = () => {
  const { content } = useContent()
  const posts = content.blog || []
  const siteName = content.site?.name || 'Blog'

  useEffect(() => {
    document.title = content.seo?.title || `Blog | ${siteName}`
    const meta = document.querySelector('meta[name="description"]')
    if (meta) meta.setAttribute('content', content.seo?.description || `${siteName} blog yazıları.`)
  }, [content.seo, siteName])

  return (
    <main>
      <SectionContainer variant="paper">
        <SectionHeading
          title={`${siteName} Blog`}
          subtitle="Yazılar, rehberler ve haberler"
        />

        {posts.length === 0 ? (
          <div className="mt-12 text-center text-foreground-muted">
            <div className="text-4xl mb-3">📝</div>
            <p className="font-heading font-bold text-xl text-foreground mb-1">
              Henüz blog yazısı yok
            </p>
            <p className="text-sm">Yakında burada olacağız — takipte kal.</p>
          </div>
        ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {posts.map((post, i) => (
            <motion.article
              key={post.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Link to={`/blog/${post.slug}`} className="block group h-full">
                <div className="h-full bg-white rounded-3xl overflow-hidden shadow-card hover:shadow-xl transition-shadow flex flex-col">
                  {/* Cover — gerçek foto + kategori chip + gradient overlay */}
                  <div className="h-48 relative overflow-hidden">
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${post.coverGradient} opacity-30 mix-blend-multiply`} />
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1 text-[10px] font-display font-extrabold tracking-wider text-foreground">
                      {post.category}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex-1 flex flex-col">
                    <h2 className="font-heading font-bold text-xl text-foreground mb-2 group-hover:text-primary transition-colors leading-snug">
                      {post.title}
                    </h2>
                    <p className="text-sm text-foreground-muted line-clamp-3 flex-1">
                      {post.excerpt}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-xs text-foreground-muted">
                      <time dateTime={post.publishedAt}>
                        {new Date(post.publishedAt).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </time>
                      <span>📖 {post.readMinutes} dk okuma</span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
        )}
      </SectionContainer>
    </main>
  )
}
