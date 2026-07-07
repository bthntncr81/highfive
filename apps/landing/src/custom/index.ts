import type { ComponentType } from 'react'
import { SmasheLanding } from './SmasheLanding'

// Premium elle kodlanmış tenant landing'leri. theme.customLanding anahtarı
// buradaki bir girişe denk gelirse (ve published=true ise) kök '/' onu render eder.
// Her yeni özel tasarım: bileşeni yaz → buraya kaydet → tenant theme'ine anahtarı yaz.
export const CUSTOM_LANDINGS: Record<string, ComponentType> = {
  smashe: SmasheLanding,
}
