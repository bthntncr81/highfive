import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useContent,
  downloadContent,
  readContentFile,
} from '../lib/contentStore'
import type { Content, MenuItem, Category } from '../content/content.schema'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'highfive'

type Section =
  | 'site'
  | 'hero'
  | 'highlights'
  | 'menu'
  | 'about'
  | 'contact'
  | 'seo'
  | 'whatsapp'

const sections: { id: Section; label: string; icon: string }[] = [
  { id: 'site', label: 'Site Ayarları', icon: '⚙️' },
  { id: 'hero', label: 'Hero Alanı', icon: '🎯' },
  { id: 'highlights', label: 'Öne Çıkanlar', icon: '✨' },
  { id: 'menu', label: 'Menü Yönetimi', icon: '🍕' },
  { id: 'about', label: 'Hakkımızda', icon: '📖' },
  { id: 'contact', label: 'İletişim', icon: '📍' },
  { id: 'seo', label: 'SEO Ayarları', icon: '🔍' },
  { id: 'whatsapp', label: 'WhatsApp & Linkler', icon: '💬' },
]

export const Admin = () => {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [activeSection, setActiveSection] = useState<Section>('site')
  const [toast, setToast] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { content, updateContent, resetToDefault, setContentFromImport } =
    useContent()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true)
      setError('')
    } else {
      setError('Yanlış şifre!')
    }
  }

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  const handleExport = () => {
    downloadContent(content)
    showToast('JSON dosyası indirildi!')
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const imported = await readContentFile(file)
      setContentFromImport(imported)
      showToast('İçerik başarıyla yüklendi!')
    } catch {
      showToast('Hata: Geçersiz JSON dosyası!')
    }
    e.target.value = ''
  }

  const handleReset = () => {
    if (window.confirm('Tüm değişiklikler silinecek. Emin misiniz?')) {
      resetToDefault()
      showToast('Varsayılan içeriğe dönüldü!')
    }
  }

  // Update helpers
  const updateField = <K extends keyof Content>(
    section: K,
    field: keyof Content[K],
    value: unknown
  ) => {
    updateContent({
      ...content,
      [section]: {
        ...content[section],
        [field]: value,
      },
    })
  }

  // Login screen
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-diner-cream flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="card max-w-md w-full text-center"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-6xl mb-4"
          >
            🔐
          </motion.div>
          <h1 className="font-heading text-3xl text-diner-chocolate mb-2">
            Admin Paneli
          </h1>
          <p className="font-body text-diner-chocolate-light mb-6">
            Devam etmek için şifrenizi girin
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifre"
              className="input-diner text-center"
              autoFocus
            />
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-diner-red font-display text-sm"
              >
                {error}
              </motion.p>
            )}
            <button type="submit" className="btn-primary w-full">
              Giriş Yap
            </button>
          </form>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-diner-cream">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-diner-chocolate text-white px-6 py-3 rounded-diner shadow-diner-xl font-display"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-diner-chocolate text-white p-4 sticky top-0 z-40">
        <div className="container-diner flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-white/10 rounded-diner"
            >
              ☰
            </button>
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="High Five" className="h-12 w-auto" />
            <span className="font-heading text-xl md:text-2xl">Admin</span>
          </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="btn-secondary text-sm py-2">
              📤 Export
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary text-sm py-2"
            >
              📥 Import
            </button>
            <button onClick={handleReset} className="btn-outline text-sm py-2">
              🔄 Reset
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <AnimatePresence>
          {(sidebarOpen || window.innerWidth >= 1024) && (
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed lg:static top-[72px] left-0 bottom-0 w-64 bg-surface border-r-4 border-diner-kraft/30 p-4 z-30 overflow-y-auto"
            >
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveSection(section.id)
                      setSidebarOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-diner font-display text-left transition-all ${
                      activeSection === section.id
                        ? 'bg-diner-red text-white shadow-diner'
                        : 'text-diner-chocolate hover:bg-diner-cream-dark'
                    }`}
                  >
                    <span className="text-xl">{section.icon}</span>
                    {section.label}
                  </button>
                ))}
              </nav>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-8 lg:ml-0">
          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="card"
              >
                {activeSection === 'site' && (
                  <SiteSection content={content} updateField={updateField} />
                )}
                {activeSection === 'hero' && (
                  <HeroSection content={content} updateField={updateField} />
                )}
                {activeSection === 'highlights' && (
                  <HighlightsSection content={content} updateContent={updateContent} />
                )}
                {activeSection === 'menu' && (
                  <MenuSection content={content} updateContent={updateContent} />
                )}
                {activeSection === 'about' && (
                  <AboutSection content={content} updateField={updateField} />
                )}
                {activeSection === 'contact' && (
                  <ContactSection content={content} updateField={updateField} />
                )}
                {activeSection === 'seo' && (
                  <SeoSection content={content} updateField={updateField} />
                )}
                {activeSection === 'whatsapp' && (
                  <WhatsAppSection content={content} updateField={updateField} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}

// Form field component
const FormField = ({
  label,
  children,
  required = false,
}: {
  label: string
  children: React.ReactNode
  required?: boolean
}) => (
  <div className="space-y-2">
    <label className="font-display text-diner-chocolate flex items-center gap-2">
      {label}
      {required && <span className="text-diner-red">*</span>}
    </label>
    {children}
  </div>
)

// Section components
const SiteSection = ({
  content,
  updateField,
}: {
  content: Content
  updateField: <K extends keyof Content>(section: K, field: keyof Content[K], value: unknown) => void
}) => (
  <div className="space-y-6">
    <h2 className="font-heading text-2xl text-diner-chocolate mb-6">⚙️ Site Ayarları</h2>
    <FormField label="Site Adı" required>
      <input
        type="text"
        value={content.site.name}
        onChange={(e) => updateField('site', 'name', e.target.value)}
        className="input-diner"
      />
    </FormField>
    <FormField label="Logo Metni" required>
      <input
        type="text"
        value={content.site.logoText}
        onChange={(e) => updateField('site', 'logoText', e.target.value)}
        className="input-diner"
      />
    </FormField>
    <FormField label="Slogan">
      <input
        type="text"
        value={content.site.tagline}
        onChange={(e) => updateField('site', 'tagline', e.target.value)}
        className="input-diner"
      />
    </FormField>
    <FormField label="Açıklama">
      <textarea
        value={content.site.description}
        onChange={(e) => updateField('site', 'description', e.target.value)}
        rows={3}
        className="input-diner"
      />
    </FormField>
  </div>
)

const HeroSection = ({
  content,
  updateField,
}: {
  content: Content
  updateField: <K extends keyof Content>(section: K, field: keyof Content[K], value: unknown) => void
}) => (
  <div className="space-y-6">
    <h2 className="font-heading text-2xl text-diner-chocolate mb-6">🎯 Hero Alanı</h2>
    <FormField label="Ana Başlık" required>
      <input
        type="text"
        value={content.hero.headline}
        onChange={(e) => updateField('hero', 'headline', e.target.value)}
        className="input-diner"
      />
    </FormField>
    <FormField label="Alt Başlık">
      <textarea
        value={content.hero.subheadline}
        onChange={(e) => updateField('hero', 'subheadline', e.target.value)}
        rows={2}
        className="input-diner"
      />
    </FormField>
  </div>
)

const HighlightsSection = ({
  content,
  updateContent,
}: {
  content: Content
  updateContent: (c: Content) => void
}) => {
  const updateHighlight = (index: number, field: string, value: string) => {
    const newHighlights = [...content.highlights]
    newHighlights[index] = { ...newHighlights[index], [field]: value }
    updateContent({ ...content, highlights: newHighlights })
  }

  const addHighlight = () => {
    updateContent({
      ...content,
      highlights: [...content.highlights, { title: '', desc: '', icon: '⭐' }],
    })
  }

  const removeHighlight = (index: number) => {
    updateContent({
      ...content,
      highlights: content.highlights.filter((_, i) => i !== index),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-2xl text-diner-chocolate">✨ Öne Çıkanlar</h2>
        <button onClick={addHighlight} className="btn-secondary text-sm">
          + Ekle
        </button>
      </div>
      {content.highlights.map((h, i) => (
        <div key={i} className="p-4 bg-diner-cream-dark rounded-diner space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-display text-diner-chocolate">#{i + 1}</span>
            <button
              onClick={() => removeHighlight(i)}
              className="text-diner-red hover:underline text-sm font-display"
            >
              Sil
            </button>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <FormField label="İkon">
              <input
                type="text"
                value={h.icon}
                onChange={(e) => updateHighlight(i, 'icon', e.target.value)}
                className="input-diner"
              />
            </FormField>
            <FormField label="Başlık">
              <input
                type="text"
                value={h.title}
                onChange={(e) => updateHighlight(i, 'title', e.target.value)}
                className="input-diner"
              />
            </FormField>
            <FormField label="Açıklama">
              <input
                type="text"
                value={h.desc}
                onChange={(e) => updateHighlight(i, 'desc', e.target.value)}
                className="input-diner"
              />
            </FormField>
          </div>
        </div>
      ))}
    </div>
  )
}

const MenuSection = ({
  content,
  updateContent,
}: {
  content: Content
  updateContent: (c: Content) => void
}) => {
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const addCategory = () => {
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: 'Yeni Kategori',
      icon: '🍽️',
    }
    updateContent({
      ...content,
      menu: {
        ...content.menu,
        categories: [...content.menu.categories, newCat],
      },
    })
  }

  const updateCategory = (cat: Category) => {
    updateContent({
      ...content,
      menu: {
        ...content.menu,
        categories: content.menu.categories.map((c) =>
          c.id === cat.id ? cat : c
        ),
      },
    })
    setEditingCategory(null)
  }

  const deleteCategory = (id: string) => {
    if (!window.confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) return
    updateContent({
      ...content,
      menu: {
        ...content.menu,
        categories: content.menu.categories.filter((c) => c.id !== id),
        items: content.menu.items.filter((i) => i.category !== id),
      },
    })
  }

  const addItem = () => {
    const newItem: MenuItem = {
      id: `item-${Date.now()}`,
      category: content.menu.categories[0]?.id || '',
      name: 'Yeni Ürün',
      desc: '',
      price: 0,
      image: '/placeholders/pizza-1.svg',
      badges: [],
    }
    setEditingItem(newItem)
  }

  const saveItem = (item: MenuItem) => {
    const exists = content.menu.items.find((i) => i.id === item.id)
    updateContent({
      ...content,
      menu: {
        ...content.menu,
        items: exists
          ? content.menu.items.map((i) => (i.id === item.id ? item : i))
          : [...content.menu.items, item],
      },
    })
    setEditingItem(null)
  }

  const deleteItem = (id: string) => {
    if (!window.confirm('Bu ürünü silmek istediğinize emin misiniz?')) return
    updateContent({
      ...content,
      menu: {
        ...content.menu,
        items: content.menu.items.filter((i) => i.id !== id),
      },
    })
  }

  return (
    <div className="space-y-8">
      <h2 className="font-heading text-2xl text-diner-chocolate">🍕 Menü Yönetimi</h2>

      {/* Categories */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl text-diner-chocolate">Kategoriler</h3>
          <button onClick={addCategory} className="btn-secondary text-sm">
            + Kategori Ekle
          </button>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {content.menu.categories.map((cat) => (
            <div
              key={cat.id}
              className="p-4 bg-diner-cream-dark rounded-diner flex items-center justify-between"
            >
              {editingCategory?.id === cat.id ? (
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={editingCategory.icon}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, icon: e.target.value })
                    }
                    className="input-diner w-16"
                    placeholder="İkon"
                  />
                  <input
                    type="text"
                    value={editingCategory.name}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, name: e.target.value })
                    }
                    className="input-diner"
                    placeholder="İsim"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateCategory(editingCategory)}
                      className="btn-primary text-sm py-1"
                    >
                      Kaydet
                    </button>
                    <button
                      onClick={() => setEditingCategory(null)}
                      className="btn-outline text-sm py-1"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="font-display text-diner-chocolate">
                    {cat.icon} {cat.name}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingCategory(cat)}
                      className="text-diner-chocolate-light hover:text-diner-red"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      className="text-diner-chocolate-light hover:text-diner-red"
                    >
                      🗑️
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl text-diner-chocolate">Ürünler</h3>
          <button onClick={addItem} className="btn-secondary text-sm">
            + Ürün Ekle
          </button>
        </div>

        {/* Item editor modal */}
        <AnimatePresence>
          {editingItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setEditingItem(null)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="card max-w-lg w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="font-heading text-xl text-diner-chocolate mb-6">
                  {content.menu.items.find((i) => i.id === editingItem.id)
                    ? 'Ürün Düzenle'
                    : 'Yeni Ürün'}
                </h3>
                <div className="space-y-4">
                  <FormField label="Ürün Adı" required>
                    <input
                      type="text"
                      value={editingItem.name}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, name: e.target.value })
                      }
                      className="input-diner"
                    />
                  </FormField>
                  <FormField label="Kategori" required>
                    <select
                      value={editingItem.category}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, category: e.target.value })
                      }
                      className="input-diner"
                    >
                      {content.menu.categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Açıklama">
                    <textarea
                      value={editingItem.desc}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, desc: e.target.value })
                      }
                      rows={2}
                      className="input-diner"
                    />
                  </FormField>
                  <FormField label="Fiyat (₺)" required>
                    <input
                      type="number"
                      value={editingItem.price}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          price: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="input-diner"
                      min="0"
                      step="0.01"
                    />
                  </FormField>
                  <FormField label="Görsel URL">
                    <input
                      type="text"
                      value={editingItem.image}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, image: e.target.value })
                      }
                      className="input-diner"
                      placeholder="/placeholders/pizza-1.svg"
                    />
                  </FormField>
                  <FormField label="Etiketler (virgülle ayırın)">
                    <input
                      type="text"
                      value={editingItem.badges.join(', ')}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          badges: e.target.value
                            .split(',')
                            .map((b) => b.trim())
                            .filter(Boolean),
                        })
                      }
                      className="input-diner"
                      placeholder="Yeni, Popüler, Acılı"
                    />
                  </FormField>
                </div>
                <div className="flex gap-4 mt-6">
                  <button
                    onClick={() => saveItem(editingItem)}
                    className="btn-primary flex-1"
                  >
                    Kaydet
                  </button>
                  <button
                    onClick={() => setEditingItem(null)}
                    className="btn-outline flex-1"
                  >
                    İptal
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Items list */}
        <div className="space-y-4">
          {content.menu.items.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-diner-cream-dark rounded-diner flex items-center gap-4"
            >
              <img
                src={item.image}
                alt={item.name}
                className="w-16 h-16 object-cover rounded-diner"
              />
              <div className="flex-1 min-w-0">
                <div className="font-display text-diner-chocolate truncate">
                  {item.name}
                </div>
                <div className="text-sm text-diner-chocolate-light">
                  {content.menu.categories.find((c) => c.id === item.category)?.name} •{' '}
                  ₺{item.price}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingItem(item)}
                  className="text-diner-chocolate-light hover:text-diner-red text-xl"
                >
                  ✏️
                </button>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="text-diner-chocolate-light hover:text-diner-red text-xl"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const AboutSection = ({
  content,
  updateField,
}: {
  content: Content
  updateField: <K extends keyof Content>(section: K, field: keyof Content[K], value: unknown) => void
}) => {
  const updateParagraph = (index: number, value: string) => {
    const newParagraphs = [...content.about.storyParagraphs]
    newParagraphs[index] = value
    updateField('about', 'storyParagraphs', newParagraphs)
  }

  const addParagraph = () => {
    updateField('about', 'storyParagraphs', [...content.about.storyParagraphs, ''])
  }

  const removeParagraph = (index: number) => {
    updateField(
      'about',
      'storyParagraphs',
      content.about.storyParagraphs.filter((_, i) => i !== index)
    )
  }

  const updateGalleryImage = (index: number, value: string) => {
    const newImages = [...content.about.galleryImages]
    newImages[index] = value
    updateField('about', 'galleryImages', newImages)
  }

  const addGalleryImage = () => {
    updateField('about', 'galleryImages', [
      ...content.about.galleryImages,
      '/placeholders/gallery-1.svg',
    ])
  }

  const removeGalleryImage = (index: number) => {
    updateField(
      'about',
      'galleryImages',
      content.about.galleryImages.filter((_, i) => i !== index)
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl text-diner-chocolate mb-6">📖 Hakkımızda</h2>
      <FormField label="Hikaye Başlığı">
        <input
          type="text"
          value={content.about.storyTitle}
          onChange={(e) => updateField('about', 'storyTitle', e.target.value)}
          className="input-diner"
        />
      </FormField>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="font-display text-diner-chocolate">Hikaye Paragrafları</label>
          <button onClick={addParagraph} className="btn-secondary text-sm py-1">
            + Paragraf
          </button>
        </div>
        {content.about.storyParagraphs.map((p, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <textarea
              value={p}
              onChange={(e) => updateParagraph(i, e.target.value)}
              rows={2}
              className="input-diner flex-1"
            />
            <button
              onClick={() => removeParagraph(i)}
              className="text-diner-red hover:underline"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="font-display text-diner-chocolate">Galeri Görselleri</label>
          <button onClick={addGalleryImage} className="btn-secondary text-sm py-1">
            + Görsel
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {content.about.galleryImages.map((img, i) => (
            <div key={i} className="relative group">
              <img
                src={img}
                alt={`Gallery ${i + 1}`}
                className="w-full aspect-square object-cover rounded-diner"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-diner">
                <button
                  onClick={() => {
                    const url = prompt('Görsel URL:', img)
                    if (url) updateGalleryImage(i, url)
                  }}
                  className="text-white text-xl"
                >
                  ✏️
                </button>
                <button
                  onClick={() => removeGalleryImage(i)}
                  className="text-white text-xl"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const ContactSection = ({
  content,
  updateField,
}: {
  content: Content
  updateField: <K extends keyof Content>(section: K, field: keyof Content[K], value: unknown) => void
}) => {
  const updateHour = (index: number, field: string, value: string) => {
    const newHours = [...content.contact.hours]
    newHours[index] = { ...newHours[index], [field]: value }
    updateField('contact', 'hours', newHours)
  }

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl text-diner-chocolate mb-6">📍 İletişim</h2>
      <FormField label="Adres">
        <textarea
          value={content.contact.address}
          onChange={(e) => updateField('contact', 'address', e.target.value)}
          rows={2}
          className="input-diner"
        />
      </FormField>
      <FormField label="Google Maps Embed URL">
        <input
          type="text"
          value={content.contact.mapEmbedUrl}
          onChange={(e) => updateField('contact', 'mapEmbedUrl', e.target.value)}
          className="input-diner"
        />
      </FormField>

      <div>
        <label className="font-display text-diner-chocolate mb-2 block">
          Çalışma Saatleri
        </label>
        <div className="space-y-2">
          {content.contact.hours.map((h, i) => (
            <div key={i} className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={h.day}
                onChange={(e) => updateHour(i, 'day', e.target.value)}
                className="input-diner"
                placeholder="Gün"
              />
              <input
                type="text"
                value={h.open}
                onChange={(e) => updateHour(i, 'open', e.target.value)}
                className="input-diner"
                placeholder="Açılış"
              />
              <input
                type="text"
                value={h.close}
                onChange={(e) => updateHour(i, 'close', e.target.value)}
                className="input-diner"
                placeholder="Kapanış"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const SeoSection = ({
  content,
  updateField,
}: {
  content: Content
  updateField: <K extends keyof Content>(section: K, field: keyof Content[K], value: unknown) => void
}) => (
  <div className="space-y-6">
    <h2 className="font-heading text-2xl text-diner-chocolate mb-6">🔍 SEO Ayarları</h2>
    <FormField label="Sayfa Başlığı">
      <input
        type="text"
        value={content.seo.title}
        onChange={(e) => updateField('seo', 'title', e.target.value)}
        className="input-diner"
      />
    </FormField>
    <FormField label="Meta Açıklaması">
      <textarea
        value={content.seo.description}
        onChange={(e) => updateField('seo', 'description', e.target.value)}
        rows={3}
        className="input-diner"
      />
    </FormField>
    <FormField label="OG Image URL">
      <input
        type="text"
        value={content.seo.ogImage}
        onChange={(e) => updateField('seo', 'ogImage', e.target.value)}
        className="input-diner"
      />
    </FormField>
  </div>
)

const WhatsAppSection = ({
  content,
  updateField,
}: {
  content: Content
  updateField: <K extends keyof Content>(section: K, field: keyof Content[K], value: unknown) => void
}) => (
  <div className="space-y-6">
    <h2 className="font-heading text-2xl text-diner-chocolate mb-6">💬 WhatsApp & Linkler</h2>
    <FormField label="WhatsApp Telefon (uluslararası format)" required>
      <input
        type="text"
        value={content.whatsapp.phone}
        onChange={(e) => updateField('whatsapp', 'phone', e.target.value)}
        className="input-diner"
        placeholder="905551234567"
      />
    </FormField>
    <FormField label="Varsayılan Mesaj">
      <textarea
        value={content.whatsapp.defaultMessage}
        onChange={(e) => updateField('whatsapp', 'defaultMessage', e.target.value)}
        rows={2}
        className="input-diner"
      />
    </FormField>
    <FormField label="Telefon (görüntülenen)">
      <input
        type="text"
        value={content.links.phoneTel}
        onChange={(e) => updateField('links', 'phoneTel', e.target.value)}
        className="input-diner"
      />
    </FormField>
    <FormField label="Instagram URL">
      <input
        type="text"
        value={content.links.instagram}
        onChange={(e) => updateField('links', 'instagram', e.target.value)}
        className="input-diner"
      />
    </FormField>
    <FormField label="TikTok URL">
      <input
        type="text"
        value={content.links.tiktok}
        onChange={(e) => updateField('links', 'tiktok', e.target.value)}
        className="input-diner"
      />
    </FormField>
    <FormField label="Google Maps URL">
      <input
        type="text"
        value={content.links.googleMaps}
        onChange={(e) => updateField('links', 'googleMaps', e.target.value)}
        className="input-diner"
      />
    </FormField>
  </div>
)
