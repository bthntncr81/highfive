import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface ServiceSettings {
  takeawayEnabled: boolean
  deliveryEnabled: boolean
  onlinePaymentEnabled: boolean
  cartEnabled: boolean
}

interface PublicSettings {
  services: ServiceSettings
  whatsappEnabled: boolean
}

const defaultSettings: PublicSettings = {
  services: {
    takeawayEnabled: true,
    deliveryEnabled: true,
    onlinePaymentEnabled: true,
    cartEnabled: true,
  },
  whatsappEnabled: true,
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

    return {
      services: { ...defaultSettings.services, ...servicesData.services },
      whatsappEnabled: whatsappData.whatsapp?.enabled !== false,
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

  return settings
}
