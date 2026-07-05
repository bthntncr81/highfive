# Product

## Register

brand

> Not: Bu monorepo'nun asıl ürünleri (POS/Kitchen/order-site) product register'ıdır;
> bu dosya öncelikle otorder.com pazarlama yüzeyi (apps/saas-landing) için yazıldı.
> Uygulama içi işler için görev bazında product register'a geçilir.

## Users

Türkiye'deki bağımsız restoran, pizzacı ve kafe sahipleri. Çoğu tek şubeli,
teknik olmayan, telefonundan veya kasadaki bilgisayardan bakıyor; akşam servisi
sonrası yorgunken karar veriyor. İş: "adisyon karmaşasını bitir, siparişi
mutfağa hatasız ulaştır, komisyon ödemeden online sipariş al." Karar verirken
güven arıyor: fiyat net mi, kurulum gerçekten kolay mı, canlıda çalışan var mı?

## Product Purpose

OtOrder: restoranlara abonelikle satılan sipariş/yönetim platformu. POS +
mutfak ekranı (KDS) + restoranın kendi markasıyla online sipariş sitesi + QR
menü + sadakat/kampanya + kurye takibi. otorder.com bu ürünü satar: ziyaretçi
14 gün ücretsiz denemeye kaydolur, subdomain'i dakikalar içinde açılır.
Başarı = kayıt başlatma oranı; sayfa ürünün kalitesini kendisi kanıtlamalı.

## Brand Personality

"Beyaz önlük": titiz, servis disiplinli, güven veren. Ütülenmiş şef önlüğü ve
düzgün kurulmuş masa gibi: sessiz özgüven, sıfır gösteriş. Ton: net, somut,
kısa cümleler; abartı ve ünlem yok. Duygu hedefi: "bunlar işini biliyor,
başım ağrımaz."

## Anti-references

- Mor/indigo şablon SaaS: gradyan hero, birbirinin aynısı ikon-kart ızgaraları,
  emoji ikonlar, "işinizi dönüştürün" dili. (Kullanıcının açık anti-referansı.)
- Pazar yeri agresifliği (bağıran kampanya rozetleri, kalabalık renk).
- Genel AI-landing grameri: her bölümün üstünde tracked-uppercase eyebrow,
  hero-metrik şablonu, gradient text.

## Design Principles

1. **Ürünü göster, sıfat kullanma.** Ekran görüntüsü/gerçeğe sadık UI mockup'ı
   her iddianın yanında durur; "güçlü", "kusursuz" gibi kelimeler yasak.
2. **Restoran dilinden konuş.** Adisyon, servis, gün sonu, kurye: metafor ve
   motifler mutfaktan gelir (ör. fiyatlar adisyon fişi gibi).
3. **Beyaz zemin, tek renk imza.** Saf beyaz üzerinde derin yosun yeşili;
   renk %10'u geçmez, geçtiği tek yer bilinçli tek bir bant/an olabilir.
4. **Kanıt: canlı sistem.** Gerçek plan verisi API'den gelir; "Akçakoca'da
   canlı" gibi doğrulanabilir ifadeler kullanılır, uydurma metrik kullanılmaz.
5. **Sessiz ama işlenmiş.** Kısıtlılık tembellik değil: tipografi, hizalama,
   mikro-detay ve az sayıda kusursuz hareketle "pahalı" hissettir.

## Accessibility & Inclusion

WCAG 2.1 AA hedefi: gövde metni ≥4.5:1 kontrast, klavye erişimi, görünür
focus, `prefers-reduced-motion` alternatifleri, anlamlı alt metinler (Türkçe).
Dil: UI Türkçe; İngilizce buzzword kullanılmaz.
