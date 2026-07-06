import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app/app';
import './styles.css';
import { bootstrapTheme } from './app/lib/theme';

// Tenant beyaz-etiket teması — render'dan önce cache'ten anında uygula, sonra taze
// çek (FOUC yok). Hata olsa bile app render edilir (varsayılan HighFive teması).
bootstrapTheme().catch(() => {});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// basename = Vite BASE_URL: subdomain alt-yolunda (/pos/) sunulunca router doğru
// çalışır; kök dizinde (base '/') sunulunca BASE_URL '/' olur → davranış değişmez.
root.render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>
);
