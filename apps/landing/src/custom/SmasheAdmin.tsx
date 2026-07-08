import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SMASHE_DEFAULTS, mergeSmashe, type SmasheContent } from './smasheContent'

// Smashé landing içerik editörü — /smashe-admin. Restoran hesabıyla (POS e-posta
// + şifre) girilir; yazılar/fiyatlar/foto URL'leri düzenlenir, "Yayınla" ile
// PUT /api/settings/smasheContent'e kaydedilir. Landing açılışta bu ayarı okur.

const NAVY = '#122a5c'
const API_BASE = (import.meta as any).env?.VITE_API_URL || ''

const inp = 'w-full rounded-xl border-2 border-[#122a5c]/20 bg-white px-3 py-2 text-[15px] focus:border-[#122a5c] focus:outline-none'
const lbl = 'mb-1 block text-xs font-bold uppercase tracking-wide text-[#122a5c]/60'

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className={lbl}>{label}</label>
    {children}
  </div>
)

export const SmasheAdmin = () => {
  const [token, setToken] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [c, setC] = useState<SmasheContent>(SMASHE_DEFAULTS)

  useEffect(() => {
    document.title = 'Smashé · İçerik Editörü'
    fetch(`${API_BASE}/api/settings/smasheContent`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.smasheContent) setC(mergeSmashe(SMASHE_DEFAULTS, d.smasheContent)) })
      .catch(() => {})
  }, [])

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const r = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error || 'Giriş başarısız'); return }
      if (!['OWNER', 'ADMIN', 'MANAGER'].includes(d.user?.role)) { setError('Bu panele yalnızca yönetici girebilir'); return }
      setToken(d.token)
    } catch { setError('Bağlantı hatası') } finally { setBusy(false) }
  }

  const save = async () => {
    setBusy(true)
    try {
      const r = await fetch(`${API_BASE}/api/settings/smasheContent`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ value: c }),
      })
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || 'Kaydedilemedi') }
      flash('Yayınlandı! Ana sayfa güncellendi.')
    } catch (e) { flash('Hata: ' + (e instanceof Error ? e.message : '')) } finally { setBusy(false) }
  }

  // Yardımcılar — iç içe alan güncelleme
  const set = (patch: Partial<SmasheContent>) => setC({ ...c, ...patch })
  const setMenuItem = (i: number, p: Partial<SmasheContent['menu']['items'][0]>) =>
    set({ menu: { ...c.menu, items: c.menu.items.map((x, j) => (j === i ? { ...x, ...p } : x)) } })
  const setStep = (i: number, p: Partial<SmasheContent['steps']['items'][0]>) =>
    set({ steps: { ...c.steps, items: c.steps.items.map((x, j) => (j === i ? { ...x, ...p } : x)) } })
  const setHour = (i: number, p: Partial<SmasheContent['konum']['hours'][0]>) =>
    set({ konum: { ...c.konum, hours: c.konum.hours.map((x, j) => (j === i ? { ...x, ...p } : x)) } })

  if (!token) {
    return (
      <main className="grid min-h-screen place-items-center p-4" style={{ background: NAVY }}>
        <form onSubmit={login} className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl">
          <h1 className="text-2xl font-extrabold" style={{ color: NAVY, fontFamily: "'Alfa Slab One', Georgia, serif" }}>SMASHÉ</h1>
          <p className="mb-6 mt-1 text-sm text-gray-500">İçerik editörü — restoran hesabınla gir</p>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-posta" className={`${inp} mb-3`} autoFocus />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Şifre" className={`${inp} mb-4`} />
          {error && <p className="mb-3 text-sm font-semibold text-red-600">{error}</p>}
          <button type="submit" disabled={busy} className="w-full rounded-full py-3 font-bold text-white disabled:opacity-60" style={{ background: NAVY }}>
            {busy ? 'Giriş yapılıyor...' : 'Giriş yap'}
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="min-h-screen" style={{ background: '#f4f6fb', color: NAVY }}>
      {toast && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full px-6 py-3 font-bold text-white shadow-xl" style={{ background: NAVY }}>
          {toast}
        </div>
      )}

      {/* Üst bar */}
      <header className="sticky top-0 z-40 bg-white" style={{ borderBottom: `3px solid ${NAVY}` }}>
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <span className="text-xl font-extrabold" style={{ fontFamily: "'Alfa Slab One', Georgia, serif" }}>SMASHÉ · Editör</span>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm font-semibold underline opacity-70 hover:opacity-100">Siteyi gör</Link>
            <button onClick={save} disabled={busy} className="rounded-full px-6 py-2.5 font-bold text-white disabled:opacity-60" style={{ background: NAVY }}>
              {busy ? 'Kaydediliyor...' : '🚀 Yayınla'}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        {/* Hero */}
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-extrabold">🎯 Hero (açılış)</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Rozet (konum)"><input className={inp} value={c.hero.chip} onChange={(e) => set({ hero: { ...c.hero, chip: e.target.value } })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sticker üst"><input className={inp} value={c.hero.stickerA} onChange={(e) => set({ hero: { ...c.hero, stickerA: e.target.value } })} /></Field>
              <Field label="Sticker alt"><input className={inp} value={c.hero.stickerB} onChange={(e) => set({ hero: { ...c.hero, stickerB: e.target.value } })} /></Field>
            </div>
            <Field label="Başlık 1. satır"><input className={inp} value={c.hero.h1a} onChange={(e) => set({ hero: { ...c.hero, h1a: e.target.value } })} /></Field>
            <Field label="Başlık 2. satır"><input className={inp} value={c.hero.h1b} onChange={(e) => set({ hero: { ...c.hero, h1b: e.target.value } })} /></Field>
          </div>
          <div className="mt-4">
            <Field label="Paragraf"><textarea className={inp} rows={2} value={c.hero.p} onChange={(e) => set({ hero: { ...c.hero, p: e.target.value } })} /></Field>
          </div>
          <div className="mt-4">
            <Field label="Fotoğraf URL"><input className={inp} value={c.hero.photo} onChange={(e) => set({ hero: { ...c.hero, photo: e.target.value } })} /></Field>
          </div>
        </section>

        {/* Marquee */}
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-extrabold">➿ Kayan şerit</h2>
          {c.marquee.map((m, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <input className={inp} value={m} onChange={(e) => set({ marquee: c.marquee.map((x, j) => (j === i ? e.target.value : x)) })} />
              <button onClick={() => set({ marquee: c.marquee.filter((_, j) => j !== i) })} className="px-2 text-red-500">🗑️</button>
            </div>
          ))}
          <button onClick={() => set({ marquee: [...c.marquee, ''] })} className="text-sm font-bold underline">+ Satır ekle</button>
        </section>

        {/* Menü */}
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-extrabold">🍔 Menü vitrini</h2>
          <Field label="Bölüm başlığı"><input className={inp} value={c.menu.title} onChange={(e) => set({ menu: { ...c.menu, title: e.target.value } })} /></Field>
          {c.menu.items.map((m, i) => (
            <div key={i} className="mt-4 rounded-2xl border-2 p-4" style={{ borderColor: 'rgba(18,42,92,0.15)' }}>
              <div className="grid gap-3 md:grid-cols-[1fr_120px_140px]">
                <Field label="Ürün adı"><input className={inp} value={m.name} onChange={(e) => setMenuItem(i, { name: e.target.value })} /></Field>
                <Field label="Fiyat ₺"><input type="number" className={inp} value={m.price} onChange={(e) => setMenuItem(i, { price: Number(e.target.value) })} /></Field>
                <Field label="Etiket"><input className={inp} value={m.tag} onChange={(e) => setMenuItem(i, { tag: e.target.value })} /></Field>
              </div>
              <div className="mt-3"><Field label="Açıklama"><textarea rows={2} className={inp} value={m.desc} onChange={(e) => setMenuItem(i, { desc: e.target.value })} /></Field></div>
              <div className="mt-3 flex items-end gap-3">
                <div className="flex-1"><Field label="Fotoğraf URL"><input className={inp} value={m.photo} onChange={(e) => setMenuItem(i, { photo: e.target.value })} /></Field></div>
                <img src={m.photo} alt="" className="h-14 w-14 rounded-lg object-cover" style={{ border: `2px solid ${NAVY}` }} />
                <button onClick={() => set({ menu: { ...c.menu, items: c.menu.items.filter((_, j) => j !== i) } })} className="pb-2 text-red-500">🗑️</button>
              </div>
            </div>
          ))}
          <button
            onClick={() => set({ menu: { ...c.menu, items: [...c.menu.items, { name: '', desc: '', price: 0, tag: '', photo: '', alt: '' }] } })}
            className="mt-4 text-sm font-bold underline"
          >
            + Ürün ekle
          </button>
        </section>

        {/* Adımlar */}
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-extrabold">🔥 Nasıl smash'lenir</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Başlık"><input className={inp} value={c.steps.title} onChange={(e) => set({ steps: { ...c.steps, title: e.target.value } })} /></Field>
            <Field label="Yan not"><input className={inp} value={c.steps.note} onChange={(e) => set({ steps: { ...c.steps, note: e.target.value } })} /></Field>
          </div>
          {c.steps.items.map((s, i) => (
            <div key={i} className="mt-3 grid gap-3 md:grid-cols-[160px_1fr]">
              <Field label={`Adım ${i + 1} başlık`}><input className={inp} value={s.title} onChange={(e) => setStep(i, { title: e.target.value })} /></Field>
              <Field label="Metin"><input className={inp} value={s.body} onChange={(e) => setStep(i, { body: e.target.value })} /></Field>
            </div>
          ))}
          <div className="mt-4"><Field label="Geniş fotoğraf URL"><input className={inp} value={c.steps.photo} onChange={(e) => set({ steps: { ...c.steps, photo: e.target.value } })} /></Field></div>
        </section>

        {/* Piknik */}
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-extrabold">🧺 Piknik bölümü</h2>
          <Field label="Başlık"><input className={inp} value={c.picnic.title} onChange={(e) => set({ picnic: { ...c.picnic, title: e.target.value } })} /></Field>
          <div className="mt-3"><Field label="Paragraf 1"><textarea rows={2} className={inp} value={c.picnic.p1} onChange={(e) => set({ picnic: { ...c.picnic, p1: e.target.value } })} /></Field></div>
          <div className="mt-3"><Field label="Paragraf 2"><textarea rows={2} className={inp} value={c.picnic.p2} onChange={(e) => set({ picnic: { ...c.picnic, p2: e.target.value } })} /></Field></div>
          <div className="mt-3"><Field label="Fotoğraf URL"><input className={inp} value={c.picnic.photo} onChange={(e) => set({ picnic: { ...c.picnic, photo: e.target.value } })} /></Field></div>
        </section>

        {/* Konum */}
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-extrabold">📍 Konum & saatler</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Başlık"><input className={inp} value={c.konum.title} onChange={(e) => set({ konum: { ...c.konum, title: e.target.value } })} /></Field>
            <Field label="Google Maps linki"><input className={inp} value={c.konum.mapsUrl} onChange={(e) => set({ konum: { ...c.konum, mapsUrl: e.target.value } })} /></Field>
            <Field label="Adres satır 1"><input className={inp} value={c.konum.addr1} onChange={(e) => set({ konum: { ...c.konum, addr1: e.target.value } })} /></Field>
            <Field label="Adres satır 2"><input className={inp} value={c.konum.addr2} onChange={(e) => set({ konum: { ...c.konum, addr2: e.target.value } })} /></Field>
          </div>
          {c.konum.hours.map((h, i) => (
            <div key={i} className="mt-3 flex gap-3">
              <input className={inp} value={h.d} onChange={(e) => setHour(i, { d: e.target.value })} placeholder="Günler" />
              <input className={`${inp} max-w-[180px]`} value={h.h} onChange={(e) => setHour(i, { h: e.target.value })} placeholder="Saatler" />
              <button onClick={() => set({ konum: { ...c.konum, hours: c.konum.hours.filter((_, j) => j !== i) } })} className="px-2 text-red-500">🗑️</button>
            </div>
          ))}
          <button onClick={() => set({ konum: { ...c.konum, hours: [...c.konum.hours, { d: '', h: '' }] } })} className="mt-2 text-sm font-bold underline">+ Satır ekle</button>
          <div className="mt-4"><Field label="Fotoğraf URL"><input className={inp} value={c.konum.photo} onChange={(e) => set({ konum: { ...c.konum, photo: e.target.value } })} /></Field></div>
        </section>

        {/* Footer */}
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-extrabold">🔗 Footer</h2>
          <Field label="Instagram URL"><input className={inp} value={c.footer.instagram} onChange={(e) => set({ footer: { instagram: e.target.value } })} /></Field>
        </section>

        <div className="flex items-center justify-between pb-10">
          <button
            onClick={() => { if (window.confirm('Tüm yazılar varsayılana dönsün mü?')) setC(SMASHE_DEFAULTS) }}
            className="text-sm font-semibold text-red-600 underline"
          >
            Varsayılana dön
          </button>
          <button onClick={save} disabled={busy} className="rounded-full px-8 py-3 font-bold text-white disabled:opacity-60" style={{ background: NAVY }}>
            {busy ? 'Kaydediliyor...' : '🚀 Yayınla'}
          </button>
        </div>
      </div>
    </main>
  )
}
