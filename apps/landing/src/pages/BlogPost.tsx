// Tek bir blog yazısı sayfası — SEO meta + structured data + tam içerik

import { useEffect } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { useContent } from '../lib/contentStore'
import { SectionContainer } from '../components/SectionContainer'
import { HfPizza } from '../components/BrandIcons'

export const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>()
  const { content } = useContent()
  const posts = content.blog || []
  const siteName = content.site?.name || 'Blog'
  const domain = content.site?.domain
  const post = slug ? posts.find((p) => p.slug === slug) : undefined

  useEffect(() => {
    if (!post) return

    // SEO meta
    document.title = `${post.title} | ${siteName}`
    const updateMeta = (selector: string, content: string) => {
      const el = document.querySelector(selector)
      if (el) el.setAttribute('content', content)
    }
    updateMeta('meta[name="description"]', post.metaDescription)
    updateMeta('meta[property="og:title"]', post.title)
    updateMeta('meta[property="og:description"]', post.metaDescription)
    updateMeta('meta[property="og:type"]', 'article')

    // JSON-LD structured data (Article schema)
    const ldId = 'blog-post-jsonld'
    document.getElementById(ldId)?.remove()
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = ldId
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.metaDescription,
      datePublished: post.publishedAt,
      author: { '@type': 'Organization', name: siteName },
      publisher: {
        '@type': 'Organization',
        name: siteName,
        ...(domain
          ? {
              logo: {
                '@type': 'ImageObject',
                url: `https://${domain}/logo.svg`,
              },
            }
          : {}),
      },
      keywords: post.tags.join(', '),
      ...(domain
        ? {
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': `https://${domain}/blog/${post.slug}`,
            },
          }
        : {}),
    })
    document.head.appendChild(script)

    return () => {
      document.getElementById(ldId)?.remove()
    }
  }, [post, siteName, domain])

  if (!slug) return <Navigate to="/blog" replace />
  if (!post) return <Navigate to="/blog" replace />

  return (
    <main>
      {/* Hero — büyük gerçek fotoğraf, üzerinde başlık */}
      <header className="relative h-[60vh] min-h-[420px] overflow-hidden">
        <img
          src={post.coverImage}
          alt={post.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Gradient overlay — okunabilirlik */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/30" />

        <div className="absolute inset-0 flex items-end pb-12 px-4">
          <div className="container-diner relative z-10 text-center text-white w-full">
            <Link
              to="/blog"
              className="inline-flex items-center gap-1 text-white/90 hover:text-white text-sm mb-4 backdrop-blur-sm bg-white/10 px-3 py-1.5 rounded-full"
            >
              ← Tüm yazılar
            </Link>
            <div>
              <span className="inline-block bg-amber-400 text-foreground rounded-full px-4 py-1 text-xs font-display font-extrabold tracking-widest mb-3">
                {post.category}
              </span>
            </div>
            <h1 className="font-heading font-bold text-3xl md:text-5xl max-w-4xl mx-auto leading-tight mb-4 drop-shadow-2xl">
              {post.title}
            </h1>
            <div className="flex items-center justify-center gap-4 text-sm text-white/90 drop-shadow-lg">
              <time dateTime={post.publishedAt}>
                {new Date(post.publishedAt).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </time>
              <span>•</span>
              <span>{post.readMinutes} dk okuma</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <article className="py-12 px-4 bg-paper">
        <div
          className="container-diner max-w-3xl prose-blog"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Tags */}
        <div className="container-diner max-w-3xl mt-10">
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="bg-white border border-border-light rounded-full px-3 py-1 text-xs text-foreground-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* CTA at bottom */}
        <div className="container-diner max-w-3xl mt-12">
          <div
            className="rounded-3xl p-8 text-center text-white shadow-xl"
            style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
          >
            <div className="mb-3 flex justify-center text-amber-400"><HfPizza className="w-12 h-12" /></div>
            <h3 className="font-heading font-bold text-2xl mb-2">
              Acıktın mı?
            </h3>
            <p className="text-white/80 text-sm mb-5">
              {siteName} ile saniyeler içinde sipariş ver, üye ol, kazandıran kampanyaları kaçırma.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/menu"
                className="inline-block bg-white text-primary font-display font-extrabold px-8 py-3 rounded-full hover:scale-105 transition-transform"
              >
                Menüyü İncele
              </Link>
              <Link
                to="/app"
                className="inline-block bg-amber-400 text-foreground font-display font-extrabold px-8 py-3 rounded-full hover:scale-105 transition-transform"
              >
                Uygulamayı İndir
              </Link>
            </div>
          </div>
        </div>
      </article>

      {/* Related */}
      {posts.filter((p) => p.slug !== slug).length > 0 && (
      <SectionContainer variant="paper">
        <h2 className="font-heading font-bold text-2xl mb-6 text-center">
          Diğer Yazılar
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts
            .filter((p) => p.slug !== slug)
            .slice(0, 3)
            .map((p) => (
              <Link
                key={p.slug}
                to={`/blog/${p.slug}`}
                className="block bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-lg transition group"
              >
                <div className="h-32 relative overflow-hidden">
                  <img
                    src={p.coverImage}
                    alt={p.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-4">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-primary mb-1">
                    {p.category}
                  </div>
                  <h3 className="font-display font-bold text-foreground line-clamp-2">
                    {p.title}
                  </h3>
                </div>
              </Link>
            ))}
        </div>
      </SectionContainer>
      )}
    </main>
  )
}
