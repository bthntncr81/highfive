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

export type TableSession = {
  id: string
  number: number
  name: string
  sessionToken: string // Session token for validation
} | null

type CartContextValue = {
  items: CartItem[]
  addItem: (item: MenuItem) => void
  addItemFromAPI: (apiItem: APIMenuItemForCart) => void // API formatından ekleme
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
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
  const [isOpen, setIsOpen] = useState(false)
  const [tableSession, setTableSessionState] = useState<TableSession>(() => loadTableSession())

  // Persist cart to localStorage
  useEffect(() => {
    saveCart(items)
  }, [items])

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

  const clearCart = useCallback(() => {
    setItems([])
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
    () => items.reduce((sum, ci) => sum + ci.quantity, 0),
    [items]
  )

  const totalPrice = useMemo(
    () => items.reduce((sum, ci) => sum + ci.item.price * ci.quantity, 0),
    [items]
  )

  const value = useMemo(
    () => ({
      items,
      addItem,
      addItemFromAPI,
      removeItem,
      updateQuantity,
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
    [items, addItem, addItemFromAPI, removeItem, updateQuantity, clearCart, totalItems, totalPrice, isOpen, openCart, closeCart, toggleCart, tableSession, setTableSession, clearTableSession]
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
