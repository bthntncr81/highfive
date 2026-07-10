import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useCart } from '../lib/cartStore'
import { useLoyalty } from '../lib/loyaltyStore'
import { useSettings } from '../hooks/useSettings'
import { orderApi, imageUrl, type Category, type MenuItem as APIMenuItem } from '../lib/api'

// ─────────────────────────────────────────────────────────────────────
// MAK-TI — premium hand-coded tenant landing (customLanding: "makti").
//
// Design read: Kdz. Ereğli pasta & mantı house, "AUTHENTİC ITALİAN PASTA".
// MIDNIGHT TRATTORIA: page drenched in the brand's deep forest green
// (#081C15, sampled from maktimenu.com), fresh mint/basil price accents,
// a thin Italian tricolor line as recurring signature detail, and one warm
// parchment panel for the handmade Anatolian mantı counterpoint.
// Open till 03:00 → the identity leans into "late night pasta".
// Type: Fraunces (Italian editorial display, real italics) + Manrope body.
//
// Motion: NO framer-motion. Hero enters with load keyframes ('both' fill);
// scroll sections use IntersectionObserver + [data-reveal] — hidden state is
// only applied once JS adds the .mkt-js class, so content is always visible
// without JS. Marquee is a pure CSS keyframe loop.
// Icons: single-color inline SVG only (24 viewBox, stroke 1.8) — no emoji.
// ─────────────────────────────────────────────────────────────────────

const NIGHT = '#081C15' // page ground — brand's menu-site background
const PINE = '#14471D' // logo green (sampled from the badge)
const BASIL = '#34B35B' // fresh green — buttons, links
const MINT = '#7FE3A8' // light mint — prices, highlights
const CREAM = '#F2F4EC' // foam white copy
const PARCHMENT = '#F4EAD8' // warm panel for the mantı world
const TERRA = '#B4552D' // terracotta accent on the warm panel
const INK = '#2A1B10' // dark copy on parchment

// Thin Italian tricolor line — the brand badge carries the same stripe.
const TRICOLOR =
  'linear-gradient(90deg, #2F9E44 0%, #2F9E44 33.4%, #F4F1E8 33.4%, #F4F1E8 66.7%, #C93B2E 66.7%, #C93B2E 100%)'

// ── Single-color inline icons (24×24, stroke 1.8, currentColor) ──────
const ico = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

type IconProps = { className?: string; style?: React.CSSProperties }

const IconClock = ({ className = '', style }: IconProps) => (
  <svg {...ico} className={className} style={style} aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3.2 1.9" />
  </svg>
)

const IconMoon = ({ className = '', style }: IconProps) => (
  <svg {...ico} className={className} style={style} aria-hidden="true">
    <path d="M20 13.6A8.6 8.6 0 1 1 10.4 4a6.8 6.8 0 0 0 9.6 9.6Z" />
  </svg>
)

const IconPin = ({ className = '', style }: IconProps) => (
  <svg {...ico} className={className} style={style} aria-hidden="true">
    <path d="M12 21s-7-5.4-7-11a7 7 0 0 1 14 0c0 5.6-7 11-7 11Z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
)

const IconFork = ({ className = '', style }: IconProps) => (
  <svg {...ico} className={className} style={style} aria-hidden="true">
    <path d="M8 3v5a4 4 0 0 0 8 0V3" />
    <path d="M12 3v18" />
  </svg>
)

const IconBowl = ({ className = '', style }: IconProps) => (
  <svg {...ico} className={className} style={style} aria-hidden="true">
    <path d="M4 13h16a8 8 0 0 1-16 0Z" />
    <path d="M9 9c0-1.6 1.2-1.6 1.2-3.2" />
    <path d="M14 9c0-1.6 1.2-1.6 1.2-3.2" />
  </svg>
)

const IconLeaf = ({ className = '', style }: IconProps) => (
  <svg {...ico} className={className} style={style} aria-hidden="true">
    <path d="M5.5 18.5C5.5 9.5 12 4.5 19.5 4.5c0 7.5-5 14-14 14Z" />
    <path d="M5.5 18.5c2.8-5.6 6.6-8.7 10.5-10.5" />
  </svg>
)

const IconInstagram = ({ className = '', style }: IconProps) => (
  <svg {...ico} className={className} style={style} aria-hidden="true">
    <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
    <circle cx="12" cy="12" r="3.8" />
    <circle cx="17.1" cy="6.9" r="1" fill="currentColor" stroke="none" />
  </svg>
)

const IconArrow = ({ className = '', style }: IconProps) => (
  <svg {...ico} className={className} style={style} aria-hidden="true">
    <path d="M4 12h15" />
    <path d="M13 6l6 6-6 6" />
  </svg>
)

const IconBasket = ({ className = '', style }: IconProps) => (
  <svg {...ico} className={className} style={style} aria-hidden="true">
    <path d="M4.5 9h15l-1.3 9.2a2 2 0 0 1-2 1.8H7.8a2 2 0 0 1-2-1.8L4.5 9Z" />
    <path d="M8.5 9V7a3.5 3.5 0 0 1 7 0v2" />
  </svg>
)

const IconPlus = ({ className = '', style }: IconProps) => (
  <svg {...ico} className={className} style={style} aria-hidden="true">
    <path d="M12 5.5v13" />
    <path d="M5.5 12h13" />
  </svg>
)

const IconUser = ({ className = '', style }: IconProps) => (
  <svg {...ico} className={className} style={style} aria-hidden="true">
    <circle cx="12" cy="8" r="3.6" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </svg>
)

const IconX = ({ className = '', style }: IconProps) => (
  <svg {...ico} className={className} style={style} aria-hidden="true">
    <path d="M6 6l12 12" />
    <path d="M18 6L6 18" />
  </svg>
)

// Tiny Italian flag chip used as marquee separator.
const TricolorChip = () => (
  <span className="inline-flex h-3 w-[18px] overflow-hidden rounded-[2px]" aria-hidden="true">
    <span className="h-full w-1/3" style={{ background: '#2F9E44' }} />
    <span className="h-full w-1/3" style={{ background: '#F4F1E8' }} />
    <span className="h-full w-1/3" style={{ background: '#C93B2E' }} />
  </span>
)

// ── Content ──────────────────────────────────────────────────────────
type Dish = {
  name: string
  price: number
  desc: string
  photo: string
  alt: string
  span: string
  aspect: string
  offset?: string
  tag?: string
}

const SIGNATURES: Dish[] = [
  {
    name: 'Special Makarna',
    price: 250,
    desc: 'İşletmeye özel peynir harmanlı sos — evin imzası, menünün en çok konuşulanı.',
    photo: '/makti/menu/special-makarna.jpg',
    alt: 'Peynir harmanlı özel soslu Special Makarna tabağı',
    span: 'md:col-span-7',
    aspect: 'aspect-[16/10]',
    tag: 'İmza',
  },
  {
    name: 'Bolonez',
    price: 350,
    desc: 'Ağır ateşte saatlerce pişen kıymalı ragù, taze makarnanın üstünde.',
    photo: '/makti/menu/bolonez.jpg',
    alt: 'Kıymalı bolonez soslu makarna',
    span: 'md:col-span-5',
    aspect: 'aspect-[4/5]',
    offset: 'md:mt-16',
  },
  {
    name: 'Penne Arrabbiata',
    price: 230,
    desc: 'Sarımsak, kırmızı biber ve domates. Adı gibi: biraz öfkeli.',
    photo: '/makti/menu/penne-arrabbiata.jpg',
    alt: 'Acılı domates soslu penne arrabbiata',
    span: 'md:col-span-5',
    aspect: 'aspect-[4/5]',
    tag: 'Acı sever',
  },
  {
    name: 'Mantar Soslu Tortellini',
    price: 300,
    desc: 'Peynir dolgulu tortellini, kremalı mantar sosuyla buluşur.',
    photo: '/makti/menu/mantar-soslu-tortellini.jpg',
    alt: 'Kremalı mantar soslu tortellini',
    span: 'md:col-span-7',
    aspect: 'aspect-[16/10]',
    offset: 'md:-mt-16',
  },
  {
    name: 'Alfredo',
    price: 250,
    desc: 'Mantar ve kremanın en yumuşak hali; klasik Alfredo.',
    photo: '/makti/menu/alfredo.jpg',
    alt: 'Mantarlı kremalı Alfredo makarna',
    span: 'md:col-span-6',
    aspect: 'aspect-[16/11]',
  },
  {
    name: 'Mac and Cheese',
    price: 300,
    desc: 'Bol peynirli, üstü fırında kızarmış konfor klasiği.',
    photo: '/makti/menu/mac-and-cheese.jpg',
    alt: 'Fırında kızarmış bol peynirli mac and cheese',
    span: 'md:col-span-6',
    aspect: 'aspect-[16/11]',
    tag: 'Fırından',
  },
]

const MENU_BOARD: { cat: string; items: { n: string; p: number }[] }[] = [
  {
    cat: 'Makarnalar',
    items: [
      { n: 'Special Makarna', p: 250 },
      { n: 'Acılı Special', p: 260 },
      { n: 'Körili Makarna', p: 230 },
      { n: 'Penne Arrabbiata', p: 230 },
      { n: 'Alfredo', p: 250 },
      { n: 'Pesto', p: 230 },
      { n: 'Bolonez', p: 350 },
      { n: 'Mac and Cheese', p: 300 },
      { n: 'Özel Salçalı Soslu Makarna', p: 230 },
      { n: 'Mantar Soslu Tortellini', p: 300 },
    ],
  },
  {
    cat: 'Mantılar',
    items: [
      { n: 'Kayseri Mantı', p: 350 },
      { n: 'Çıtır Mantı', p: 380 },
    ],
  },
  {
    cat: 'Salatalar',
    items: [
      { n: 'Sezar Salata', p: 300 },
      { n: 'Akdeniz Salata', p: 300 },
    ],
  },
  {
    cat: 'İçecekler',
    items: [
      { n: 'Kutu İçecek', p: 50 },
      { n: 'Ice Tea', p: 75 },
      { n: 'Ayran', p: 30 },
      { n: 'Su', p: 20 },
    ],
  },
]

const MARQUEE = ['MAKARNA', 'MANTI', 'AUTHENTİC ITALİAN PASTA', 'KDZ. EREĞLİ', '12:00 – 03:00']

// ── Live-menu helpers ────────────────────────────────────────────────
const norm = (s: string) => s.toLocaleLowerCase('tr').trim()

// Effective price: discountPrice wins when it is lower than the base price.
const priceOf = (item: APIMenuItem): number => {
  const base = Number(item.price)
  const disc = item.discountPrice != null ? Number(item.discountPrice) : NaN
  return Number.isFinite(disc) && disc < base ? disc : base
}

// ₺ display matching the existing static pattern (integers stay bare).
const tl = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ','))

// Absolute image URL, ignoring generic placeholders (same rule as MenuGridFromAPI).
const realImage = (path?: string): string => {
  if (!path || path.startsWith('/placeholders/')) return ''
  return imageUrl(path) || ''
}

type LiveMenu = { categories: Category[]; items: APIMenuItem[] }

type SignatureCard = {
  key: string
  name: string
  price: number
  desc: string
  photo: string
  alt: string
  tag?: string
  apiItem: APIMenuItem | null // null → static fallback, no add-to-cart
}

type BoardRow = { n: string; p: number; apiItem: APIMenuItem | null }
type BoardGroup = { cat: string; items: BoardRow[] }

// Menu-board row: name … dotted leader … price, plus a small mint "+" when
// the row is backed by a live API item and ordering is open.
const BoardLine = ({
  row,
  canAdd,
  onAdd,
}: {
  row: BoardRow
  canAdd: boolean
  onAdd: (item: APIMenuItem) => void
}) => {
  const item = row.apiItem
  return (
    <div className="flex items-baseline gap-3 text-[15px]">
      <span className="font-semibold">{row.n}</span>
      <span className="flex-1 border-b border-dotted" style={{ borderColor: 'rgba(242,244,236,0.25)' }} aria-hidden="true" />
      <span className="mkt-display font-semibold" style={{ color: MINT }}>₺{tl(row.p)}</span>
      {canAdd && item && item.available !== false && (
        <button
          type="button"
          onClick={() => onAdd(item)}
          aria-label={`Sepete ekle: ${row.n}`}
          className="grid h-7 w-7 shrink-0 place-items-center self-center rounded-full border transition-colors hover:bg-white/5"
          style={{ borderColor: 'rgba(127,227,168,0.45)', color: MINT }}
        >
          <IconPlus className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

// ── Membership modal (MAK-TI skin over the shared loyalty store) ─────
// Phone-first flow: lookup via login(phone); unknown numbers open a name
// field and go through register(phone, name). Logged-in members see their
// name + points and can log out. Rendered through a portal, dark-green panel.
const MemberModal = ({ onClose }: { onClose: () => void }) => {
  const { member, login, register, logout } = useLoyalty()
  const [step, setStep] = useState<'phone' | 'register' | 'success'>('phone')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Auto-close shortly after a successful login/register.
  useEffect(() => {
    if (step !== 'success') return
    const t = setTimeout(onClose, 1400)
    return () => clearTimeout(t)
  }, [step, onClose])

  const handlePhone = async () => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) {
      setError('Geçerli bir telefon numarası gir')
      return
    }
    setBusy(true)
    setError('')
    const ok = await login(digits)
    setBusy(false)
    if (ok) {
      setStep('success')
    } else {
      // Unknown number → collect the name and register.
      setStep('register')
    }
  }

  const handleRegister = async () => {
    if (!name.trim()) {
      setError('Adını yaz')
      return
    }
    setBusy(true)
    setError('')
    const res = await register(phone.replace(/\D/g, ''), name.trim())
    setBusy(false)
    if (res.success) {
      setStep('success')
    } else {
      setError(res.error || 'Kayıt başarısız')
    }
  }

  const showSuccess = step === 'success'
  const showAccount = !showSuccess && !!member

  return createPortal(
    <div
      className="mkt fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="MAK-TI üyelik"
      style={{ background: 'rgba(8,28,21,0.78)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-3xl"
        style={{
          background: `linear-gradient(150deg, #0D2B1E 0%, ${PINE} 100%)`,
          border: '1px solid rgba(127,227,168,0.3)',
          color: CREAM,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-[3px] w-full" style={{ background: TRICOLOR }} aria-hidden="true" />
        <div className="relative p-7">
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border transition-colors hover:bg-white/5"
            style={{ borderColor: 'rgba(242,244,236,0.25)', color: 'rgba(242,244,236,0.8)' }}
          >
            <IconX className="h-4 w-4" />
          </button>

          {showSuccess ? (
            <div className="py-6 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full" style={{ background: 'rgba(127,227,168,0.15)', color: MINT }}>
                <IconLeaf className="h-6 w-6" />
              </div>
              <h3 className="mkt-display mt-4 text-2xl font-semibold">
                Hoş geldin{member?.name ? `, ${member.name}` : ''}!
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'rgba(242,244,236,0.7)' }}>
                Üyeliğin hazır — her siparişte puan kazanırsın.
              </p>
              {member && (
                <span className="mkt-display mt-4 inline-block rounded-full px-4 py-1.5 text-lg font-semibold" style={{ background: MINT, color: PINE }}>
                  {member.totalPoints} Puan
                </span>
              )}
            </div>
          ) : showAccount && member ? (
            <div>
              <div className="flex items-center gap-4">
                <div className="mkt-display grid h-14 w-14 shrink-0 place-items-center rounded-full text-2xl font-semibold" style={{ background: MINT, color: PINE }}>
                  {(member.name || 'Ü')[0].toLocaleUpperCase('tr')}
                </div>
                <div>
                  <h3 className="mkt-display text-2xl font-semibold">{member.name || 'Üye'}</h3>
                  {member.phone && (
                    <p className="text-sm" style={{ color: 'rgba(242,244,236,0.65)' }}>{member.phone}</p>
                  )}
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between rounded-2xl border px-5 py-4" style={{ borderColor: 'rgba(127,227,168,0.3)' }}>
                <span className="text-sm font-bold" style={{ color: 'rgba(242,244,236,0.75)' }}>Puanın</span>
                <span className="mkt-display text-2xl font-semibold" style={{ color: MINT }}>{member.totalPoints}</span>
              </div>
              <p className="mt-3 text-xs" style={{ color: 'rgba(242,244,236,0.55)' }}>
                {member.totalPoints >= 100
                  ? `${Math.floor(member.totalPoints / 100) * 10}₺ indirim kullanabilirsin.`
                  : `100 puana ${100 - member.totalPoints} puan kaldı.`}
              </p>
              <button
                type="button"
                onClick={() => {
                  logout()
                  setStep('phone')
                  setPhone('')
                  setName('')
                  setError('')
                }}
                className="mt-6 w-full rounded-full border px-6 py-3 text-sm font-bold transition-colors hover:bg-white/5"
                style={{ borderColor: 'rgba(242,244,236,0.3)', color: CREAM }}
              >
                Çıkış Yap
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (busy) return
                if (step === 'phone') handlePhone()
                else handleRegister()
              }}
            >
              <p className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: MINT }}>MAK-TI Üyelik</p>
              <h3 className="mkt-display mt-3 text-2xl font-semibold">
                {step === 'phone' ? 'Üye ol, puan kazan' : 'Seni tanıyalım'}
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'rgba(242,244,236,0.7)' }}>
                {step === 'phone'
                  ? 'Telefon numaranla giriş yap; her siparişte puan birikir.'
                  : 'Bu numara kayıtlı değil — adını yaz, üyeliğini hemen oluşturalım.'}
              </p>
              <label className="mt-5 block text-sm font-bold" htmlFor="mkt-member-phone">Telefon</label>
              <input
                id="mkt-member-phone"
                type="tel"
                inputMode="tel"
                autoFocus
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05xx xxx xx xx"
                disabled={step === 'register'}
                className="mt-1.5 w-full rounded-xl border bg-transparent px-4 py-3 text-base outline-none disabled:opacity-60"
                style={{ borderColor: 'rgba(127,227,168,0.35)', color: CREAM }}
              />
              {step === 'register' && (
                <>
                  <label className="mt-4 block text-sm font-bold" htmlFor="mkt-member-name">Adın</label>
                  <input
                    id="mkt-member-name"
                    type="text"
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Adın Soyadın"
                    className="mt-1.5 w-full rounded-xl border bg-transparent px-4 py-3 text-base outline-none"
                    style={{ borderColor: 'rgba(127,227,168,0.35)', color: CREAM }}
                  />
                </>
              )}
              {error && (
                <p className="mt-3 rounded-lg px-3 py-2 text-sm" style={{ background: 'rgba(201,59,46,0.18)', color: '#F5B7A6' }}>
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="mt-6 w-full rounded-full px-6 py-3.5 text-base font-extrabold transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                style={{ background: BASIL, color: NIGHT }}
              >
                {busy ? 'Bekle...' : step === 'phone' ? 'Devam Et' : 'Üye Ol'}
              </button>
              {step === 'register' && (
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone')
                    setError('')
                  }}
                  className="mt-3 w-full text-xs font-bold transition-opacity hover:opacity-80"
                  style={{ color: 'rgba(242,244,236,0.6)' }}
                >
                  Numarayı değiştir
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

export const MaktiLanding = () => {
  const rootRef = useRef<HTMLElement>(null)
  const { addItemFromAPI, totalItems, openCart } = useCart()
  const { member } = useLoyalty()
  const { services, isWithinOrderHours } = useSettings()
  const [memberOpen, setMemberOpen] = useState(false)
  const [menu, setMenu] = useState<LiveMenu | null>(null)

  // Ordering gate — same condition the global cart button/drawer uses.
  const cartOk = services.cartEnabled && isWithinOrderHours

  // Fetch the live menu once on mount; on failure the static content stays.
  useEffect(() => {
    let alive = true
    orderApi
      .getMenu()
      .then((res) => {
        if (!alive || !res.success || !res.data?.items?.length) return
        setMenu({ categories: res.data.categories ?? [], items: res.data.items })
      })
      .catch(() => {
        /* static fallback keeps rendering */
      })
    return () => {
      alive = false
    }
  }, [])

  const handleAdd = useCallback(
    (item: APIMenuItem) => {
      addItemFromAPI({
        id: item.id,
        name: item.name,
        description: item.description || '',
        price: priceOf(item),
        image: realImage(item.image),
        categoryId: item.category?.id || '',
        badges: item.badges || [],
      })
      openCart()
    },
    [addItemFromAPI, openCart]
  )

  // Six signature cards: featured items first, filled from the rest. Layout
  // slots (span/aspect/offset) always come from the static SIGNATURES grid so
  // the approved composition never changes; static entries matched by name
  // donate their curated photo/desc/tag when the API item lacks them.
  const signatureCards: SignatureCard[] = useMemo(() => {
    const fallback: SignatureCard[] = SIGNATURES.map((s) => ({
      key: s.name,
      name: s.name,
      price: s.price,
      desc: s.desc,
      photo: s.photo,
      alt: s.alt,
      tag: s.tag,
      apiItem: null,
    }))
    if (!menu || menu.items.length === 0) return fallback
    const available = menu.items.filter((i) => i.available !== false)
    const pool = available.length >= 6 ? available : [...available, ...menu.items.filter((i) => i.available === false)]
    const picks = [...pool.filter((i) => i.featured), ...pool.filter((i) => !i.featured)].slice(0, 6)
    return SIGNATURES.map((slot, i) => {
      const item = picks[i]
      if (!item) return fallback[i]
      const match = SIGNATURES.find((s) => norm(s.name) === norm(item.name))
      return {
        key: item.id,
        name: item.name,
        price: priceOf(item),
        desc: item.description || match?.desc || '',
        photo: realImage(item.image) || match?.photo || slot.photo,
        alt: match?.alt || item.name,
        tag: match?.tag,
        apiItem: item,
      }
    })
  }, [menu])

  // Menu board grouped by live categories (sortOrder), static list as fallback.
  const board: BoardGroup[] = useMemo(() => {
    const fallback: BoardGroup[] = MENU_BOARD.map((c) => ({
      cat: c.cat,
      items: c.items.map((it) => ({ n: it.n, p: it.p, apiItem: null })),
    }))
    if (!menu || menu.items.length === 0) return fallback
    const sort = new Map(menu.categories.map((c, i) => [c.id, c.sortOrder ?? i]))
    const groups = new Map<string, { cat: string; sort: number; items: BoardRow[] }>()
    menu.items.forEach((item) => {
      const id = item.category?.id || 'other'
      if (!groups.has(id)) {
        groups.set(id, {
          cat: menu.categories.find((c) => c.id === id)?.name || item.category?.name || 'Menü',
          sort: sort.get(id) ?? 999,
          items: [],
        })
      }
      groups.get(id)!.items.push({ n: item.name, p: priceOf(item), apiItem: item })
    })
    const live = [...groups.values()].sort((a, b) => a.sort - b.sort).map(({ cat, items }) => ({ cat, items }))
    return live.length ? live : fallback
  }, [menu])

  useEffect(() => {
    document.title = 'MAK-TI · Makarna & Mantı — Kdz. Ereğli'
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        "MAK-TI, Kdz. Ereğli'de İtalyan makarnası ve el açması Kayseri mantısı. Authentic Italian Pasta — her gün 12:00'den gece 03:00'e kadar açık. Online sipariş ver."
      )

    // Reveal-on-scroll: the hidden initial state only activates once JS adds
    // .mkt-js — without JS everything stays visible (no opacity gate risk).
    const root = rootRef.current
    if (!root) return
    root.classList.add('mkt-js')
    const els = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('mkt-in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('mkt-in')
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <main ref={rootRef} className="mkt" style={{ background: NIGHT, color: CREAM }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500;1,9..144,600&family=Manrope:wght@400;500;600;700;800&display=swap');

        .mkt { font-family: 'Manrope', system-ui, sans-serif; }
        .mkt-display { font-family: 'Fraunces', Georgia, serif; letter-spacing: -0.015em; }

        /* Hero entrance (on load, no JS needed, 'both' fill) */
        @keyframes mkt-rise { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: none; } }
        .mkt-rise   { animation: mkt-rise 0.7s cubic-bezier(0.16,1,0.3,1) both; }
        .mkt-rise-1 { animation-delay: 0.1s; }
        .mkt-rise-2 { animation-delay: 0.2s; }
        .mkt-rise-3 { animation-delay: 0.32s; }
        .mkt-rise-4 { animation-delay: 0.45s; }

        /* Floating brand badge on the hero photo */
        @keyframes mkt-float { 0%, 100% { transform: translateY(0) rotate(-6deg); } 50% { transform: translateY(-10px) rotate(-6deg); } }
        .mkt-float { animation: mkt-float 5.5s ease-in-out infinite; }

        /* Scroll reveal — gated behind .mkt-js so no-JS keeps content visible */
        .mkt-js [data-reveal] {
          opacity: 0; transform: translateY(28px);
          transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1);
        }
        .mkt-js [data-reveal].mkt-in { opacity: 1; transform: none; }

        /* Marquee */
        .mkt-marquee { display: flex; overflow: hidden; user-select: none; }
        .mkt-marquee > div { display: flex; flex-shrink: 0; align-items: center; animation: mkt-scroll 32s linear infinite; }
        @keyframes mkt-scroll { to { transform: translateX(-100%); } }

        .mkt-dish img { transition: transform 0.55s cubic-bezier(0.16,1,0.3,1); }
        .mkt-dish:hover img { transform: scale(1.045); }

        @media (prefers-reduced-motion: reduce) {
          .mkt-marquee > div { animation: none; }
          .mkt-rise, .mkt-float { animation: none !important; }
          .mkt-js [data-reveal] { opacity: 1 !important; transform: none !important; transition: none; }
          .mkt-dish img { transition: none; }
        }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50" style={{ background: 'rgba(8,28,21,0.92)', backdropFilter: 'blur(10px)' }}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#top" className="flex items-center gap-3">
            <img src="/makti/logo-circle.png" alt="MAK-TI logo" className="h-10 w-10" />
            {/* Wordmark yields to the new cart/member buttons on very narrow screens */}
            <span className="hidden leading-none min-[480px]:block">
              <span className="mkt-display block text-lg font-semibold tracking-wide">MAK-TI</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: MINT }}>
                Makarna &amp; Mantı
              </span>
            </span>
          </a>
          <nav className="hidden items-center gap-7 text-[15px] font-semibold md:flex" style={{ color: 'rgba(242,244,236,0.85)' }}>
            <a href="#lezzetler" className="hover:text-white">Lezzetler</a>
            <a href="#iki-dunya" className="hover:text-white">İki Dünya</a>
            <Link to="/menu" className="hover:text-white">Menü</Link>
            <a href="#konum" className="hover:text-white">Konum</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            {cartOk && (
              <button
                type="button"
                onClick={openCart}
                aria-label={`Sepeti aç${totalItems > 0 ? ` (${totalItems} ürün)` : ''}`}
                className="relative grid h-10 w-10 place-items-center rounded-full border transition-colors hover:bg-white/5"
                style={{ borderColor: 'rgba(127,227,168,0.4)', color: MINT }}
              >
                <IconBasket className="h-5 w-5" />
                {totalItems > 0 && (
                  <span
                    className="absolute -right-1.5 -top-1.5 grid h-5 min-w-[20px] place-items-center rounded-full px-1 text-[11px] font-extrabold leading-none"
                    style={{ background: MINT, color: PINE }}
                  >
                    {totalItems > 99 ? '99+' : totalItems}
                  </span>
                )}
              </button>
            )}
            {member ? (
              <button
                type="button"
                onClick={() => setMemberOpen(true)}
                aria-label="Hesabım"
                className="flex items-center gap-2 rounded-full border p-1.5 transition-colors hover:bg-white/5 sm:pr-4"
                style={{ borderColor: 'rgba(127,227,168,0.4)', color: CREAM }}
              >
                <span className="mkt-display grid h-7 w-7 place-items-center rounded-full text-sm font-semibold" style={{ background: MINT, color: PINE }}>
                  {(member.name || 'Ü')[0].toLocaleUpperCase('tr')}
                </span>
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block text-[13px] font-bold leading-none">{member.name || 'Üye'}</span>
                  <span className="mt-0.5 block text-[11px] font-bold leading-none" style={{ color: MINT }}>
                    {member.totalPoints} puan
                  </span>
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMemberOpen(true)}
                aria-label="Üye ol"
                className="flex h-10 items-center gap-2 rounded-full border px-3 text-sm font-bold transition-colors hover:bg-white/5 sm:px-4"
                style={{ borderColor: 'rgba(127,227,168,0.4)', color: MINT }}
              >
                <IconUser className="h-5 w-5" />
                <span className="hidden sm:inline">Üye Ol</span>
              </button>
            )}
            <Link
              to="/menu"
              className="rounded-full px-5 py-2.5 text-[15px] font-bold transition-transform hover:-translate-y-0.5"
              style={{ background: BASIL, color: NIGHT }}
            >
              Sipariş Ver
            </Link>
          </div>
        </div>
        <div className="h-[2px] w-full opacity-80" style={{ background: TRICOLOR }} aria-hidden="true" />
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section
        id="top"
        className="relative overflow-hidden"
        style={{ background: `radial-gradient(1100px 620px at 82% -10%, rgba(20,71,29,0.55), transparent 65%), ${NIGHT}` }}
      >
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 md:min-h-[calc(100vh-66px)] md:grid-cols-[1.05fr_0.95fr] md:pb-24 md:pt-16">
          <div>
            <p className="mkt-rise text-xs font-bold uppercase tracking-[0.32em]" style={{ color: MINT }}>
              Kdz. Ereğli · Makarna &amp; Mantı Evi
            </p>
            <h1
              className="mkt-display mkt-rise mkt-rise-1 mt-6 font-semibold"
              style={{ fontSize: 'clamp(2.9rem, 8.5vw, 6rem)', lineHeight: 0.99, textWrap: 'balance' }}
            >
              AUTHENTİC
              <br />
              <em className="font-medium" style={{ color: MINT }}>ITALİAN</em> PASTA
            </h1>
            <p className="mkt-rise mkt-rise-2 mt-7 max-w-md text-lg leading-relaxed" style={{ color: 'rgba(242,244,236,0.78)' }}>
              İtalyan usulü taze makarna ile el açması Kayseri mantısı aynı mutfakta.
              Ereğli'de, her gece 03:00'e kadar sıcak tabak çıkar.
            </p>
            <div className="mkt-rise mkt-rise-3 mt-8 flex flex-wrap items-center gap-3">
              <span
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold"
                style={{ borderColor: 'rgba(127,227,168,0.4)', color: MINT }}
              >
                <IconClock className="h-4 w-4" /> Her gün 12:00 – 03:00
              </span>
              <span
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold"
                style={{ borderColor: 'rgba(242,244,236,0.2)', color: 'rgba(242,244,236,0.75)' }}
              >
                <IconMoon className="h-4 w-4" /> Gece mutfağı açık
              </span>
            </div>
            <div className="mkt-rise mkt-rise-4 mt-9 flex flex-wrap items-center gap-4">
              <Link
                to="/menu"
                className="inline-flex items-center gap-2.5 rounded-full px-8 py-4 text-base font-extrabold transition-transform hover:-translate-y-0.5"
                style={{ background: BASIL, color: NIGHT }}
              >
                Sipariş Ver <IconArrow className="h-5 w-5" />
              </Link>
              {!member && (
                <button
                  type="button"
                  onClick={() => setMemberOpen(true)}
                  className="inline-flex items-center gap-2.5 rounded-full border px-8 py-4 text-base font-bold transition-colors hover:bg-white/5"
                  style={{ borderColor: 'rgba(127,227,168,0.45)', color: MINT }}
                >
                  <IconUser className="h-5 w-5" /> Üye Ol &amp; Puan Kazan
                </button>
              )}
              <a
                href="#lezzetler"
                className="rounded-full border px-8 py-4 text-base font-bold transition-colors hover:bg-white/5"
                style={{ borderColor: 'rgba(242,244,236,0.3)', color: CREAM }}
              >
                İmza lezzetler
              </a>
            </div>
          </div>

          <div className="mkt-rise mkt-rise-2 relative mx-auto w-full max-w-md md:max-w-none">
            <img
              src="/makti/menu/special-makarna.jpg"
              alt="MAK-TI'nın peynir harmanlı soslu Special Makarna tabağı"
              loading="eager"
              className="aspect-[4/5] w-full rounded-3xl object-cover"
              style={{ border: '1px solid rgba(127,227,168,0.25)' }}
            />
            <div
              className="absolute inset-0 rounded-3xl"
              style={{ background: 'linear-gradient(180deg, transparent 55%, rgba(8,28,21,0.72) 100%)' }}
              aria-hidden="true"
            />
            <img
              src="/makti/menu/citir-manti.jpg"
              alt="Çıtır mantı, sarımsaklı yoğurt ve tereyağlı sosla"
              loading="lazy"
              className="absolute -bottom-8 -left-4 hidden w-44 rotate-[-4deg] rounded-2xl object-cover shadow-2xl sm:block md:-left-10 md:w-52"
              style={{ border: `5px solid ${NIGHT}`, aspectRatio: '1 / 1' }}
            />
            <img
              src="/makti/logo-circle.png"
              alt=""
              aria-hidden="true"
              className="mkt-float absolute -right-4 -top-8 h-24 w-24 drop-shadow-2xl md:-right-8 md:h-28 md:w-28"
            />
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3">
              <div>
                <p className="mkt-display text-xl font-semibold">Special Makarna</p>
                <p className="text-sm" style={{ color: 'rgba(242,244,236,0.7)' }}>Peynir harmanlı özel sos</p>
              </div>
              <span className="mkt-display whitespace-nowrap rounded-full px-4 py-1.5 text-lg font-semibold" style={{ background: MINT, color: PINE }}>
                ₺250
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee ─────────────────────────────────────────────────── */}
      <div
        className="mkt-marquee py-4"
        style={{ borderTop: '1px solid rgba(127,227,168,0.22)', borderBottom: '1px solid rgba(127,227,168,0.22)' }}
        aria-hidden="true"
      >
        {[0, 1].map((i) => (
          <div key={i} className="mkt-display gap-9 pr-9 text-lg font-medium" style={{ color: 'rgba(242,244,236,0.85)' }}>
            {MARQUEE.map((t) => (
              <span key={t} className="flex items-center gap-9 whitespace-nowrap">
                {t} <TricolorChip />
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* ── İmza lezzetler ──────────────────────────────────────────── */}
      <section id="lezzetler" className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div data-reveal className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.32em]" style={{ color: MINT }}>
                <IconLeaf className="h-4 w-4" /> İmza Lezzetler
              </p>
              <h2 className="mkt-display mt-4 font-semibold" style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', textWrap: 'balance' }}>
                Sos tencereden,
                <br />
                makarna <em style={{ color: MINT }}>taze</em> çıkar.
              </h2>
            </div>
            <p className="max-w-xs leading-relaxed md:text-right" style={{ color: 'rgba(242,244,236,0.65)' }}>
              On çeşit makarna, iki usul mantı. Hepsi sipariş üstüne, hepsi aynı gece mutfağından.
            </p>
          </div>

          <div className="mt-14 grid gap-x-8 gap-y-12 md:grid-cols-12">
            {signatureCards.map((d, i) => {
              const slot = SIGNATURES[i]
              const canAdd = !!d.apiItem && d.apiItem.available !== false
              return (
                <article key={d.key} data-reveal className={`mkt-dish ${slot.span} ${slot.offset ?? ''}`}>
                  <div className={`relative overflow-hidden rounded-2xl ${slot.aspect}`}>
                    <img src={d.photo} alt={d.alt} loading="lazy" className="h-full w-full object-cover" />
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{ background: 'linear-gradient(180deg, rgba(8,28,21,0.05) 40%, rgba(8,28,21,0.82) 100%)' }}
                      aria-hidden="true"
                    />
                    <span
                      className="mkt-display absolute right-4 top-4 rounded-full px-3.5 py-1 text-base font-semibold"
                      style={{ background: MINT, color: PINE }}
                    >
                      ₺{tl(d.price)}
                    </span>
                    {d.tag && (
                      <span
                        className="absolute left-4 top-4 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider"
                        style={{ borderColor: 'rgba(242,244,236,0.4)', color: CREAM, background: 'rgba(8,28,21,0.45)' }}
                      >
                        {d.tag}
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <h3 className="mkt-display text-xl font-semibold md:text-2xl">{d.name}</h3>
                      <p className="mt-1.5 max-w-md text-[15px] leading-relaxed" style={{ color: 'rgba(242,244,236,0.78)' }}>
                        {d.desc}
                      </p>
                      {canAdd && cartOk && (
                        <button
                          type="button"
                          onClick={() => handleAdd(d.apiItem!)}
                          className="mt-3.5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-extrabold transition-transform hover:-translate-y-0.5"
                          style={{ background: MINT, color: PINE }}
                        >
                          <IconBasket className="h-4 w-4" /> Sepete Ekle
                        </button>
                      )}
                      {canAdd && !cartOk && (
                        <span
                          className="mt-3.5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold"
                          style={{ borderColor: 'rgba(242,244,236,0.35)', color: 'rgba(242,244,236,0.8)' }}
                        >
                          <IconClock className="h-3.5 w-3.5" /> Şu an kapalıyız · 12:00–03:00
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          <div data-reveal className="mt-16 text-center">
            <Link
              to="/menu"
              className="inline-flex items-center gap-2.5 rounded-full px-9 py-4 text-base font-extrabold transition-transform hover:-translate-y-0.5"
              style={{ background: BASIL, color: NIGHT }}
            >
              Tüm menüyü gör <IconArrow className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── İki dünya: İtalya ↔ Anadolu ─────────────────────────────── */}
      <section id="iki-dunya" className="py-20 md:py-28" style={{ background: 'rgba(20,71,29,0.16)' }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div data-reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.32em]" style={{ color: MINT }}>
              Mak + Tı
            </p>
            <h2 className="mkt-display mt-4 font-semibold" style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', textWrap: 'balance' }}>
              İki dünya, tek mutfak.
            </h2>
            <p className="mt-4 text-lg leading-relaxed" style={{ color: 'rgba(242,244,236,0.7)' }}>
              Adımız iki kelimenin kısaltması: <b>mak</b>arna ve man<b>tı</b>.
              Bir tarafta İtalya'nın sosları, diğer tarafta Anadolu'nun el açması hamuru.
            </p>
          </div>

          <div data-reveal className="relative mt-14 grid overflow-hidden rounded-3xl md:grid-cols-2">
            {/* Italy side */}
            <div className="flex flex-col" style={{ background: PINE }}>
              <div className="h-1.5 w-full" style={{ background: TRICOLOR }} aria-hidden="true" />
              <div className="relative">
                <img
                  src="/makti/menu/pesto.jpg"
                  alt="Taze fesleğenli pesto soslu makarna"
                  loading="lazy"
                  className="aspect-[16/9] w-full object-cover"
                />
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{ background: 'linear-gradient(180deg, transparent 45%, rgba(20,71,29,0.85) 100%)' }}
                  aria-hidden="true"
                />
              </div>
              <div className="flex flex-1 flex-col p-8 md:p-10">
                <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em]" style={{ color: MINT }}>
                  <IconFork className="h-4 w-4" /> İtalya'dan
                </p>
                <h3 className="mkt-display mt-3 text-3xl font-semibold">
                  <em style={{ color: MINT }}>Al dente</em>, her seferinde.
                </h3>
                <p className="mt-4 leading-relaxed" style={{ color: 'rgba(242,244,236,0.78)' }}>
                  Pesto'dan arrabbiata'ya, Alfredo'dan şefin peynir harmanlı Special sosuna —
                  soslar her gün tencerede, makarna sipariş üstüne pişer.
                </p>
                <ul className="mt-6 space-y-2.5 text-[15px] font-semibold">
                  {[
                    ['Pesto', 230],
                    ['Acılı Special', 260],
                    ['Körili Makarna', 230],
                  ].map(([n, p]) => (
                    <li key={n} className="flex items-baseline justify-between gap-4">
                      <span>{n}</span>
                      <span className="mkt-display" style={{ color: MINT }}>₺{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Anatolia side — warm handmade contrast */}
            <div className="flex flex-col" style={{ background: PARCHMENT, color: INK }}>
              <div
                className="h-1.5 w-full"
                style={{ background: `repeating-linear-gradient(-45deg, ${TERRA} 0 10px, #D9A566 10px 20px)` }}
                aria-hidden="true"
              />
              <div className="relative">
                <img
                  src="/makti/menu/kayseri-manti.jpg"
                  alt="Sarımsaklı yoğurt ve kızgın tereyağlı Kayseri mantısı"
                  loading="lazy"
                  className="aspect-[16/9] w-full object-cover"
                />
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{ background: 'linear-gradient(180deg, transparent 55%, rgba(244,234,216,0.9) 100%)' }}
                  aria-hidden="true"
                />
              </div>
              <div className="flex flex-1 flex-col p-8 md:p-10">
                <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em]" style={{ color: TERRA }}>
                  <IconBowl className="h-4 w-4" /> Anadolu'dan
                </p>
                <h3 className="mkt-display mt-3 text-3xl font-semibold">
                  Hamur elde, <em style={{ color: TERRA }}>usul dedeninki</em>.
                </h3>
                <p className="mt-4 leading-relaxed" style={{ color: 'rgba(42,27,16,0.75)' }}>
                  Kayseri usulü mantı sarımsaklı yoğurt ve kızgın tereyağıyla; çıtır mantı ise
                  gece atıştırmasının kralı. İkisi de el açması hamurla.
                </p>
                <ul className="mt-6 space-y-2.5 text-[15px] font-semibold">
                  {[
                    ['Kayseri Mantı', 350],
                    ['Çıtır Mantı', 380],
                  ].map(([n, p]) => (
                    <li key={n} className="flex items-baseline justify-between gap-4">
                      <span>{n}</span>
                      <span className="mkt-display" style={{ color: TERRA }}>₺{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Center seam badge (desktop) */}
            <div
              className="absolute left-1/2 top-1/2 z-10 hidden h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full md:grid"
              style={{ background: NIGHT, border: `1px solid ${MINT}`, color: MINT }}
              aria-hidden="true"
            >
              <IconFork className="h-6 w-6" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Menü panosu + gece CTA ──────────────────────────────────── */}
      <section id="menu-panosu" className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div data-reveal className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <h2 className="mkt-display font-semibold" style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', textWrap: 'balance' }}>
              Menü panosu
            </h2>
            <p className="max-w-xs leading-relaxed md:text-right" style={{ color: 'rgba(242,244,236,0.65)' }}>
              Fiyatlar günceldir. Sipariş ve detaylar için menü sayfası her zaman açık.
            </p>
          </div>

          <div className="mt-12 grid gap-x-14 gap-y-12 md:grid-cols-2">
            <div data-reveal>
              <h3 className="mkt-display text-xl font-semibold" style={{ color: MINT }}>
                {board[0].cat}
              </h3>
              <div className="mt-5 space-y-3.5">
                {board[0].items.map((it) => (
                  <BoardLine key={it.apiItem?.id ?? it.n} row={it} canAdd={cartOk} onAdd={handleAdd} />
                ))}
              </div>
            </div>

            <div className="space-y-12">
              {board.slice(1).map((cat) => (
                <div key={cat.cat} data-reveal>
                  <h3 className="mkt-display text-xl font-semibold" style={{ color: MINT }}>
                    {cat.cat}
                  </h3>
                  <div className="mt-5 space-y-3.5">
                    {cat.items.map((it) => (
                      <BoardLine key={it.apiItem?.id ?? it.n} row={it} canAdd={cartOk} onAdd={handleAdd} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Late-night order banner */}
          <div
            data-reveal
            className="relative mt-16 overflow-hidden rounded-3xl p-8 md:mt-20 md:p-14"
            style={{
              background: `radial-gradient(700px 320px at 85% 0%, rgba(127,227,168,0.16), transparent 60%), linear-gradient(120deg, #0D2B1E 0%, ${PINE} 100%)`,
              border: '1px solid rgba(127,227,168,0.25)',
            }}
          >
            <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
              <div>
                <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em]" style={{ color: MINT }}>
                  <IconMoon className="h-4 w-4" /> Gece Mutfağı
                </p>
                <h3 className="mkt-display mt-4 font-semibold" style={{ fontSize: 'clamp(1.7rem, 4vw, 2.8rem)', textWrap: 'balance' }}>
                  Gece acıktıysan sorun değil —
                  <br />
                  ocak <em style={{ color: MINT }}>03:00'e kadar</em> yanıyor.
                </h3>
                <p className="mt-4 max-w-lg leading-relaxed" style={{ color: 'rgba(242,244,236,0.75)' }}>
                  Sıcak makarna gece yarısından sonra da çıkar. Menüden seç, siparişini ver;
                  gerisi mutfağın işi.
                </p>
              </div>
              <div className="flex flex-col items-start gap-4 md:items-end">
                <span
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold"
                  style={{ borderColor: 'rgba(127,227,168,0.4)', color: MINT }}
                >
                  <IconClock className="h-4 w-4" /> 12:00 – 03:00 · Her gün
                </span>
                <Link
                  to="/menu"
                  className="inline-flex items-center gap-2.5 rounded-full px-9 py-4 text-base font-extrabold transition-transform hover:-translate-y-0.5"
                  style={{ background: MINT, color: PINE }}
                >
                  Sipariş Ver <IconArrow className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Konum & Instagram ───────────────────────────────────────── */}
      <section id="konum" className="py-20 md:py-28" style={{ background: 'rgba(20,71,29,0.16)' }}>
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 md:grid-cols-2 md:gap-16">
          <div>
            <p data-reveal className="text-xs font-bold uppercase tracking-[0.32em]" style={{ color: MINT }}>
              Hakkında &amp; Konum
            </p>
            <h2 data-reveal className="mkt-display mt-4 font-semibold" style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', textWrap: 'balance' }}>
              Ereğli'de bir köşe,
              <br />
              iki mutfağın buluşması.
            </h2>
            <p data-reveal className="mt-5 max-w-md text-lg leading-relaxed" style={{ color: 'rgba(242,244,236,0.75)' }}>
              MAK-TI, Karadeniz kıyısında bir makarna ve mantı evi. Gündüz uzun öğle
              sofraları, gece geç saat tabakları — mutfak ikisine de aynı özenle bakar.
            </p>
            <div data-reveal className="mt-8 space-y-4 text-[15px] font-semibold">
              <p className="flex items-center gap-3">
                <IconPin className="h-5 w-5 shrink-0" style={{ color: MINT }} /> Kdz. Ereğli, Zonguldak
              </p>
              <p className="flex items-center gap-3">
                <IconClock className="h-5 w-5 shrink-0" style={{ color: MINT }} /> Her gün 12:00 – 03:00
              </p>
              <a
                href="https://instagram.com/maktihouse"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 transition-opacity hover:opacity-80"
              >
                <IconInstagram className="h-5 w-5 shrink-0" style={{ color: MINT }} /> @maktihouse
              </a>
            </div>
            <div data-reveal className="mt-9 flex flex-wrap gap-4">
              <Link
                to="/menu"
                className="rounded-full px-8 py-4 text-base font-extrabold transition-transform hover:-translate-y-0.5"
                style={{ background: BASIL, color: NIGHT }}
              >
                Gel al siparişi ver
              </Link>
              <a
                href="https://instagram.com/maktihouse"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-full border px-8 py-4 text-base font-bold transition-colors hover:bg-white/5"
                style={{ borderColor: 'rgba(242,244,236,0.3)', color: CREAM }}
              >
                <IconInstagram className="h-5 w-5" /> Instagram
              </a>
            </div>
          </div>

          <div className="relative self-center">
            <img
              data-reveal
              src="/makti/menu/korili-makarna.jpg"
              alt="Körili soslu makarna, MAK-TI mutfağından"
              loading="lazy"
              className="aspect-[4/3] w-full rounded-3xl object-cover"
              style={{ border: '1px solid rgba(127,227,168,0.25)' }}
            />
            <img
              data-reveal
              src="/makti/menu/sezar-salata.jpg"
              alt="Tavuklu Sezar salata"
              loading="lazy"
              className="absolute -bottom-10 -right-2 hidden w-48 rotate-[3deg] rounded-2xl object-cover shadow-2xl sm:block md:-right-6 md:w-56"
              style={{ border: `5px solid ${NIGHT}`, aspectRatio: '1 / 1' }}
            />
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="pb-10 pt-16" style={{ borderTop: '1px solid rgba(127,227,168,0.2)' }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="mkt-display text-center font-semibold" style={{ fontSize: 'clamp(3rem, 13vw, 8.5rem)', lineHeight: 1 }}>
            MAK<span style={{ color: MINT }}>-</span>TI
          </p>
          <div className="mx-auto mt-8 h-[2px] max-w-xs opacity-80" style={{ background: TRICOLOR }} aria-hidden="true" />
          <div className="mt-12 flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <img src="/makti/logo-circle.png" alt="MAK-TI logo" className="h-9 w-9 opacity-90" />
              <p className="text-sm" style={{ color: 'rgba(242,244,236,0.55)' }}>
                © {new Date().getFullYear()} MAK-TI · Kdz. Ereğli, Zonguldak
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm font-semibold">
              <Link to="/menu" className="hover:opacity-70">Menü</Link>
              <a
                href="https://instagram.com/maktihouse"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-70"
              >
                Instagram
              </a>
              <Link to="/panel" className="hover:opacity-70" style={{ color: 'rgba(242,244,236,0.55)' }}>
                İşletme girişi
              </Link>
            </div>
          </div>
          <p className="mt-8 text-center text-xs" style={{ color: 'rgba(242,244,236,0.4)' }}>
            Sipariş altyapısı: OtOrder
          </p>
        </div>
      </footer>

      {/* Membership modal (portal) — shared loyalty store, MAK-TI skin */}
      {memberOpen && <MemberModal onClose={() => setMemberOpen(false)} />}
    </main>
  )
}
