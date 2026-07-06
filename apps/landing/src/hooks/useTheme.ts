import { useEffect, useState } from 'react'
import { getTheme, subscribeTheme, type TenantTheme } from '../lib/theme'

// Tenant temasını reaktif okur (bootstrapTheme ana giriş noktasında çekilir).
export function useTheme(): TenantTheme | null {
  const [theme, setTheme] = useState<TenantTheme | null>(getTheme())
  useEffect(() => subscribeTheme(setTheme), [])
  return theme
}
