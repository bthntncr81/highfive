import { useEffect, useState } from 'react';
import { getTheme, subscribeTheme, brandLogoUrl, type TenantTheme } from '../lib/theme';

// Tenant temasını reaktif okur. brandName/brandLogo hazır türetilmiş döner.
export function useTheme() {
  const [theme, setTheme] = useState<TenantTheme | null>(getTheme());
  useEffect(() => subscribeTheme(setTheme), []);
  return {
    theme,
    brandName: theme?.name || '',
    brandLogo: brandLogoUrl(),
  };
}
