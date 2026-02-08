import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Save, Store, Phone, MapPin, Percent, MessageCircle, Printer, Wifi, TestTube } from 'lucide-react';

interface RestaurantSettings {
  name: string;
  phone: string;
  address: string;
  taxRate: number;
  currency: string;
}

interface WhatsAppSettings {
  enabled: boolean;
  phone: string;
  defaultMessage: string;
}

interface PrinterSettings {
  receiptPrinter: {
    enabled: boolean;
    type: 'browser' | 'network' | 'usb';
    ipAddress?: string;
    port?: number;
    name?: string;
  };
  kitchenPrinter: {
    enabled: boolean;
    type: 'browser' | 'network' | 'usb';
    ipAddress?: string;
    port?: number;
    name?: string;
  };
  autoPrintReceipt: boolean;
  autoPrintKitchen: boolean;
}

interface LoyaltySettings {
  enabled: boolean;
  pointsPerTL: number; // Her X TL için 1 puan
  redemptionRate: number; // X puan = 1 TL indirim
  enabledForDineIn: boolean; // Masada yemek
  enabledForTakeaway: boolean; // Gel al
  enabledForDelivery: boolean; // Paket servis
  welcomePoints: number; // İlk üyelik bonusu
  minRedeemPoints: number; // Minimum kullanılabilir puan
}

export default function Settings() {
  const { token } = useAuth();
  const [restaurant, setRestaurant] = useState<RestaurantSettings>({
    name: '',
    phone: '',
    address: '',
    taxRate: 10,
    currency: 'TL',
  });
  const [whatsapp, setWhatsApp] = useState<WhatsAppSettings>({
    enabled: false,
    phone: '',
    defaultMessage: '',
  });
  const [printer, setPrinter] = useState<PrinterSettings>({
    receiptPrinter: {
      enabled: true,
      type: 'browser',
    },
    kitchenPrinter: {
      enabled: true,
      type: 'browser',
    },
    autoPrintReceipt: false,
    autoPrintKitchen: true,
  });
  const [loyalty, setLoyalty] = useState<LoyaltySettings>({
    enabled: true,
    pointsPerTL: 10, // Her 10 TL için 1 puan
    redemptionRate: 10, // 10 puan = 1 TL
    enabledForDineIn: true,
    enabledForTakeaway: true,
    enabledForDelivery: true,
    welcomePoints: 50,
    minRedeemPoints: 100,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [testPrintStatus, setTestPrintStatus] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/settings', token!);
      if (response.settings?.restaurant) {
        setRestaurant(response.settings.restaurant);
      }
      if (response.settings?.whatsapp) {
        setWhatsApp(response.settings.whatsapp);
      }
    } catch (error) {
      console.error('Settings fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');
    
    try {
      await api.put('/api/settings/restaurant', { value: restaurant }, token!);
      await api.put('/api/settings/whatsapp', { value: whatsapp }, token!);
      setMessage('Ayarlar kaydedildi!');
    } catch (error) {
      setMessage('Kaydetme hatası!');
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ayarlar</h1>
          <p className="text-gray-500">Restoran ve sistem ayarları</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn btn-primary flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>

      {/* Success/Error message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('hata') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          {message}
        </div>
      )}

      {/* Restaurant settings */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Store className="w-5 h-5 text-gray-400" />
          Restoran Bilgileri
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Restoran Adı
            </label>
            <input
              type="text"
              value={restaurant.name}
              onChange={(e) => setRestaurant({ ...restaurant, name: e.target.value })}
              className="input"
              placeholder="High Five"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Phone className="w-4 h-4 inline mr-1" />
              Telefon
            </label>
            <input
              type="tel"
              value={restaurant.phone}
              onChange={(e) => setRestaurant({ ...restaurant, phone: e.target.value })}
              className="input"
              placeholder="0505 691 68 31"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MapPin className="w-4 h-4 inline mr-1" />
              Adres
            </label>
            <textarea
              value={restaurant.address}
              onChange={(e) => setRestaurant({ ...restaurant, address: e.target.value })}
              className="input"
              rows={2}
              placeholder="Bağdat Caddesi No:123, Kadıköy, İstanbul"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Percent className="w-4 h-4 inline mr-1" />
                KDV Oranı (%)
              </label>
              <input
                type="number"
                value={restaurant.taxRate}
                onChange={(e) => setRestaurant({ ...restaurant, taxRate: Number(e.target.value) })}
                className="input"
                min="0"
                max="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Para Birimi
              </label>
              <select
                value={restaurant.currency}
                onChange={(e) => setRestaurant({ ...restaurant, currency: e.target.value })}
                className="input"
              >
                <option value="TL">TL (₺)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp settings */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-green-500" />
          WhatsApp Entegrasyonu
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">WhatsApp Sipariş</p>
              <p className="text-sm text-gray-500">WhatsApp üzerinden sipariş al</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={whatsapp.enabled}
                onChange={(e) => setWhatsApp({ ...whatsapp, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              WhatsApp Numarası
            </label>
            <input
              type="tel"
              value={whatsapp.phone}
              onChange={(e) => setWhatsApp({ ...whatsapp, phone: e.target.value })}
              className="input"
              placeholder="905056916831"
            />
            <p className="text-xs text-gray-500 mt-1">Ülke kodu ile (90 ile başlayan)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Varsayılan Mesaj
            </label>
            <textarea
              value={whatsapp.defaultMessage}
              onChange={(e) => setWhatsApp({ ...whatsapp, defaultMessage: e.target.value })}
              className="input"
              rows={2}
              placeholder="Merhaba! Sipariş vermek istiyorum 🍕"
            />
          </div>
        </div>
      </div>

      {/* Printer settings */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Printer className="w-5 h-5 text-gray-400" />
          Yazıcı Ayarları
        </h2>
        
        <div className="space-y-6">
          {/* Receipt Printer */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-medium flex items-center gap-2">
                  <span className="text-xl">🧾</span> Fiş Yazıcısı
                </p>
                <p className="text-sm text-gray-500">Müşteri fişleri için</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={printer.receiptPrinter.enabled}
                  onChange={(e) => setPrinter({ 
                    ...printer, 
                    receiptPrinter: { ...printer.receiptPrinter, enabled: e.target.checked }
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>
            
            {printer.receiptPrinter.enabled && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yazıcı Tipi</label>
                  <select
                    value={printer.receiptPrinter.type}
                    onChange={(e) => setPrinter({
                      ...printer,
                      receiptPrinter: { ...printer.receiptPrinter, type: e.target.value as 'browser' | 'network' | 'usb' }
                    })}
                    className="input"
                  >
                    <option value="browser">🖥️ Tarayıcı (Varsayılan)</option>
                    <option value="network">🌐 Ağ Yazıcısı (ESC/POS)</option>
                    <option value="usb">🔌 USB Yazıcı</option>
                  </select>
                </div>
                
                {printer.receiptPrinter.type === 'network' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Wifi className="w-4 h-4 inline mr-1" /> IP Adresi
                      </label>
                      <input
                        type="text"
                        value={printer.receiptPrinter.ipAddress || ''}
                        onChange={(e) => setPrinter({
                          ...printer,
                          receiptPrinter: { ...printer.receiptPrinter, ipAddress: e.target.value }
                        })}
                        className="input"
                        placeholder="192.168.1.100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                      <input
                        type="number"
                        value={printer.receiptPrinter.port || 9100}
                        onChange={(e) => setPrinter({
                          ...printer,
                          receiptPrinter: { ...printer.receiptPrinter, port: Number(e.target.value) }
                        })}
                        className="input"
                        placeholder="9100"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Kitchen Printer */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-medium flex items-center gap-2">
                  <span className="text-xl">👨‍🍳</span> Mutfak Yazıcısı
                </p>
                <p className="text-sm text-gray-500">Mutfak siparişleri için</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={printer.kitchenPrinter.enabled}
                  onChange={(e) => setPrinter({ 
                    ...printer, 
                    kitchenPrinter: { ...printer.kitchenPrinter, enabled: e.target.checked }
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>
            
            {printer.kitchenPrinter.enabled && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yazıcı Tipi</label>
                  <select
                    value={printer.kitchenPrinter.type}
                    onChange={(e) => setPrinter({
                      ...printer,
                      kitchenPrinter: { ...printer.kitchenPrinter, type: e.target.value as 'browser' | 'network' | 'usb' }
                    })}
                    className="input"
                  >
                    <option value="browser">🖥️ Tarayıcı (Varsayılan)</option>
                    <option value="network">🌐 Ağ Yazıcısı (ESC/POS)</option>
                    <option value="usb">🔌 USB Yazıcı</option>
                  </select>
                </div>
                
                {printer.kitchenPrinter.type === 'network' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Wifi className="w-4 h-4 inline mr-1" /> IP Adresi
                      </label>
                      <input
                        type="text"
                        value={printer.kitchenPrinter.ipAddress || ''}
                        onChange={(e) => setPrinter({
                          ...printer,
                          kitchenPrinter: { ...printer.kitchenPrinter, ipAddress: e.target.value }
                        })}
                        className="input"
                        placeholder="192.168.1.101"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                      <input
                        type="number"
                        value={printer.kitchenPrinter.port || 9100}
                        onChange={(e) => setPrinter({
                          ...printer,
                          kitchenPrinter: { ...printer.kitchenPrinter, port: Number(e.target.value) }
                        })}
                        className="input"
                        placeholder="9100"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Auto Print Options */}
          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-medium text-gray-700">Otomatik Yazdırma</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Sipariş alındığında fiş yazdır</p>
                <p className="text-xs text-gray-500">Müşteri fişi otomatik yazdırılır</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={printer.autoPrintReceipt}
                  onChange={(e) => setPrinter({ ...printer, autoPrintReceipt: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Sipariş alındığında mutfak fişi yazdır</p>
                <p className="text-xs text-gray-500">Mutfak fişi otomatik yazdırılır</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={printer.autoPrintKitchen}
                  onChange={(e) => setPrinter({ ...printer, autoPrintKitchen: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>
          </div>

          {/* Test Print */}
          <div className="pt-4 border-t">
            <button
              onClick={() => {
                setTestPrintStatus('Yazdırılıyor...');
                // Open test print window
                const testContent = `
                  <html>
                  <head><title>Test Fişi</title>
                  <style>body{font-family:monospace;width:280px;padding:20px;text-align:center;}</style>
                  </head>
                  <body>
                    <h2>🖨️ TEST FİŞİ</h2>
                    <p>High Five POS Sistemi</p>
                    <p>Yazıcı Testi Başarılı!</p>
                    <p>${new Date().toLocaleString('tr-TR')}</p>
                    <p>✅ ✅ ✅</p>
                  </body>
                  </html>
                `;
                const printWindow = window.open('', '_blank', 'width=320,height=300');
                if (printWindow) {
                  printWindow.document.write(testContent);
                  printWindow.document.close();
                  printWindow.onload = () => {
                    printWindow.print();
                    setTestPrintStatus('Test fişi yazdırıldı ✓');
                    setTimeout(() => setTestPrintStatus(''), 3000);
                  };
                }
              }}
              className="btn btn-secondary flex items-center gap-2"
            >
              <TestTube className="w-4 h-4" />
              Test Fişi Yazdır
            </button>
            {testPrintStatus && (
              <p className="text-sm text-green-600 mt-2">{testPrintStatus}</p>
            )}
          </div>
        </div>
      </div>

      {/* Loyalty Program Settings */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-2xl">👑</span>
          Sadakat Programı Ayarları
        </h2>
        
        <div className="space-y-4">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">Sadakat Programı</p>
              <p className="text-sm text-gray-500">Müşteriler puan kazanıp kullanabilir</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={loyalty.enabled}
                onChange={(e) => setLoyalty({ ...loyalty, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>

          {loyalty.enabled && (
            <>
              {/* Points Configuration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Puan Kazanım (Her X TL = 1 Puan)
                  </label>
                  <input
                    type="number"
                    value={loyalty.pointsPerTL}
                    onChange={(e) => setLoyalty({ ...loyalty, pointsPerTL: Number(e.target.value) })}
                    className="input"
                    min="1"
                    max="100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Her {loyalty.pointsPerTL}₺ için 1 puan</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Puan Değeri (X Puan = 1 TL)
                  </label>
                  <input
                    type="number"
                    value={loyalty.redemptionRate}
                    onChange={(e) => setLoyalty({ ...loyalty, redemptionRate: Number(e.target.value) })}
                    className="input"
                    min="1"
                    max="1000"
                  />
                  <p className="text-xs text-gray-500 mt-1">{loyalty.redemptionRate} puan = 1₺ indirim</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hoş Geldin Puanı
                  </label>
                  <input
                    type="number"
                    value={loyalty.welcomePoints}
                    onChange={(e) => setLoyalty({ ...loyalty, welcomePoints: Number(e.target.value) })}
                    className="input"
                    min="0"
                    max="1000"
                  />
                  <p className="text-xs text-gray-500 mt-1">Yeni üyelere verilen puan</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min. Kullanım Puanı
                  </label>
                  <input
                    type="number"
                    value={loyalty.minRedeemPoints}
                    onChange={(e) => setLoyalty({ ...loyalty, minRedeemPoints: Number(e.target.value) })}
                    className="input"
                    min="10"
                    max="1000"
                    step="10"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum {loyalty.minRedeemPoints} puan kullanılabilir</p>
                </div>
              </div>

              {/* Where can points be used */}
              <div className="pt-4 border-t">
                <h3 className="font-medium text-gray-700 mb-3">Puan Kullanılabilir Alanlar</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🍽️</span>
                      <div>
                        <p className="text-sm font-medium">Masada Yemek</p>
                        <p className="text-xs text-gray-500">QR ile sipariş</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={loyalty.enabledForDineIn}
                        onChange={(e) => setLoyalty({ ...loyalty, enabledForDineIn: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🛍️</span>
                      <div>
                        <p className="text-sm font-medium">Gel Al (Takeaway)</p>
                        <p className="text-xs text-gray-500">Online sipariş - gel al</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={loyalty.enabledForTakeaway}
                        onChange={(e) => setLoyalty({ ...loyalty, enabledForTakeaway: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🚚</span>
                      <div>
                        <p className="text-sm font-medium">Paket Servis (Delivery)</p>
                        <p className="text-xs text-gray-500">Adrese teslim</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={loyalty.enabledForDelivery}
                        onChange={(e) => setLoyalty({ ...loyalty, enabledForDelivery: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Summary Box */}
              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-orange-200">
                <h4 className="font-medium text-orange-800 mb-2">📊 Özet</h4>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• Her {loyalty.pointsPerTL}₺ harcamada 1 puan kazanılır</li>
                  <li>• {loyalty.redemptionRate} puan = 1₺ indirim olarak kullanılır</li>
                  <li>• Yeni üyeler {loyalty.welcomePoints} puan ile başlar</li>
                  <li>• Minimum {loyalty.minRedeemPoints} puan kullanılabilir</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Danger zone */}
      <div className="card border-red-200 bg-red-50">
        <h2 className="text-lg font-semibold text-red-700 mb-4">Tehlikeli Alan</h2>
        <div className="space-y-3">
          <button className="btn bg-white text-red-600 border border-red-300 hover:bg-red-100">
            Tüm Verileri Sıfırla
          </button>
          <p className="text-sm text-red-600">
            Bu işlem geri alınamaz. Tüm siparişler, masalar ve ayarlar silinir.
          </p>
        </div>
      </div>
    </div>
  );
}

