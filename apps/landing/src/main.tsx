import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.tsx'
import { bootstrapTheme } from './lib/theme'

// Tenant beyaz-etiket teması — render'dan önce cache'ten anında uygula, sonra taze
// çek (FOUC yok). Hata olsa bile app render edilir (varsayılan HighFive teması).
bootstrapTheme().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
