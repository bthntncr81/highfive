import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Save, Store, Phone, MapPin, Percent, MessageCircle, Printer, Wifi, TestTube, Link2, Plus, Trash2, Eye, EyeOff, Copy, RefreshCw, Check, X, ChevronDown, ChevronUp } from 'lucide-react';

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

interface IntegrationPartner {
  id: string;
  name: string;
  apiKey?: string;
  apiKeyMasked: string;
  isActive: boolean;
  webhookUrl: string | null;
  webhookSecret?: string | null;
  permissions: string[];
  locationId: string | null;
  webhookLogCount: number;
  createdAt: string;
  updatedAt: string;
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

  // Integration partners state
  const [partners, setPartners] = useState<IntegrationPartner[]>([]);
  const [isPartnersLoading, setIsPartnersLoading] = useState(false);
  const [showNewPartnerForm, setShowNewPartnerForm] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerWebhookUrl, setNewPartnerWebhookUrl] = useState('');
  const [isCreatingPartner, setIsCreatingPartner] = useState(false);
  const [newPartnerResult, setNewPartnerResult] = useState<{ apiKey: string; webhookSecret: string } | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Record<string, { apiKey: string; webhookSecret: string | null }>>({});
  const [copiedField, setCopiedField] = useState('');
  const [expandedPartner, setExpandedPartner] = useState<string | null>(null);
  const [partnerMessage, setPartnerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchPartners();
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

  const fetchPartners = async () => {
    setIsPartnersLoading(true);
    try {
      const response = await api.get('/api/integration-partners', token!);
      setPartners(response.partners || []);
    } catch (error) {
      console.error('Partners fetch error:', error);
    } finally {
      setIsPartnersLoading(false);
    }
  };

  const createPartner = async () => {
    if (!newPartnerName.trim()) return;
    setIsCreatingPartner(true);
    setPartnerMessage(null);
    try {
      const response = await api.post('/api/integration-partners', {
        name: newPartnerName.trim(),
        webhookUrl: newPartnerWebhookUrl.trim() || undefined,
      }, token!);
      setNewPartnerResult({ apiKey: response.apiKey, webhookSecret: response.webhookSecret });
      setPartnerMessage({ type: 'success', text: 'Entegrasyon oluşturuldu! API Key\'i kopyalayın.' });
      await fetchPartners();
    } catch (error: any) {
      setPartnerMessage({ type: 'error', text: error.message || 'Oluşturma hatası' });
    } finally {
      setIsCreatingPartner(false);
    }
  };

  const togglePartnerActive = async (id: string, isActive: boolean) => {
    try {
      await api.patch(`/api/integration-partners/${id}`, { isActive }, token!);
      setPartners(partners.map(p => p.id === id ? { ...p, isActive } : p));
    } catch (error: any) {
      setPartnerMessage({ type: 'error', text: error.message || 'Güncelleme hatası' });
    }
  };

  const deletePartner = async (id: string, name: string) => {
    if (!window.confirm(`"${name}" entegrasyonunu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
    try {
      await api.delete(`/api/integration-partners/${id}`, token!);
      setPartners(partners.filter(p => p.id !== id));
      setPartnerMessage({ type: 'success', text: `${name} silindi` });
      setTimeout(() => setPartnerMessage(null), 3000);
    } catch (error: any) {
      setPartnerMessage({ type: 'error', text: error.message || 'Silme hatası' });
    }
  };

  const revealKey = async (id: string) => {
    if (revealedKeys[id]) {
      // Toggle off
      const newRevealed = { ...revealedKeys };
      delete newRevealed[id];
      setRevealedKeys(newRevealed);
      return;
    }
    try {
      const response = await api.get(`/api/integration-partners/${id}/reveal-key`, token!);
      setRevealedKeys({ ...revealedKeys, [id]: { apiKey: response.apiKey, webhookSecret: response.webhookSecret } });
    } catch (error: any) {
      setPartnerMessage({ type: 'error', text: 'Key gösterilemedi' });
    }
  };

  const regenerateKey = async (id: string, name: string) => {
    if (!window.confirm(`"${name}" için yeni API Key oluşturulacak. Eski key geçersiz olacak. Devam?`)) return;
    try {
      const response = await api.post(`/api/integration-partners/${id}/regenerate-key`, {}, token!);
      setRevealedKeys({ ...revealedKeys, [id]: { apiKey: response.apiKey, webhookSecret: response.webhookSecret } });
      setPartnerMessage({ type: 'success', text: 'Yeni API Key oluşturuldu. Kopyalayın!' });
    } catch (error: any) {
      setPartnerMessage({ type: 'error', text: 'Key yenileme hatası' });
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(label);
      setTimeout(() => setCopiedField(''), 2000);
    } catch {
      // Fallback for HTTP
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedField(label);
      setTimeout(() => setCopiedField(''), 2000);
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
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-500"></div>
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
                      <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-500"></div>
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
                      <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-500"></div>
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
                      <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-500"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Summary Box */}
              <div className="p-4 bg-gradient-to-r from-accent-50 to-blue-50 rounded-lg border border-accent-200">
                <h4 className="font-medium text-accent-800 mb-2">📊 Özet</h4>
                <ul className="text-sm text-accent-700 space-y-1">
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

      {/* Integration Partners */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Link2 className="w-5 h-5 text-blue-500" />
            Entegrasyon Yönetimi
          </h2>
          <button
            onClick={() => {
              setShowNewPartnerForm(!showNewPartnerForm);
              setNewPartnerResult(null);
              setNewPartnerName('');
              setNewPartnerWebhookUrl('');
            }}
            className="btn btn-primary text-sm flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Yeni Bağlantı
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Dış sistemlerle (WhatsApp sipariş, online sipariş vb.) bağlantı kurmak için API Key oluşturun.
        </p>

        {/* Partner message */}
        {partnerMessage && (
          <div className={`p-3 rounded-lg mb-4 text-sm ${
            partnerMessage.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
            {partnerMessage.text}
          </div>
        )}

        {/* New Partner Form */}
        {showNewPartnerForm && !newPartnerResult && (
          <div className="p-4 bg-blue-50 rounded-lg mb-4 border border-blue-200">
            <h3 className="font-medium text-blue-800 mb-3">Yeni Entegrasyon Oluştur</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bağlantı Adı *
                </label>
                <input
                  type="text"
                  value={newPartnerName}
                  onChange={(e) => setNewPartnerName(e.target.value)}
                  className="input"
                  placeholder="Örn: WhatsApp Sipariş, Online Sipariş"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Webhook URL (Opsiyonel)
                </label>
                <input
                  type="url"
                  value={newPartnerWebhookUrl}
                  onChange={(e) => setNewPartnerWebhookUrl(e.target.value)}
                  className="input"
                  placeholder="https://example.com/api/webhooks/pos/tenant-id"
                />
                <p className="text-xs text-gray-500 mt-1">Sipariş durumu değişikliklerini bildirecek URL</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={createPartner}
                  disabled={isCreatingPartner || !newPartnerName.trim()}
                  className="btn btn-primary text-sm flex items-center gap-1"
                >
                  {isCreatingPartner ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Oluştur
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowNewPartnerForm(false)}
                  className="btn btn-secondary text-sm flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* New Partner Created - Show credentials */}
        {newPartnerResult && (
          <div className="p-4 bg-green-50 rounded-lg mb-4 border border-green-200">
            <h3 className="font-medium text-green-800 mb-3 flex items-center gap-2">
              <Check className="w-5 h-5" />
              Entegrasyon Oluşturuldu!
            </h3>
            <p className="text-sm text-green-700 mb-3">
              Bu bilgileri güvenli bir yerde saklayın. API Key sadece bir kez gösterilir!
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">API Key</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPartnerResult.apiKey}
                    readOnly
                    className="input text-xs font-mono flex-1 bg-white"
                  />
                  <button
                    onClick={() => copyToClipboard(newPartnerResult.apiKey, 'new-api-key')}
                    className="btn btn-secondary text-xs flex items-center gap-1"
                  >
                    {copiedField === 'new-api-key' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                    {copiedField === 'new-api-key' ? 'Kopyalandı!' : 'Kopyala'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Webhook Secret</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPartnerResult.webhookSecret}
                    readOnly
                    className="input text-xs font-mono flex-1 bg-white"
                  />
                  <button
                    onClick={() => copyToClipboard(newPartnerResult.webhookSecret, 'new-webhook-secret')}
                    className="btn btn-secondary text-xs flex items-center gap-1"
                  >
                    {copiedField === 'new-webhook-secret' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                    {copiedField === 'new-webhook-secret' ? 'Kopyalandı!' : 'Kopyala'}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setNewPartnerResult(null);
                setShowNewPartnerForm(false);
                setNewPartnerName('');
                setNewPartnerWebhookUrl('');
              }}
              className="btn btn-secondary text-sm mt-3"
            >
              Tamam
            </button>
          </div>
        )}

        {/* Partners List */}
        {isPartnersLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          </div>
        ) : partners.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Link2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Henüz entegrasyon oluşturulmamış</p>
            <p className="text-sm">Yeni bağlantı oluşturarak başlayın</p>
          </div>
        ) : (
          <div className="space-y-3">
            {partners.map((partner) => (
              <div
                key={partner.id}
                className={`p-4 rounded-lg border ${
                  partner.isActive
                    ? 'bg-white border-gray-200'
                    : 'bg-gray-50 border-gray-200 opacity-60'
                }`}
              >
                {/* Partner header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${partner.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <div>
                      <p className="font-medium text-gray-900">{partner.name}</p>
                      <p className="text-xs text-gray-500">
                        Key: {revealedKeys[partner.id] ? revealedKeys[partner.id].apiKey.slice(0, 16) + '...' : partner.apiKeyMasked}
                        {' · '}
                        {new Date(partner.createdAt).toLocaleDateString('tr-TR')}
                        {partner.webhookLogCount > 0 && ` · ${partner.webhookLogCount} webhook log`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedPartner(expandedPartner === partner.id ? null : partner.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                      title="Detay"
                    >
                      {expandedPartner === partner.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={partner.isActive}
                        onChange={(e) => togglePartnerActive(partner.id, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                  </div>
                </div>

                {/* Expanded details */}
                {expandedPartner === partner.id && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    {/* API Key actions */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => revealKey(partner.id)}
                        className="btn btn-secondary text-xs flex items-center gap-1"
                      >
                        {revealedKeys[partner.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {revealedKeys[partner.id] ? 'Gizle' : 'Key Göster'}
                      </button>
                      {revealedKeys[partner.id] && (
                        <button
                          onClick={() => copyToClipboard(revealedKeys[partner.id].apiKey, `key-${partner.id}`)}
                          className="btn btn-secondary text-xs flex items-center gap-1"
                        >
                          {copiedField === `key-${partner.id}` ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                          {copiedField === `key-${partner.id}` ? 'Kopyalandı!' : 'API Key Kopyala'}
                        </button>
                      )}
                      {revealedKeys[partner.id]?.webhookSecret && (
                        <button
                          onClick={() => copyToClipboard(revealedKeys[partner.id].webhookSecret!, `secret-${partner.id}`)}
                          className="btn btn-secondary text-xs flex items-center gap-1"
                        >
                          {copiedField === `secret-${partner.id}` ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                          {copiedField === `secret-${partner.id}` ? 'Kopyalandı!' : 'Secret Kopyala'}
                        </button>
                      )}
                      <button
                        onClick={() => regenerateKey(partner.id, partner.name)}
                        className="btn btn-secondary text-xs flex items-center gap-1 text-orange-600 hover:text-orange-700"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Key Yenile
                      </button>
                      <button
                        onClick={() => deletePartner(partner.id, partner.name)}
                        className="btn btn-secondary text-xs flex items-center gap-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                        Sil
                      </button>
                    </div>

                    {/* Revealed key */}
                    {revealedKeys[partner.id] && (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-500">API Key</label>
                          <code className="block p-2 bg-gray-100 rounded text-xs font-mono break-all">
                            {revealedKeys[partner.id].apiKey}
                          </code>
                        </div>
                        {revealedKeys[partner.id].webhookSecret && (
                          <div>
                            <label className="block text-xs font-medium text-gray-500">Webhook Secret</label>
                            <code className="block p-2 bg-gray-100 rounded text-xs font-mono break-all">
                              {revealedKeys[partner.id].webhookSecret}
                            </code>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Webhook URL */}
                    {partner.webhookUrl && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500">Webhook URL</label>
                        <code className="block p-2 bg-gray-100 rounded text-xs font-mono break-all">
                          {partner.webhookUrl}
                        </code>
                      </div>
                    )}

                    {/* Permissions */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">İzinler</label>
                      <div className="flex flex-wrap gap-1">
                        {partner.permissions.map((perm) => (
                          <span key={perm} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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

