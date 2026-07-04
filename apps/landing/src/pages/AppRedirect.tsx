// /app — User Agent algılayarak iOS / Android mağaza sayfasına otomatik yönlendirir.
// Desktop'ta her iki badge ve QR'ı gösterir.

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

const APP_STORE_URL = 'https://apps.apple.com/tr/app/highfive-pizza/id6768074077'
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.highfive.mobile'

function detectPlatform(): 'ios' | 'android' | 'desktop' {
  const ua = navigator.userAgent || ''
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

export default function AppRedirect() {
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop' | null>(null)
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    const p = detectPlatform()
    setPlatform(p)
    if (p === 'ios') {
      setRedirecting(true)
      setTimeout(() => (window.location.href = APP_STORE_URL), 800)
    } else if (p === 'android') {
      setRedirecting(true)
      setTimeout(() => (window.location.href = PLAY_STORE_URL), 800)
    }
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      <div className="max-w-md w-full text-center text-white">
        <img src="/logo.svg" alt="HighFive" className="h-32 mx-auto mb-6" />
        {redirecting ? (
          <>
            <div className="text-5xl mb-3 animate-pulse">📱</div>
            <h1 className="font-heading font-bold text-2xl mb-2">
              Yönlendiriliyorsun...
            </h1>
            <p className="text-white/70 text-sm">
              {platform === 'ios' ? 'App Store' : 'Google Play'} açılıyor
            </p>
            <a
              href={platform === 'ios' ? APP_STORE_URL : PLAY_STORE_URL}
              className="inline-block mt-6 underline text-amber-300 text-sm"
            >
              Otomatik açılmadıysa burayı tıkla
            </a>
          </>
        ) : (
          <>
            <h1 className="font-heading font-bold text-3xl md:text-4xl mb-3">
              Mobil Uygulamayı İndir
            </h1>
            <p className="text-white/80 text-base mb-8">
              Daha hızlı sipariş, daha çok puan, sadece uygulamaya özel kampanyalar
            </p>

            {/* QR Code */}
            <div className="bg-white rounded-3xl p-6 mx-auto inline-block shadow-2xl mb-6">
              <QRCodeSVG value="https://highfivepps.com/app" size={200} level="M" fgColor="#0f172a" />
              <div className="text-[10px] uppercase tracking-widest text-foreground-muted mt-3 font-bold">
                Telefonunla tara
              </div>
            </div>

            {/* Store badges */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-white text-black px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl transition"
              >
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-wider opacity-70">App Store'da</div>
                  <div className="font-display font-bold text-lg leading-tight">İndir</div>
                </div>
              </a>
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-white text-black px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl transition"
              >
                <svg className="w-8 h-8" viewBox="0 0 24 24">
                  <path fill="#34a853" d="M3.75 20.5V3.5l13 8.5-13 8.5z" />
                  <path fill="#ea4335" d="M3.75 3.5l10 6.4-1.5 1L3.75 3.5z" />
                  <path fill="#4285f4" d="M3.75 20.5l8.5-7.4 1.5 1-10 6.4z" />
                </svg>
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-wider opacity-70">Google Play'de</div>
                  <div className="font-display font-bold text-lg leading-tight">İndir</div>
                </div>
              </a>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
