import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { loyaltyApi, type LoyaltyCustomer } from './api'

const LOYALTY_STORAGE_KEY = 'highfive-loyalty-member'

interface LoyaltyContextType {
  member: LoyaltyCustomer | null
  isLoading: boolean
  login: (phone: string) => Promise<boolean>
  register: (phone: string, name?: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  refreshMember: () => Promise<void>
  redeemPoints: (points: number) => number // Returns discount amount
}

const LoyaltyContext = createContext<LoyaltyContextType | undefined>(undefined)

export const LoyaltyProvider = ({ children }: { children: ReactNode }) => {
  const [member, setMember] = useState<LoyaltyCustomer | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load member from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(LOYALTY_STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Only set member if phone exists
        if (parsed && parsed.phone) {
          setMember(parsed)
          // Refresh member data from API
          refreshMemberData(parsed.phone)
        } else {
          // Invalid data, remove it
          localStorage.removeItem(LOYALTY_STORAGE_KEY)
        }
      } catch {
        localStorage.removeItem(LOYALTY_STORAGE_KEY)
      }
    }
    setIsLoading(false)
  }, [])

  const refreshMemberData = async (phone: string) => {
    // Don't make API call if phone is undefined or empty
    if (!phone) {
      console.warn('Cannot refresh member data: phone is undefined')
      return
    }
    try {
      const response = await loyaltyApi.lookupCustomer(phone)
      if (response.success && response.data?.customer) {
        // API'den dönen veriye phone'u ekle (kaybolmasın)
        const updatedMember = { ...response.data.customer, phone }
        setMember(updatedMember)
        localStorage.setItem(LOYALTY_STORAGE_KEY, JSON.stringify(updatedMember))
      }
    } catch (error) {
      console.error('Error refreshing member:', error)
    }
  }

  const login = useCallback(async (phone: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      const response = await loyaltyApi.lookupCustomer(phone.replace(/\D/g, ''))
      if (response.success && response.data?.customer) {
        setMember(response.data.customer)
        localStorage.setItem(LOYALTY_STORAGE_KEY, JSON.stringify(response.data.customer))
        return true
      }
      return false
    } catch {
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (phone: string, name?: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    try {
      const response = await loyaltyApi.register({
        phone: phone.replace(/\D/g, ''),
        name,
      })
      if (response.success && response.data?.customer) {
        setMember(response.data.customer)
        localStorage.setItem(LOYALTY_STORAGE_KEY, JSON.stringify(response.data.customer))
        return { success: true }
      }
      return { success: false, error: response.error || 'Kayıt başarısız' }
    } catch {
      return { success: false, error: 'Sunucuya bağlanılamadı' }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setMember(null)
    localStorage.removeItem(LOYALTY_STORAGE_KEY)
  }, [])

  const refreshMember = useCallback(async () => {
    if (member && member.phone) {
      await refreshMemberData(member.phone)
    }
  }, [member])

  const redeemPoints = useCallback((points: number): number => {
    // 100 puan = 10 TL indirim
    return Math.floor(points / 100) * 10
  }, [])

  return (
    <LoyaltyContext.Provider
      value={{
        member,
        isLoading,
        login,
        register,
        logout,
        refreshMember,
        redeemPoints,
      }}
    >
      {children}
    </LoyaltyContext.Provider>
  )
}

export const useLoyalty = () => {
  const context = useContext(LoyaltyContext)
  if (!context) {
    throw new Error('useLoyalty must be used within LoyaltyProvider')
  }
  return context
}

