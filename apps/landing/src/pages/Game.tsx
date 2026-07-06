import { useContent } from '../lib/contentStore'

// Pizza Şefi mini-oyunu. Oyunun kendisi public/oyun.html'de (kendi içinde çalışan,
// global liderliği /api/pizza-game'e bağlı). Burada navbar altında TAM EKRAN iframe ile
// gömülür; böylece mobilde oyunun alt kısmı (malzemeler + buton) kesilmez.
// Beyaz-etiket: iframe'e tenant adı/başlık/mark/marka rengi query paramı ile geçilir;
// oyun açık değilse (content.game.enabled) dostça bir "oyun yok" durumu gösterilir.
export default function Game() {
  const { content } = useContent()

  // Tenant oyunu kapattıysa iframe yerine nötr bir bilgilendirme göster.
  if (!content.game?.enabled) {
    return (
      <div
        style={{
          height: 'calc(100dvh - 73px)',
          width: '100%',
          background: '#1a1512',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          textAlign: 'center',
          padding: 24,
        }}
      >
        <div style={{ fontSize: 56, lineHeight: 1 }}>🎮</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>
          Bu restoranda oyun yok
        </h1>
        <p style={{ opacity: 0.7, maxWidth: 320, margin: 0 }}>
          {content.site.name || 'Bu işletme'} henüz mini oyunu açmadı. Lütfen daha
          sonra tekrar bak!
        </p>
      </div>
    )
  }

  const params = new URLSearchParams({
    name: content.site.name || '',
    title: content.game?.title || '',
    mark: content.game?.mark || '',
    primary: content.site.primaryColor || '',
  }).toString()

  return (
    <div
      style={{
        height: 'calc(100dvh - 73px)', // sticky navbar (h-[72px] + 1px border) altı tüm ekran
        width: '100%',
        background: '#1a1512',
        overflow: 'hidden',
      }}
    >
      <iframe
        src={`/oyun.html?${params}`}
        title={content.site.name || 'Oyun'}
        style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
      />
    </div>
  )
}
