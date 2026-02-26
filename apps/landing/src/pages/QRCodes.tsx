import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Table {
  id: string;
  number: number;
  name: string;
  status: string;
}

export const QRCodes = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState(window.location.origin);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/tables/public');
      const data = await response.json();
      setTables(data.tables || []);
    } catch (err) {
      setError('Masalar yüklenemedi. API çalışıyor mu?');
    }
    setIsLoading(false);
  };

  const getQRUrl = (tableId: string) => {
    return `${baseUrl}/table/${tableId}`;
  };

  const handlePrint = (table: Table) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const qrUrl = getQRUrl(table.id);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Kod - ${table.name}</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
            }
            .card {
              border: 3px solid #C41E3A;
              border-radius: 16px;
              padding: 30px;
              text-align: center;
              max-width: 300px;
            }
            .logo {
              font-size: 48px;
              margin-bottom: 10px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              color: #C41E3A;
              margin-bottom: 5px;
            }
            .table-name {
              font-size: 32px;
              font-weight: bold;
              color: #3D2314;
              margin-bottom: 20px;
            }
            .qr-placeholder {
              width: 200px;
              height: 200px;
              margin: 0 auto 20px;
              background: #f0f0f0;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 8px;
            }
            .instruction {
              font-size: 14px;
              color: #666;
              margin-top: 15px;
            }
            .url {
              font-size: 10px;
              color: #999;
              word-break: break-all;
              margin-top: 10px;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">🍕</div>
            <div class="title">HIGH FIVE</div>
            <div class="table-name">${table.name}</div>
            <div class="qr-placeholder">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}" alt="QR Code" />
            </div>
            <p class="instruction">
              📱 QR kodu okutarak<br/>
              sipariş verebilirsiniz
            </p>
            <p class="url">${qrUrl}</p>
          </div>
          <script>
            window.onload = () => setTimeout(() => window.print(), 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintAll = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const cardsHtml = tables.map(table => `
      <div class="card">
        <div class="logo">🍕</div>
        <div class="title">HIGH FIVE</div>
        <div class="table-name">${table.name}</div>
        <div class="qr-placeholder">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(getQRUrl(table.id))}" alt="QR Code" />
        </div>
        <p class="instruction">📱 Sipariş için okutun</p>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tüm Masa QR Kodları</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              margin: 0;
              padding: 20px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
              gap: 20px;
            }
            .card {
              border: 2px solid #C41E3A;
              border-radius: 12px;
              padding: 20px;
              text-align: center;
              page-break-inside: avoid;
            }
            .logo { font-size: 32px; }
            .title { font-size: 16px; font-weight: bold; color: #C41E3A; }
            .table-name { font-size: 24px; font-weight: bold; color: #3D2314; margin: 10px 0; }
            .qr-placeholder { margin: 10px auto; }
            .qr-placeholder img { width: 150px; height: 150px; }
            .instruction { font-size: 12px; color: #666; margin: 0; }
            @media print {
              .card { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="grid">${cardsHtml}</div>
          <script>
            window.onload = () => setTimeout(() => window.print(), 1000);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-diner-cream flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-5xl"
        >
          🍕
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-diner-cream py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl text-diner-chocolate">
              🔗 Masa QR Kodları
            </h1>
            <p className="text-diner-chocolate-light">
              Her masa için QR kod oluşturun ve yazdırın
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchTables}
              className="px-4 py-2 bg-white border-2 border-diner-kraft rounded-diner hover:bg-diner-cream transition-colors"
            >
              🔄 Yenile
            </button>
            <button
              onClick={handlePrintAll}
              className="px-4 py-2 bg-diner-red text-white rounded-diner hover:bg-diner-red/90 transition-colors font-display"
            >
              🖨️ Tümünü Yazdır
            </button>
          </div>
        </div>

        {/* Base URL Setting */}
        <div className="bg-white rounded-diner p-4 shadow-retro mb-6">
          <label className="block text-sm font-medium text-diner-chocolate-light mb-2">
            Site URL'i (QR kodlarda kullanılacak)
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="w-full px-4 py-2 border-2 border-diner-kraft rounded-diner focus:border-diner-red focus:outline-none"
            placeholder="https://highfive.com"
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-diner mb-6">
            {error}
          </div>
        )}

        {/* Tables Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {tables.map((table) => (
            <motion.div
              key={table.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-diner p-6 shadow-retro text-center"
            >
              <h3 className="font-display text-xl text-diner-chocolate mb-4">
                {table.name}
              </h3>
              
              {/* QR Code using external API for proper QR */}
              <div className="mb-4 flex justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(getQRUrl(table.id))}`}
                  alt={`QR Code for ${table.name}`}
                  className="rounded-lg border-2 border-diner-cream-dark"
                />
              </div>

              <p className="text-xs text-diner-chocolate-light mb-4 break-all">
                {getQRUrl(table.id)}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => handlePrint(table)}
                  className="flex-1 px-3 py-2 bg-diner-mustard text-diner-chocolate rounded-diner hover:bg-diner-mustard/80 transition-colors text-sm font-display"
                >
                  🖨️ Yazdır
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getQRUrl(table.id));
                    alert('URL kopyalandı!');
                  }}
                  className="px-3 py-2 bg-diner-cream border border-diner-kraft rounded-diner hover:bg-diner-cream-dark transition-colors text-sm"
                >
                  📋
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {tables.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🪑</div>
            <p className="text-diner-chocolate-light">
              Henüz masa eklenmemiş. POS'tan masa ekleyin.
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-white rounded-diner p-6 shadow-retro">
          <h2 className="font-display text-xl text-diner-chocolate mb-4">
            📖 Kullanım Kılavuzu
          </h2>
          <div className="space-y-3 text-diner-chocolate-light">
            <p>
              <strong>1.</strong> Her masa için QR kodu yazdırın
            </p>
            <p>
              <strong>2.</strong> QR kodları masalara yapıştırın
            </p>
            <p>
              <strong>3.</strong> Müşteriler QR kodu okutarak sipariş verebilir
            </p>
            <p>
              <strong>4.</strong> Siparişler otomatik olarak POS ve Mutfak ekranına düşer
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

