// Smashé landing içerik modeli + varsayılanlar. /smashe-admin editörü bu şemayı
// düzenler, PUT /api/settings/smasheContent ile kaydeder; landing açılışta
// GET /api/settings/smasheContent'i varsayılanların ÜSTÜNE bindirir.

const img = (id: string, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`

export interface SmasheMenuItem {
  name: string
  desc: string
  price: number
  tag: string
  photo: string
  alt: string
}

export interface SmasheContent {
  hero: { chip: string; h1a: string; h1b: string; p: string; photo: string; stickerA: string; stickerB: string }
  marquee: string[]
  menu: { title: string; items: SmasheMenuItem[] }
  steps: { title: string; note: string; items: { title: string; body: string }[]; photo: string }
  picnic: { title: string; p1: string; p2: string; photo: string }
  konum: { title: string; addr1: string; addr2: string; hours: { d: string; h: string }[]; mapsUrl: string; photo: string }
  footer: { instagram: string }
}

export const SMASHE_DEFAULTS: SmasheContent = {
  hero: {
    chip: 'Kadıköy, İstanbul',
    h1a: "Sacda smash'lenir,",
    h1b: 'kenarında çıtırlar.',
    p: "90 gramlık dana toplar 230 derece sacda smash'lenir. On saniyede kabuk, doksan saniyede paket. Smashé bu kadar.",
    photo: img('photo-1568901346375-23c9450c58cd', 1400),
    stickerA: '180g',
    stickerB: 'dana',
  },
  marquee: ["Elle smash'lenir", 'Günlük brioche', 'Çift cheddar', 'Kendi sosumuz', 'Çıtır kenar'],
  menu: {
    title: "En çok smash'lenenler",
    items: [
      {
        name: 'Klasik Smashé',
        desc: 'Çift smash köfte, iki kat eritme cheddar, turşu, çiğ soğan, Smashé sos.',
        price: 340,
        tag: 'Çok satan',
        photo: img('photo-1542574271-7f3b92e6c821', 900),
        alt: 'Klasik Smashé: çift köfte, iki kat cheddar, karamelize soğanla',
      },
      {
        name: 'Brisket Smashé',
        desc: 'Dana döş kırığı köfte, isli cheddar, karamelize soğan, hardallı mayo.',
        price: 420,
        tag: "Şefin smash'i",
        photo: img('photo-1553979459-d2229ba7433b', 900),
        alt: 'Brisket Smashé: üç katlı kule, döş kırığı ve isli cheddar',
      },
      {
        name: 'Trüflü Mantar',
        desc: 'Izgara portobello, trüf mayonez, rokfor krema, çıtır soğan.',
        price: 390,
        tag: 'Vejetaryen',
        photo: img('photo-1552526881-721ce8509abb', 900),
        alt: 'Trüflü Mantar: susamlı bun arasında portobello, açık fonda',
      },
    ],
  },
  steps: {
    title: 'Doksan saniyede sacdan pakete',
    note: 'Smash bir tarif değil, bir sıra. Sırayı bozmayız.',
    items: [
      { title: 'Topla', body: 'Dana döş her sabah kasaptan gelir, kendi çekeriz. 90 gramlık toplar, buz gibi bekler.' },
      { title: "Smash'le", body: '230 derece sacda 10 saniye tam baskı. Köfte inceldikçe yüzey büyür, yüzey büyüdükçe kabuk artar.' },
      { title: 'Kızart', body: 'Kenarlar dantel gibi çıtırlayınca cheddar kapanır, brioche sacdan geçer, paket 90 saniyede çıkar.' },
    ],
    photo: img('photo-1607013251379-e6eecfffe234', 1200),
  },
  picnic: {
    title: 'Masamız pöti kare, işimiz net',
    p1: 'Döşü her sabah kasaptan alır, kendimiz çekeriz. Brioche fırından günlük gelir, turşuyu kavanozda biz kurarız. Sos mu? Tarifi yok, alışkanlığı var.',
    p2: 'Masa örtüsü neden pöti kare diye soranlara: burger elle yenir, piknikte utanılmaz.',
    photo: img('photo-1594212699903-ec8a3eca50f5', 900),
  },
  konum: {
    title: "Kadıköy'deyiz",
    addr1: 'Caferağa Mahallesi, Moda Caddesi 61/A',
    addr2: 'Kadıköy, İstanbul',
    hours: [
      { d: 'Pazartesi · Perşembe', h: '11.30 · 23.00' },
      { d: 'Cuma · Cumartesi', h: '11.30 · 01.00' },
      { d: 'Pazar', h: '12.00 · 23.00' },
    ],
    mapsUrl: 'https://maps.google.com/?q=Moda+Caddesi+Kadıköy',
    photo: img('photo-1550547660-d9450f859349', 1200),
  },
  footer: { instagram: 'https://instagram.com/smashegang' },
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

// Derin birleştirme: nesneler recursive, diziler ve primitive'ler override.
export const mergeSmashe = (base: SmasheContent, over: unknown): SmasheContent => {
  const walk = (b: unknown, o: unknown): unknown => {
    if (o === undefined || o === null) return b
    if (Array.isArray(o)) return o
    if (isObj(b) && isObj(o)) {
      const out: Record<string, unknown> = { ...b }
      for (const k of Object.keys(o)) out[k] = walk(b[k], o[k])
      return out
    }
    return o
  }
  return walk(base, over) as SmasheContent
}
