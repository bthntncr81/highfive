import { createContext, useContext, useMemo, useState } from 'react'
import defaultContentJson from '../content/content.default.json'
import type { Content } from '../content/content.schema'

const CONTENT_STORAGE_KEY = 'highfive-content'

const defaultContent = defaultContentJson as Content

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isValidContent = (value: unknown): value is Content => {
  if (!isRecord(value)) return false
  return (
    isRecord(value.site) &&
    isRecord(value.hero) &&
    isRecord(value.menu) &&
    Array.isArray(value.menu.items)
  )
}

export const loadContent = (): Content => {
  if (typeof window === 'undefined') return defaultContent
  try {
    const raw = localStorage.getItem(CONTENT_STORAGE_KEY)
    if (!raw) return defaultContent
    const parsed = JSON.parse(raw) as unknown
    return isValidContent(parsed) ? parsed : defaultContent
  } catch {
    return defaultContent
  }
}

export const saveContent = (content: Content) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(CONTENT_STORAGE_KEY, JSON.stringify(content))
}

export const resetContent = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CONTENT_STORAGE_KEY)
}

export const downloadContent = (content: Content) => {
  const blob = new Blob([JSON.stringify(content, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'highfive-content.json'
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

