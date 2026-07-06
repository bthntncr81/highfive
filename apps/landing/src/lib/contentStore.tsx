import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import defaultContentJson from '../content/content.default.json'
import type { Content } from '../content/content.schema'

// Beyaz-etiket: içerik artık TENANT başına. Açılışta /api/settings/public/content
// çekilir (tenant'ın 'siteContent' blob'u) ve bundled default'un ÜSTÜNE bindirilir.
// Tenant düzenlemediyse default (nötr şablon) + tenant adı gösterilir → High Five sızmaz.
// localStorage cache subdomain'e göre anahtarlanır (çapraz tenant sızıntısı yok).

const API_BASE = (import.meta as any).env?.VITE_API_URL || ''

const defaultContent = defaultContentJson as Content

const subdomain = (): string =>
  typeof window !== 'undefined' ? window.location.hostname.split('.')[0] : 'default'

const cacheKey = () => `otorder.content.${subdomain()}`

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isValidContent = (value: unknown): value is Content => {
  if (!isRecord(value)) return false
  return (
    isRecord(value.site) &&
    isRecord(value.hero) &&
    isRecord(value.menu) &&
    Array.isArray((value.menu as Record<string, unknown>).items)
  )
}

// Derin birleştirme: nesneler recursive birleşir; diziler ve primitive'ler override eder.
const deepMerge = (base: unknown, override: unknown): unknown => {
  if (Array.isArray(override)) return override
  if (isRecord(base) && isRecord(override)) {
    const out: Record<string, unknown> = { ...base }
    for (const k of Object.keys(override)) {
      out[k] = k in base ? deepMerge(base[k], override[k]) : override[k]
    }
    return out
  }
  return override === undefined ? base : override
}

// Tenant içeriğini default'un üstüne bindir + tenant kendi adını set etmediyse enjekte et.
const mergeTenant = (
  tenantContent: Partial<Content> | null,
  tenantName: string | null,
  subdomainName: string | null,
): Content => {
  const merged = (
    tenantContent ? deepMerge(defaultContent, tenantContent) : { ...defaultContent }
  ) as Content
  if (tenantName) {
    const ownName = tenantContent && isRecord(tenantContent.site) && (tenantContent.site as Record<string, unknown>).name
    if (!ownName) {
      merged.site = { ...merged.site, name: tenantName, logoText: tenantName }
    }
  }
  if (subdomainName && !merged.site.domain) {
    merged.site = { ...merged.site, domain: `${subdomainName}.otorder.com` }
  }
  return merged
}

export const loadContent = (): Content => {
  if (typeof window === 'undefined') return defaultContent
  try {
    const raw = localStorage.getItem(cacheKey())
    if (!raw) return defaultContent
    const parsed = JSON.parse(raw) as unknown
    return isValidContent(parsed) ? parsed : defaultContent
  } catch {
    return defaultContent
  }
}

export const saveContent = (content: Content) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(cacheKey(), JSON.stringify(content))
  } catch {
    /* kota dolabilir — yut */
  }
}

export const resetContent = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(cacheKey())
}

// Açılış: tenant içeriğini API'den çek, default üstüne bindir, cache'le.
export const bootstrapContent = async (): Promise<Content> => {
  if (typeof window === 'undefined') return defaultContent
  try {
    const res = await fetch(`${API_BASE}/api/settings/public/content`)
    if (!res.ok) return loadContent()
    const data = (await res.json()) as {
      content: Partial<Content> | null
      tenantName: string | null
      subdomain: string | null
    }
    const merged = mergeTenant(data.content, data.tenantName, data.subdomain)
    saveContent(merged)
    return merged
  } catch {
    return loadContent()
  }
}

// Tenant içeriğini API'ye kaydet (editör kullanır; owner/admin JWT gerekir).
export const saveContentToApi = async (content: Content, token: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/api/settings/siteContent`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ value: content }),
  })
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}))
    throw new Error((msg as { error?: string }).error || 'İçerik kaydedilemedi')
  }
}

export const downloadContent = (content: Content) => {
  const blob = new Blob([JSON.stringify(content, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'site-content.json'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const readContentFile = (file: File): Promise<Content> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as unknown
        if (!isValidContent(parsed)) {
          reject(new Error('Invalid content format'))
          return
        }
        resolve(parsed)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })

type ContentContextValue = {
  content: Content
  updateContent: (next: Content) => void
  resetToDefault: () => void
  setContentFromImport: (next: Content) => void
  defaultContent: Content
}

const ContentContext = createContext<ContentContextValue | undefined>(undefined)

export const ContentProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [content, setContent] = useState<Content>(() => loadContent())

  // Açılışta tenant içeriğini API'den çek (cache anında gösterilir, sonra taze gelir).
  useEffect(() => {
    bootstrapContent()
      .then(setContent)
      .catch(() => {
        /* default kalır */
      })
  }, [])

  const updateContent = (next: Content) => {
    setContent(next)
    saveContent(next)
  }

  const resetToDefault = () => {
    resetContent()
    setContent(defaultContent)
  }

  const setContentFromImport = (next: Content) => {
    setContent(next)
    saveContent(next)
  }

  const value = useMemo(
    () => ({
      content,
      updateContent,
      resetToDefault,
      setContentFromImport,
      defaultContent,
    }),
    [content],
  )

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
}

export const useContent = () => {
  const context = useContext(ContentContext)
  if (!context) {
    throw new Error('useContent must be used within ContentProvider')
  }
  return context
}
