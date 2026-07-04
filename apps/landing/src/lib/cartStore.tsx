import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { MenuItem } from '../content/content.schema'

// API'den gelen menü item formatı
export type APIMenuItemForCart = {
  id: string
  name: string
  description: string
  price: number
  image: string
  categoryId: string
  badges: string[]
}

export type CartItem = {
  item: MenuItem
  quantity: number
}

// Bundle/Combo cart entry — separate from regular items because of nested
// per-group selections + server-side pricing. We snapshot enough to render
// the cart line without re-fetching the bundle definition.
export type BundleCartEntry = {
  uid: string                       // local-only key for editing/removing one of N copies
  bundleId: string
  name: string
  image?: string
  totalPrice: number                // computed locally for display only — server re-validates
  selections: {
    groupId: string
    groupName: string
    items: { id: string; name: string; price: number }[] // priced for ADD_PRICE display, server ignores
  }[]
  fixedItemNames: string[]          // for display
}

// Builder (custom pizza/sandviç) cart entry — kullanıcının kendi tasarladığı ürün.
// Server-side fiyat doğrulaması yapılır (cart id "builder:" ile başlar).
export type BuilderCartEntry = {
  uid: string                       // lokal key
  builderType: 'pizza' | 'sandwich'
  baseId: string
  baseName: string
  baseImage?: string
  // Layered preview için tüm seçili katmanların URL'leri (layerOrder'a göre sıralı).
  // Sepette base + her layer üst üste render edilir → kullanıcı tasarladığı pizzayı görür.
  previewLayers?: string[]
  ingredientIds: string[]           // sıralı, server'da reuse için
  totalPrice: number                // gösterim için (server validate eder)
  // Detay: kategoriye göre seçilen ingredients (cart UI gösterimi için)
  selections: {
    category: string                // BASE_SAUCE / CHEESE / MEAT / VEGETABLE / TOP_SAUCE
    items: { id: string; name: string; extraPrice: number }[]
  }[]
}

export type TableSession = {
  id: string
  number: number
  name: string
  sessionToken: string // Session token for validation
} | null

type CartContextValue = {
  items: CartItem[]
  bundles: BundleCartEntry[]
  builders: BuilderCartEntry[]
  addItem: (item: MenuItem) => void
  addItemFromAPI: (apiItem: APIMenuItemForCart) => void // API formatından ekleme
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  addBundle: (entry: Omit<BundleCartEntry, 'uid'>) => void
  removeBundle: (uid: string) => void
  addBuilderItem: (entry: Omit<BuilderCartEntry, 'uid'>) => void
  removeBuilderItem: (uid: string) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  // Table session
  tableSession: TableSession
  setTableSession: (table: TableSession) => void
  clearTableSession: () => void
}

const CART_STORAGE_KEY = 'highfive-cart'
const BUNDLES_STORAGE_KEY = 'highfive-cart-bundles'
const BUILDERS_STORAGE_KEY = 'highfive-cart-builders'
const TABLE_SESSION_KEY = 'highfive-table-session'

const CartContext = createContext<CartContextValue | undefined>(undefined)

const loadCart = (): CartItem[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as CartItem[]
  } catch {
    return []
  }
}

const saveCart = (items: CartItem[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
}

const loadBundles = (): BundleCartEntry[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(BUNDLES_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as BundleCartEntry[]
  } catch {
    return []
  }
}

const saveBundles = (entries: BundleCartEntry[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(BUNDLES_STORAGE_KEY, JSON.stringify(entries))
}

const loadBuilders = (): BuilderCartEntry[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(BUILDERS_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as BuilderCartEntry[]
  } catch {
    return []
  }
}

const saveBuilders = (entries: BuilderCartEntry[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(BUILDERS_STORAGE_KEY, JSON.stringify(entries))
}

const loadTableSession = (): TableSession => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(TABLE_SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as TableSession
  } catch {
    return null
  }
}

const saveTableSession = (table: TableSession) => {
  if (typeof window === 'undefined') return
  if (table) {
    localStorage.setItem(TABLE_SESSION_KEY, JSON.stringify(table))
  } else {
    localStorage.removeItem(TABLE_SESSION_KEY)
  }
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => loadCart())
  const [bundles, setBundles] = useState<BundleCartEntry[]>(() => loadBundles())
  const [builders, setBuilders] = useState<BuilderCartEntry[]>(() => loadBuilders())
  const [isOpen, setIsOpen] = useState(false)
  const [tableSession, setTableSessionState] = useState<TableSession>(() => loadTableSession())

  // Persist cart to localStorage
  useEffect(() => {
    saveCart(items)
  }, [items])

  useEffect(() => {
    saveBundles(bundles)
  }, [bundles])

  useEffect(() => {
    saveBuilders(builders)
  }, [builders])

  const addItem = useCallback((item: MenuItem) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((ci) => ci.item.id === item.id)
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        }
        return updated
      }
      return [...prev, { item, quantity: 1 }]
    })
  }, [])

  // API formatından MenuItem'e dönüştürüp ekleme
  const addItemFromAPI = useCallback((apiItem: APIMenuItemForCart) => {
    const menuItem: MenuItem = {
      id: apiItem.id,
      name: apiItem.name,
      desc: apiItem.description,
      price: apiItem.price,
      image: apiItem.image,
      category: apiItem.categoryId,
      badges: apiItem.badges,
    }
    
    setItems((prev) => {
      const existingIndex = prev.findIndex((ci) => ci.item.id === menuItem.id)
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        }
        return updated
      }
      return [...prev, { item: menuItem, quantity: 1 }]
    })
  }, [])

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((ci) => ci.item.id !== itemId))
  }, [])

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((ci) => ci.item.id !== itemId))
      return
    }
    setItems((prev) =>
      prev.map((ci) =>
        ci.item.id === itemId ? { ...ci, quantity } : ci
      )
    )
  }, [])

  const addBundle = useCallback((entry: Omit<BundleCartEntry, 'uid'>) => {
    const uid = `b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    setBundles((prev) => [...prev, { ...entry, uid }])
  }, [])

  const removeBundle = useCallback((uid: string) => {
    setBundles((prev) => prev.filter((b) => b.uid !== uid))
  }, [])

  const addBuilderItem = useCallback((entry: Omit<BuilderCartEntry, 'uid'>) => {
    const uid = `bdr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    setBuilders((prev) => [...prev, { ...entry, uid }])
  }, [])

  const removeBuilderItem = useCallback((uid: string) => {
    setBuilders((prev) => prev.filter((b) => b.uid !== uid))
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    setBundles([])
    setBuilders([])
  }, [])

  const openCart = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])
  const toggleCart = useCallback(() => setIsOpen((prev) => !prev), [])

  const setTableSession = useCallback((table: TableSession) => {
    setTableSessionState(table)
    saveTableSession(table)
  }, [])

  const clearTableSession = useCallback(() => {
    setTableSessionState(null)
    saveTableSession(null)
  }, [])

  const totalItems = useMemo(
    () => items.reduce((sum, ci) => sum + ci.quantity, 0) + bundles.length + builders.length,
    [items, bundles, builders]
  )

  const totalPrice = useMemo(
    () =>
      items.reduce((sum, ci) => sum + ci.item.price * ci.quantity, 0) +
      bundles.reduce((sum, b) => sum + b.totalPrice, 0) +
      builders.reduce((sum, b) => sum + b.totalPrice, 0),
    [items, bundles, builders]
  )

  const value = useMemo(
    () => ({
      items,
      bundles,
      builders,
      addItem,
      addItemFromAPI,
      removeItem,
      updateQuantity,
      addBundle,
      removeBundle,
      addBuilderItem,
      removeBuilderItem,
      clearCart,
      totalItems,
      totalPrice,
      isOpen,
      openCart,
      closeCart,
      toggleCart,
      tableSession,
      setTableSession,
      clearTableSession,
    }),
    [items, bundles, builders, addItem, addItemFromAPI, removeItem, updateQuantity, addBundle, removeBundle, addBuilderItem, removeBuilderItem, clearCart, totalItems, totalPrice, isOpen, openCart, closeCart, toggleCart, tableSession, setTableSession, clearTableSession]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}
