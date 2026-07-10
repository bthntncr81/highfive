import type { ComponentType } from 'react'
import { SmasheLanding } from './SmasheLanding'
import { UstaDonerLanding } from './UstaDonerLanding'
import { SushiselLanding } from './SushiselLanding'
import { PidemLanding } from './PidemLanding'
import { MokkaLanding } from './MokkaLanding'
import { SerbetLanding } from './SerbetLanding'
import { MaktiLanding, MaktiNav, MaktiFooter } from './MaktiLanding'

// Premium elle kodlanmış tenant landing'leri. theme.customLanding anahtarı
// buradaki bir girişe denk gelirse (ve published=true ise) kök '/' onu render eder.
// Her yeni özel tasarım: bileşeni yaz → buraya kaydet → tenant theme'ine anahtarı yaz.
export const CUSTOM_LANDINGS: Record<string, ComponentType> = {
  smashe: SmasheLanding,
  ustadoner: UstaDonerLanding,
  sushisel: SushiselLanding,
  pidem: PidemLanding,
  mokka: MokkaLanding,
  serbet: SerbetLanding,
  makti: MaktiLanding,
}

// Tenant'a özel App-seviyesi chrome: buraya kayıtlı tenant'larda paylaşılan
// Navbar/Footer yerine markalı Nav/Footer HER sayfada render edilir (kök dahil)
// — landing bileşeni artık kendi header/footer'ını taşımaz. Kayıtsız custom
// landing'ler (smashe, ustadoner, ...) eski davranışını korur: kökte kendi
// nav'ları, diğer sayfalarda standart chrome.
export const CUSTOM_CHROME: Record<string, { Nav: ComponentType; Footer: ComponentType }> = {
  makti: { Nav: MaktiNav, Footer: MaktiFooter },
}
