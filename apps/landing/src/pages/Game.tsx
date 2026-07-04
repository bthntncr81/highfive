// Pizza Şefi mini-oyunu. Oyunun kendisi public/oyun.html'de (kendi içinde çalışan,
// global liderliği /api/pizza-game'e bağlı). Burada navbar altında TAM EKRAN iframe ile
// gömülür; böylece mobilde oyunun alt kısmı (malzemeler + buton) kesilmez.
export default function Game() {
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
        src="/oyun.html"
        title="High Five Pizza Şefi"
        style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
      />
    </div>
  );
}
