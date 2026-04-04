import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface ServiceSettings {
  takeawayEnabled: boolean
  deliveryEnabled: boolean
  onlinePaymentEnabled: boolean
  cartEnabled: boolean
  deliveryFee: number
  orderHoursEnabled: boolean
  orderHoursStart: string
  orderHoursEnd: string
}

interface PublicSettings {
  services: ServiceSettings
  whatsappEnabled: boolean
  isWithinOrderHours: boolean
}

const defaultSettings: PublicSettings = {
  services: {
    takeawayEnabled: true,
    deliveryEnabled: true,
    onlinePaymentEnabled: true,
    cartEnabled: true,
    deliveryFee: 29,
    orderHoursEnabled: false,
    orderHoursStart: '11:00',
    orderHoursEnd: '23:00',
  },
  whatsappEnabled: true,
  isWithinOrderHours: true,
}

function checkOrderHours(services: ServiceSettings): boolean {
  if (!services.orderHoursEnabled) return true
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const [startH, startM] = (services.orderHoursStart || '11:00').split(':').map(Number)
  const [endH, endM] = (services.orderHoursEnd || '23:00').split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  if (endMinutes > startMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  } else {
    // Overnight (e.g. 22:00 - 02:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  }
}

let cachedSettings: PublicSettings | null = null
let fetchPromise: Promise<PublicSettings> | null = null

const fetchSettings = async (): Promise<PublicSettings> => {
  try {
    const [servicesRes, whatsappRes] = await Promise.all([
      fetch(`${API_BASE}/api/settings/public/services`),
      fetch(`${API_BASE}/api/settings/public/restaurant`),
    ])
    const servicesData = await servicesRes.json()
    const whatsappData = await whatsappRes.json()

    const services = { ...defaultSettings.services, ...servicesData.services }

    return {
      services,
      whatsappEnabled: whatsappData.whatsapp?.enabled !== false,
      isWithinOrderHours: checkOrderHours(services),
    }
  } catch {
    return defaultSettings
  }
}

export const useSettings = (): PublicSettings => {
  const [settings, setSettings] = useState<PublicSettings>(cachedSettings || defaultSettings)

  useEffect(() => {
    if (cachedSettings) {
      setSettings(cachedSettings)
      return
    }
    if (!fetchPromise) {
      fetchPromise = fetchSettings()
    }
    fetchPromise.then((data) => {
      cachedSettings = data
      setSettings(data)
    })
  }, [])

  // Re-check order hours every minute
  useEffect(() => {
    const interval = setInterval(() => {
      if (cachedSettings?.services.orderHoursEnabled) {
        const inHours = checkOrderHours(cachedSettings.services)
        setSettings((prev) => ({ ...prev, isWithinOrderHours: inHours }))
      }
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  return settings
}
