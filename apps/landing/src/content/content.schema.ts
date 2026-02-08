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

export type AboutContent = {
  storyTitle: string
  storyParagraphs: string[]
  galleryImages: string[]
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
  seo: {
    title: string
    description: string
    ogImage: string
  }
}

