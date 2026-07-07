import type { FC } from 'react'
import type { MenuCardProps } from './useMenuCard'
import { Template01 } from './templates/Template01'
import { Template02 } from './templates/Template02'
import { Template03 } from './templates/Template03'
import { Template04 } from './templates/Template04'
import { Template05 } from './templates/Template05'
import { Template06 } from './templates/Template06'
import { Template07 } from './templates/Template07'
import { Template08 } from './templates/Template08'
import { Template09 } from './templates/Template09'
import { Template10 } from './templates/Template10'
import { Template11 } from './templates/Template11'
import { Template12 } from './templates/Template12'
import { Template13 } from './templates/Template13'
import { Template14 } from './templates/Template14'
import { Template15 } from './templates/Template15'
import { Template16 } from './templates/Template16'
import { Template17 } from './templates/Template17'
import { Template18 } from './templates/Template18'
import { Template19 } from './templates/Template19'
import { Template20 } from './templates/Template20'

// Menü şablonu tanımı: kart bileşeni + grid sarmalayıcı + bölüm arkaplanı.
// menuTemplate (1-20) POS'tan seçilir; Menu.tsx bu tanıma göre render eder.
export interface MenuTemplateDef {
  id: number
  name: string
  description: string
  Card: FC<MenuCardProps>
  gridClass: string // grid/list sarmalayıcı sınıfları
  surface: string // bölüm arkaplanı (Tailwind bg sınıfı)
  dark?: boolean // koyu zemin → sayfa başlığı/nav uyumu
}

export const MENU_TEMPLATES: MenuTemplateDef[] = [
  { id: 1, name: 'Klasik Kart', description: 'Görsel üstte, yuvarlak köşe, fiyat rozeti', Card: Template01, gridClass: 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3', surface: 'bg-background' },
  { id: 2, name: 'Dergi', description: 'Editöryel büyük kartlar, geniş boşluk', Card: Template02, gridClass: 'grid gap-8 md:grid-cols-2', surface: 'bg-surface' },
  { id: 3, name: 'Minimal Liste', description: 'Görselsiz, tipografi odaklı satırlar', Card: Template03, gridClass: 'max-w-3xl mx-auto flex flex-col divide-y divide-border', surface: 'bg-white' },
  { id: 4, name: 'Izgara Fotoğraf', description: 'Görsel baskın, overlay metin', Card: Template04, gridClass: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3', surface: 'bg-[#0f172a]', dark: true },
  { id: 5, name: 'Bistro', description: 'Kağıt hissi, kesik çizgi kenar', Card: Template05, gridClass: 'grid gap-6 md:grid-cols-2', surface: 'bg-surface' },
  { id: 6, name: 'Modern Bold', description: 'Keskin köşe, kalın tipografi', Card: Template06, gridClass: 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3', surface: 'bg-white' },
  { id: 7, name: 'Kompakt', description: 'Yoğun, küçük thumbnail satırlar', Card: Template07, gridClass: 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3', surface: 'bg-background' },
  { id: 8, name: 'Şık Serif', description: 'Fine-dining, ince çizgi, serif', Card: Template08, gridClass: 'grid gap-x-10 gap-y-6 md:grid-cols-2 max-w-4xl mx-auto', surface: 'bg-white' },
  { id: 9, name: 'Şerit Rozet', description: 'Köşe şeridi, neşeli yuvarlak', Card: Template09, gridClass: 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3', surface: 'bg-background' },
  { id: 10, name: 'Karanlık Neon', description: 'Koyu kart, neon parıltı', Card: Template10, gridClass: 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3', surface: 'bg-[#0f172a]', dark: true },
  { id: 11, name: 'Polaroid', description: 'Eğik fotoğraf çerçevesi, caption', Card: Template11, gridClass: 'grid gap-8 sm:grid-cols-2 lg:grid-cols-3', surface: 'bg-surface' },
  { id: 12, name: 'Fiş', description: 'Monospace, termal fiş estetiği', Card: Template12, gridClass: 'max-w-2xl mx-auto flex flex-col gap-1', surface: 'bg-white' },
  { id: 13, name: 'Cam', description: 'Glassmorphism, bulanık kartlar', Card: Template13, gridClass: 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3', surface: 'bg-[#0f172a]', dark: true },
  { id: 14, name: 'Yan Görsel', description: 'Yatay kart, solda görsel', Card: Template14, gridClass: 'grid gap-5 md:grid-cols-2', surface: 'bg-white' },
  { id: 15, name: 'Kabarcık', description: 'Aşırı yuvarlak, pastel, hap buton', Card: Template15, gridClass: 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3', surface: 'bg-background' },
  { id: 16, name: 'Geniş Izgara', description: 'Sıkı 4 sütun kompakt kartlar', Card: Template16, gridClass: 'grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4', surface: 'bg-white' },
  { id: 17, name: 'Fast-Food', description: 'Enerjik, iştah açıcı, büyük fiyat', Card: Template17, gridClass: 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3', surface: 'bg-white' },
  { id: 18, name: 'Kafe', description: 'Sıcak, yumuşak, butik kafe', Card: Template18, gridClass: 'grid gap-6 md:grid-cols-2', surface: 'bg-background' },
  { id: 19, name: 'Lüks', description: 'Siyah-beyaz, sessiz, sofistike', Card: Template19, gridClass: 'grid gap-x-12 gap-y-8 md:grid-cols-2 max-w-4xl mx-auto', surface: 'bg-[#0f172a]', dark: true },
  { id: 20, name: 'Tam Görsel', description: 'Full-bleed görsel, gradient overlay', Card: Template20, gridClass: 'grid gap-5 sm:grid-cols-2', surface: 'bg-[#0f172a]', dark: true },
]

export const getMenuTemplate = (n?: number): MenuTemplateDef => {
  const id = typeof n === 'number' && n >= 1 && n <= MENU_TEMPLATES.length ? n : 1
  return MENU_TEMPLATES[id - 1]
}
