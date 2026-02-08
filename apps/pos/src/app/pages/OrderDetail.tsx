import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { api } from '../lib/api';
import {
  ArrowLeft,
  Clock,
  User,
  MapPin,
  ChefHat,
  Check,
  X,
  CreditCard,
  Banknote,
  Printer,
  Plus,
  Split,
  Users,
} from 'lucide-react';

interface Order {
  id: string;
  orderNumber: number;
  status: string;
  paymentStatus: string;
  type: string;
  subtotal: number;
  tax: number;
  total: number;
  tip: number;
  notes?: string;
  createdAt: string;
  table?: { id: string; name: string; number: number };
  user?: { name: string };
  items: OrderItem[];
  payments?: Payment[];
}

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  total: number;
  notes?: string;
  status: string;
  menuItem: { name: string };
  paidQuantity: number; // Ödenen miktar
}

interface Payment {
  id: string;
  amount: number;
  method: string;
  createdAt: string;
  paidItems?: { [itemId: string]: number }; // Hangi ürünlerden kaç adet ödendi
  refunded?: boolean;
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const { onMessage } = useWebSocket();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Split payment state
  const [splitMode, setSplitMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<{[itemId: string]: number}>({}); // itemId -> quantity
  const [splitPaymentType, setSplitPaymentType] = useState<'items' | 'equal' | 'custom'>('items');

  useEffect(() => {
    fetchOrder();

    const unsubscribe = onMessage('orders', (data) => {
      if (data.order?.id === id) {
        setOrder(data.order);
      }
    });

    return unsubscribe;
  }, [id]);

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/api/orders/${id}`, token!);
      setOrder(response.order);
      setPaymentAmount(response.order.total.toString());
    } catch (error) {
      console.error('Order fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsProcessing(true);
    try {
      await api.patch(`/api/orders/${id}/status`, { status: newStatus }, token!);
      fetchOrder();
    } catch (error) {
      console.error('Status change error:', error);
      alert('Durum değiştirilemedi');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Geçerli bir tutar giriniz');
      return;
    }

    setIsProcessing(true);
    try {
      await api.post(`/api/orders/${id}/payment`, {
        amount,
        method: paymentMethod,
      }, token!);
      setShowPayment(false);
      fetchOrder();
    } catch (error) {
      console.error('Payment error:', error);
      alert('Ödeme işlemi başarısız');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Siparişi iptal etmek istediğinize emin misiniz?')) return;

    setIsProcessing(true);
    try {
      await api.post(`/api/orders/${id}/cancel`, {}, token!);
      navigate('/orders');
    } catch (error) {
      console.error('Cancel error:', error);
      alert('Sipariş iptal edilemedi');
    } finally {
      setIsProcessing(false);
    }
  };

  // Fiş yazdırma fonksiyonu
  const handlePrintReceipt = () => {
    if (!order) return;

    const receiptContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Fiş #${order.orderNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 12px; width: 280px; padding: 10px; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .line { border-bottom: 1px dashed #000; margin: 8px 0; }
    .double-line { border-bottom: 2px solid #000; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; margin: 4px 0; }
    .item-name { flex: 1; }
    .item-qty { width: 30px; text-align: center; }
    .item-price { width: 60px; text-align: right; }
    h1 { font-size: 18px; margin-bottom: 5px; }
    h2 { font-size: 14px; margin-bottom: 10px; }
    .total-row { font-size: 14px; font-weight: bold; }
    .footer { margin-top: 15px; font-size: 10px; }
  </style>
</head>
<body>
  <div class="center">
    <h1>🖐️ HIGH FIVE</h1>
    <p>Restoran & Cafe</p>
    <p>Tel: 0505 691 68 31</p>
  </div>
  
  <div class="double-line"></div>
  
  <div class="row">
    <span>Fiş No:</span>
    <span class="bold">#${order.orderNumber}</span>
  </div>
  <div class="row">
    <span>Tarih:</span>
    <span>${new Date(order.createdAt).toLocaleDateString('tr-TR')}</span>
  </div>
  <div class="row">
    <span>Saat:</span>
    <span>${new Date(order.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
  </div>
  ${order.table ? `<div class="row"><span>Masa:</span><span>${order.table.name}</span></div>` : ''}
  ${order.user ? `<div class="row"><span>Garson:</span><span>${order.user.name}</span></div>` : ''}
  
  <div class="line"></div>
  
  <div class="row bold">
    <span class="item-name">Ürün</span>
    <span class="item-qty">Ad.</span>
    <span class="item-price">Tutar</span>
  </div>
  
  <div class="line"></div>
  
  ${order.items.map(item => `
    <div class="row">
      <span class="item-name">${item.menuItem.name}</span>
      <span class="item-qty">${item.quantity}</span>
      <span class="item-price">${item.total.toFixed(2)}₺</span>
    </div>
    ${item.notes ? `<div style="font-size:10px;color:#666;margin-left:10px;">Not: ${item.notes}</div>` : ''}
  `).join('')}
  
  <div class="double-line"></div>
  
  <div class="row">
    <span>Ara Toplam:</span>
    <span>${order.subtotal.toFixed(2)}₺</span>
  </div>
  <div class="row">
    <span>KDV:</span>
    <span>${order.tax.toFixed(2)}₺</span>
  </div>
  ${order.tip > 0 ? `<div class="row"><span>Bahşiş:</span><span>${order.tip.toFixed(2)}₺</span></div>` : ''}
  
  <div class="line"></div>
  
  <div class="row total-row">
    <span>TOPLAM:</span>
    <span>${(order.total + (order.tip || 0)).toFixed(2)}₺</span>
  </div>
  
  <div class="line"></div>
  
  <div class="row">
    <span>Ödeme:</span>
    <span>${order.paymentStatus === 'PAID' ? 'ÖDENDİ ✓' : 'BEKLEMEDE'}</span>
  </div>
  
  <div class="footer center">
    <div class="line"></div>
    <p>Bizi tercih ettiğiniz için</p>
    <p class="bold">Teşekkür Ederiz! 🙏</p>
    <p style="margin-top:10px;">www.highfive.com.tr</p>
  </div>
</body>
</html>
    `;

    // iframe kullanarak yazdır - popup blocker'dan kaçınır
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = 'none';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(receiptContent);
      frameDoc.close();

      // Yazdırma işlemi
      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        
        // Yazdırma sonrası iframe'i kaldır
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1000);
      }, 250);
    }
  };

  // Mutfak fişi yazdırma fonksiyonu
  const handlePrintKitchenTicket = () => {
    if (!order) return;

    const kitchenContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Mutfak Fişi #${order.orderNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 14px; width: 280px; padding: 10px; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .large { font-size: 18px; }
    .line { border-bottom: 2px dashed #000; margin: 10px 0; }
    .item { margin: 10px 0; padding: 8px; background: #f5f5f5; border-left: 4px solid #333; }
    .item-name { font-size: 16px; font-weight: bold; }
    .item-qty { font-size: 24px; font-weight: bold; color: #c41e3a; }
    .item-notes { font-size: 12px; color: #666; margin-top: 5px; font-style: italic; }
    .header { background: #333; color: white; padding: 10px; margin: -10px -10px 10px -10px; }
    .time { font-size: 20px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header center">
    <div class="large bold">🍳 MUTFAK</div>
    <div class="time">${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
  </div>
  
  <div class="center">
    <div class="large bold">Sipariş #${order.orderNumber}</div>
    ${order.table ? `<div style="font-size:20px;margin-top:5px;">📍 ${order.table.name}</div>` : ''}
    ${order.type === 'TAKEAWAY' ? '<div style="font-size:20px;margin-top:5px;">🥡 GEL AL</div>' : ''}
    ${order.type === 'DELIVERY' ? '<div style="font-size:20px;margin-top:5px;">🚗 TESLİMAT</div>' : ''}
  </div>
  
  <div class="line"></div>
  
  ${order.items.map(item => `
    <div class="item">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span class="item-name">${item.menuItem.name}</span>
        <span class="item-qty">x${item.quantity}</span>
      </div>
      ${item.notes ? `<div class="item-notes">⚠️ ${item.notes}</div>` : ''}
    </div>
  `).join('')}
  
  <div class="line"></div>
  
  ${order.notes ? `
    <div style="background:#ffe4e4;padding:10px;border:2px solid #c41e3a;">
      <strong>📝 SİPARİŞ NOTU:</strong><br/>
      ${order.notes}
    </div>
  ` : ''}
  
  <div class="center" style="margin-top:15px;font-size:12px;color:#666;">
    ${new Date(order.createdAt).toLocaleString('tr-TR')}
  </div>
</body>
</html>
    `;

    // iframe kullanarak yazdır - popup blocker'dan kaçınır
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = 'none';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(kitchenContent);
      frameDoc.close();

      // Yazdırma işlemi
      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        
        // Yazdırma sonrası iframe'i kaldır
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1000);
      }, 250);
    }
  };

  // Split payment fonksiyonları
  const toggleSplitMode = () => {
    setSplitMode(!splitMode);
    setSelectedItems({});
    setSplitPaymentType('items');
  };

  const toggleItemSelection = (itemId: string, maxQuantity: number) => {
    setSelectedItems(prev => {
      const current = prev[itemId] || 0;
      if (current >= maxQuantity) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: current + 1 };
    });
  };

  const decreaseItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const current = prev[itemId] || 0;
      if (current <= 1) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: current - 1 };
    });
  };

  const getSelectedTotal = () => {
    if (!order) return 0;
    return Object.entries(selectedItems).reduce((total, [itemId, quantity]) => {
      const item = order.items.find(i => i.id === itemId);
      if (item) {
        return total + (item.unitPrice * quantity);
      }
      return total;
    }, 0);
  };

  const handleSplitPayment = async () => {
    const amount = splitPaymentType === 'items' 
      ? getSelectedTotal() 
      : parseFloat(paymentAmount);
    
    if (isNaN(amount) || amount <= 0) {
      alert('Geçerli bir tutar giriniz');
      return;
    }

    setIsProcessing(true);
    try {
      await api.post(`/api/orders/${id}/payment`, {
        amount,
        method: paymentMethod,
        paidItems: splitPaymentType === 'items' ? selectedItems : undefined,
      }, token!);
      
      setShowPayment(false);
      setSplitMode(false);
      setSelectedItems({});
      fetchOrder();
    } catch (error) {
      console.error('Payment error:', error);
      alert('Ödeme işlemi başarısız');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefundPayment = async (paymentId: string) => {
    if (!confirm('Bu ödemeyi iade etmek istediğinize emin misiniz?')) return;

    setIsProcessing(true);
    try {
      await api.post(`/api/orders/${id}/payment/${paymentId}/refund`, {}, token!);
      fetchOrder();
    } catch (error) {
      console.error('Refund error:', error);
      alert('İade işlemi başarısız');
    } finally {
      setIsProcessing(false);
    }
  };

  const getUnpaidQuantity = (item: OrderItem) => {
    return item.quantity - (item.paidQuantity || 0);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      PREPARING: 'bg-orange-100 text-orange-800',
      READY: 'bg-green-100 text-green-800',
      SERVED: 'bg-teal-100 text-teal-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      PENDING: 'Bekliyor',
      CONFIRMED: 'Onaylandı',
      PREPARING: 'Hazırlanıyor',
      READY: 'Hazır',
      SERVED: 'Servis Edildi',
      COMPLETED: 'Tamamlandı',
      CANCELLED: 'İptal',
    };
    return texts[status] || status;
  };

  const getPaymentMethodText = (method: string) => {
    const texts: Record<string, string> = {
      CASH: 'Nakit',
      CREDIT_CARD: 'Kredi Kartı',
      DEBIT_CARD: 'Banka Kartı',
    };
    return texts[method] || method;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Sipariş bulunamadı</p>
        <button onClick={() => navigate('/orders')} className="btn btn-primary mt-4">
          Siparişlere Dön
        </button>
      </div>
    );
  }

  const paidAmount = order.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const remainingAmount = order.total - paidAmount;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/orders')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Sipariş #{order.orderNumber.toString().padStart(4, '0')}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`badge ${getStatusColor(order.status)}`}>
                {getStatusText(order.status)}
              </span>
              {order.table && (
                <span className="text-gray-500">{order.table.name}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => handlePrintReceipt()}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Fiş Yazdır
          </button>
          <button 
            onClick={() => handlePrintKitchenTicket()}
            className="btn btn-secondary flex items-center gap-2"
          >
            <ChefHat className="w-4 h-4" />
            Mutfak Fişi
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Sipariş Detayları</h2>
              {order.paymentStatus !== 'PAID' && (
                <button
                  onClick={toggleSplitMode}
                  className={`btn ${splitMode ? 'btn-primary' : 'btn-secondary'} btn-sm flex items-center gap-2`}
                >
                  <Split className="w-4 h-4" />
                  {splitMode ? 'Seçimi İptal' : 'Ayrı Öde'}
                </button>
              )}
            </div>

            {splitMode && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Ayrı ödemek istediğiniz ürünleri seçin
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              {order.items.map((item) => {
                const selectedQty = selectedItems[item.id] || 0;
                const isSelected = selectedQty > 0;
                const unpaidQty = getUnpaidQuantity(item);
                const isFullyPaid = unpaidQty <= 0;
                
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-lg transition-all relative ${
                      isFullyPaid 
                        ? 'bg-green-50 border-2 border-green-300'
                        : splitMode 
                          ? isSelected 
                            ? 'bg-blue-100 border-2 border-blue-400' 
                            : 'bg-gray-50 hover:bg-gray-100 cursor-pointer'
                          : 'bg-gray-50'
                    }`}
                    onClick={() => splitMode && !isFullyPaid && toggleItemSelection(item.id, unpaidQty)}
                  >
                    {/* Paid badge */}
                    {item.paidQuantity > 0 && (
                      <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">
                        {isFullyPaid ? '✓ ÖDENDİ' : `${item.paidQuantity}/${item.quantity} ödendi`}
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      {splitMode && !isFullyPaid ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              decreaseItemSelection(item.id);
                            }}
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-lg font-bold ${
                              isSelected ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'
                            }`}
                            disabled={!isSelected}
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-bold text-blue-600">
                            {selectedQty}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleItemSelection(item.id, unpaidQty);
                            }}
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-lg font-bold ${
                              selectedQty < unpaidQty ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'
                            }`}
                            disabled={selectedQty >= unpaidQty}
                          >
                            +
                          </button>
                          <span className="text-xs text-gray-400">/ {unpaidQty} kalan</span>
                        </div>
                      ) : (
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                          isFullyPaid 
                            ? 'bg-green-200 text-green-700' 
                            : 'bg-primary-100 text-primary-600'
                        }`}>
                          {item.quantity}
                        </span>
                      )}
                      <div>
                        <p className={`font-medium ${isFullyPaid ? 'text-green-800' : 'text-gray-900'}`}>
                          {item.menuItem.name}
                        </p>
                        {item.notes && (
                          <p className="text-sm text-gray-500">Not: {item.notes}</p>
                        )}
                        {item.paidQuantity > 0 && !isFullyPaid && (
                          <p className="text-xs text-green-600 mt-0.5">
                            {item.paidQuantity} adet ödendi, {unpaidQty} adet kaldı
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${isFullyPaid ? 'text-green-700' : 'text-gray-900'}`}>
                        {splitMode && isSelected ? (
                          <span className="text-blue-600">
                            {(item.unitPrice * selectedQty).toLocaleString('tr-TR')} ₺
                          </span>
                        ) : (
                          `${item.total.toLocaleString('tr-TR')} ₺`
                        )}
                      </p>
                      {!splitMode && (
                        <span className={`badge text-xs ${isFullyPaid ? 'bg-green-100 text-green-700' : getStatusColor(item.status)}`}>
                          {isFullyPaid ? 'Ödendi' : getStatusText(item.status)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Split payment summary */}
            {splitMode && Object.keys(selectedItems).length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-blue-900">Seçilen Ürünler Toplamı</span>
                  <span className="text-xl font-bold text-blue-600">
                    {getSelectedTotal().toLocaleString('tr-TR')} ₺
                  </span>
                </div>
                <button
                  onClick={() => {
                    setPaymentAmount(getSelectedTotal().toString());
                    setShowPayment(true);
                  }}
                  className="btn btn-primary w-full flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Bu Ürünlerin Ödemesini Al
                </button>
              </div>
            )}

            {order.notes && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Not:</strong> {order.notes}
                </p>
              </div>
            )}
          </div>

          {/* Status actions */}
          {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">İşlemler</h2>
              <div className="flex flex-wrap gap-2">
                {order.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleStatusChange('CONFIRMED')}
                      disabled={isProcessing}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Onayla
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={isProcessing}
                      className="btn btn-danger flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      İptal Et
                    </button>
                  </>
                )}
                
                {order.status === 'CONFIRMED' && (
                  <button
                    onClick={() => handleStatusChange('PREPARING')}
                    disabled={isProcessing}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <ChefHat className="w-4 h-4" />
                    Hazırlamaya Başla
                  </button>
                )}
                
                {order.status === 'PREPARING' && (
                  <button
                    onClick={() => handleStatusChange('READY')}
                    disabled={isProcessing}
                    className="btn btn-success flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Hazır
                  </button>
                )}
                
                {order.status === 'READY' && (
                  <button
                    onClick={() => handleStatusChange('SERVED')}
                    disabled={isProcessing}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Servis Edildi
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Payment section */}
        <div className="space-y-4">
          {/* Order info */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Bilgiler</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{formatTime(order.createdAt)}</span>
              </div>
              {order.user && (
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{order.user.name}</span>
                </div>
              )}
              {order.table && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{order.table.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment summary */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Ödeme</h2>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Ara Toplam</span>
                <span>{order.subtotal.toLocaleString('tr-TR')} ₺</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">KDV</span>
                <span>{order.tax.toLocaleString('tr-TR')} ₺</span>
              </div>
              {order.tip > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Bahşiş</span>
                  <span>{order.tip.toLocaleString('tr-TR')} ₺</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t text-lg font-bold">
                <span>Toplam</span>
                <span>{order.total.toLocaleString('tr-TR')} ₺</span>
              </div>
            </div>

            {/* Payments made */}
            {order.payments && order.payments.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium text-gray-700 mb-3">Ödemeler</p>
                <div className="space-y-2">
                  {order.payments.map((payment) => (
                    <div key={payment.id} className="p-2 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-700">
                            {getPaymentMethodText(payment.method)}
                          </span>
                          <p className="text-xs text-gray-500">
                            {new Date(payment.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600 font-bold">
                            {payment.amount.toLocaleString('tr-TR')} ₺
                          </span>
                          <button
                            onClick={() => handleRefundPayment(payment.id)}
                            disabled={isProcessing}
                            className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors"
                            title="İade Et"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {payment.paidItems && Object.keys(payment.paidItems).length > 0 && (
                        <div className="mt-1 pt-1 border-t border-green-200">
                          <p className="text-xs text-green-700">
                            {Object.entries(payment.paidItems).map(([itemId, qty]) => {
                              const item = order.items.find(i => i.id === itemId);
                              return item ? `${qty}x ${item.menuItem.name}` : null;
                            }).filter(Boolean).join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {remainingAmount > 0 && (
                  <div className="flex justify-between text-sm mt-3 pt-2 border-t">
                    <span className="text-gray-600 font-medium">Kalan Tutar</span>
                    <span className="text-red-600 font-bold">
                      {remainingAmount.toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Payment button */}
            {order.paymentStatus !== 'PAID' && order.status !== 'CANCELLED' && (
              <button
                onClick={() => setShowPayment(true)}
                className="btn btn-success w-full mt-4 flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Ödeme Al
              </button>
            )}

            {order.paymentStatus === 'PAID' && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg text-center">
                <Check className="w-6 h-6 text-green-600 mx-auto mb-1" />
                <p className="text-green-800 font-medium">Ödeme Tamamlandı</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">Ödeme Al</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tutar
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="input text-lg"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ödeme Yöntemi
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'CASH', label: 'Nakit', icon: Banknote },
                    { value: 'CREDIT_CARD', label: 'Kredi Kartı', icon: CreditCard },
                  ].map((method) => (
                    <button
                      key={method.value}
                      onClick={() => setPaymentMethod(method.value)}
                      className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors ${
                        paymentMethod === method.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <method.icon className={`w-6 h-6 ${
                        paymentMethod === method.value ? 'text-primary-500' : 'text-gray-400'
                      }`} />
                      <span className="font-medium">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowPayment(false)}
                className="btn btn-secondary flex-1"
              >
                İptal
              </button>
              <button
                onClick={handlePayment}
                disabled={isProcessing}
                className="btn btn-success flex-1"
              >
                {isProcessing ? 'İşleniyor...' : 'Onayla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

