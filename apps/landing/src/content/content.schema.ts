export type Highlight = {
  title: string
  desc: string
  icon: string
}

export type Category = {
  id: string
  name: string
  icon: string
}

export type MenuItem = {
  id: string
  category: string
  name: string
  desc: string
  price: number
  image: string
  badges: string[]
}

export type MenuContent = {
  categories: Category[]
  items: MenuItem[]
}

export type AboutValue = {
  icon: string
  title: string
  desc: string
}

export type Founder = {
  initials: string
  name: string
  role: string
}

export type AboutContent = {
  storyTitle: string
  storyParagraphs: string[]
  galleryImages: string[]
  // Zengin "Hakkımızda" alanları (hepsi opsiyonel — yoksa varsayılana düşer)
  heroEyebrow?: string
  heroTitle?: string
  heroSubtitle?: string
  missionTitle?: string
  mission?: string
  visionTitle?: string
  vision?: string
  valuesTitle?: string
  values?: AboutValue[]
  philosophyTitle?: string
  philosophyQuote?: string
  philosophyBody?: string
  foundersTitle?: string
  founders?: Founder[]
  openingDate?: string
}

export type BlogPost = {
  slug: string
  title: string
  metaDescription: string
  excerpt: string
  publishedAt: string
  readMinutes: number
  category: string
  coverImage: string
  coverEmoji: string
  coverGradient: string
  tags: string[]
  content: string // HTML (dangerouslySetInnerHTML ile render)
}

export type GameContent = {
  enabled: boolean
  title?: string // "Pizza Şefi"
  brandLabel?: string // HUD marka etiketi
  mark?: string // logo işareti (ör. "5")
}

export type ContactHours = {
  day: string
  open: string
  close: string
}

export type ContactContent = {
  address: string
  hours: ContactHours[]
  mapEmbedUrl: string
}

export type Content = {
  site: {
    name: string
    tagline: string
    description: string
    logoText: string
    primaryColor: string
    accentColor: string
    domain?: string // JSON-LD url/logo için (ör. "testwa.otorder.com")
    appStoreUrl?: string // markalı mobil app (Kurumsal paket) — boşsa indirme bölümü gizlenir
    playStoreUrl?: string
    appLandingUrl?: string
  }
  whatsapp: {
    phone: string
    defaultMessage: string
  }
  links: {
    instagram: string
    tiktok: string
    googleMaps: string
    phoneTel: string
  }
  hero: {
    headline: string
    subheadline: string
    heroImages: string[]
  }
  highlights: Highlight[]
  menu: MenuContent
  about: AboutContent
  contact: ContactContent
  blog?: BlogPost[]
  game?: GameContent
  seo: {
    title: string
    description: string
    ogImage: string
  }
}

