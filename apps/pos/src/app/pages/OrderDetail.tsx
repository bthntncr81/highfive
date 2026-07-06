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
  UserPlus,
  Tag,
  Trash2,
} from 'lucide-react';

interface Order {
  id: string;
  orderNumber: number;
  status: string;
  paymentStatus: string;
  type: string;
  subtotal: number;
  tax: number;
  discount: number;
  deliveryFee: number;
  serviceCharge: number;
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
  menuItem: { name: string } | null; // null when custom builder item
  menuItemName?: string | null; // preserved name (custom item or deleted product)
  modifiers?: string[]; // ["Hamur: Klasik", "Sos: Domates", ...] for custom items
  paidQuantity: number; // Ödenen miktar
}

// Helper: any item için doğru isim — menuItem null bile olsa çalışır
function getItemName(item: OrderItem | { menuItem: { name: string } | null; menuItemName?: string | null; notes?: string }): string {
  return item.menuItem?.name ?? item.menuItemName ?? item.notes ?? "Özel Ürün";
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
  // Fiş başlığı için tenant restoran bilgisi (beyaz-etiket).
  const [restaurantInfo, setRestaurantInfo] = useState<{ name?: string; phone?: string; address?: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Split payment state
  const [splitMode, setSplitMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<{[itemId: string]: number}>({}); // itemId -> quantity
  const [splitPaymentType, setSplitPaymentType] = useState<'items' | 'equal' | 'custom'>('items');

  // Kişi gruplama state
  const [itemGroups, setItemGroups] = useState<{[itemId: string]: string}>({}); // itemId -> kişi adı
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupingItemId, setGroupingItemId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    fetchOrder();

    const unsubscribe = onMessage('orders', (data) => {
      if (data.order?.id === id) {
        setOrder(data.order);
      }
    });

    return unsubscribe;
  }, [id]);

  // Fiş başlığı için restoran adı/telefonu (tenant Ayarlar'dan).
  useEffect(() => {
    api.get('/api/settings/public/restaurant')
      .then((r) => { if (r?.restaurant) setRestaurantInfo(r.restaurant); })
      .catch(() => { /* varsayılan başlık kalır */ });
  }, []);

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

  const handleDeleteItem = async (itemId: string, itemName: string, quantity: number) => {
    let deleteQty = quantity;
    if (quantity > 1) {
      const input = prompt(`"${itemName}" (${quantity} adet) - Kaç adetini silmek istiyorsunuz?`, '1');
      if (!input) return;
      deleteQty = parseInt(input);
      if (isNaN(deleteQty) || deleteQty < 1 || deleteQty > quantity) {
        alert(`Geçerli bir sayı girin (1-${quantity})`);
        return;
      }
    } else {
      if (!confirm(`"${itemName}" siparişten silinecek. Emin misiniz?`)) return;
    }
    try {
      await api.delete(`/api/orders/${id}/items/${itemId}?qty=${deleteQty}`, token!);
      fetchOrder();
    } catch (error: any) {
      alert(error.message || 'Ürün silinemedi');
    }
  };

  const isAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const canDeleteItems = ['OWNER', 'ADMIN', 'CASHIER', 'WAITER'].includes(user?.role || '');

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
    <h1>${restaurantInfo.name || 'Restoran'}</h1>
    ${restaurantInfo.address ? `<p>${restaurantInfo.address}</p>` : ''}
    ${restaurantInfo.phone ? `<p>Tel: ${restaurantInfo.phone}</p>` : ''}
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
      <span class="item-name">${getItemName(item)}</span>
      <span class="item-qty">${item.quantity}</span>
      <span class="item-price">${item.total.toFixed(2)}₺</span>
    </div>
    ${(item.modifiers && item.modifiers.length > 0)
      ? item.modifiers.map(m => `<div style="font-size:10px;color:#444;margin-left:10px;">→ ${m}</div>`).join('')
      : ''}
    ${(item.notes && item.notes !== getItemName(item)) ? `<div style="font-size:10px;color:#666;margin-left:10px;">Not: ${item.notes}</div>` : ''}
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
        <span class="item-name">${getItemName(item)}</span>
        <span class="item-qty">x${item.quantity}</span>
      </div>
      ${(item.modifiers && item.modifiers.length > 0)
        ? item.modifiers.map(m => `<div class="item-notes" style="margin-top:3px;">→ ${m}</div>`).join('')
        : ''}
      ${(item.notes && item.notes !== getItemName(item)) ? `<div class="item-notes">⚠️ ${item.notes}</div>` : ''}
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

  // Kişi gruplama fonksiyonları
  const existingGroupNames = [...new Set(Object.values(itemGroups))];

  const assignGroup = (itemId: string, name: string) => {
    setItemGroups(prev => ({ ...prev, [itemId]: name }));
    setShowGroupModal(false);
    setGroupingItemId(null);
    setGroupName('');
  };

  const removeGroup = (itemId: string) => {
    setItemGroups(prev => {
      const { [itemId]: _, ...rest } = prev;
      return rest;
    });
  };

  const getGroupedItems = () => {
    if (!order) return {};
    const groups: { [groupName: string]: OrderItem[] } = {};
    order.items.forEach(item => {
      const group = itemGroups[item.id] || 'Gruplanmamış';
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
    });
    return groups;
  };

  const getGroupTotal = (groupName: string) => {
    const grouped = getGroupedItems();
    const items = grouped[groupName] || [];
    return items.reduce((sum, item) => sum + Number(item.total), 0);
  };

  const getGroupUnpaidTotal = (groupName: string) => {
    const grouped = getGroupedItems();
    const items = grouped[groupName] || [];
    return items.reduce((sum, item) => {
      const unpaid = getUnpaidQuantity(item);
      return sum + (item.unitPrice * unpaid);
    }, 0);
  };

  const selectGroupItems = (groupName: string) => {
    if (!order) return;
    const grouped = getGroupedItems();
    const items = grouped[groupName] || [];
    const newSelected: {[itemId: string]: number} = {};
    items.forEach(item => {
      const unpaid = getUnpaidQuantity(item);
      if (unpaid > 0) newSelected[item.id] = unpaid;
    });
    setSelectedItems(newSelected);
    setSplitMode(true);
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

  // payments[].amount ve order.total Prisma Decimal'den string olarak gelir.
  // Number() yapmazsak reduce "100"+"200"="0100200" (string concat) yapar,
  // total - paidAmount koca negatif rakam çıkarır.
  const paidAmount = order.payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
  const remainingAmount = (Number(order.total) || 0) - paidAmount;

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
          {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
            <button
              onClick={() => navigate(`/menu?${order.table ? `table=${order.table.id}&` : ''}orderId=${order.id}`)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Ek Sipariş
            </button>
          )}
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
              <div className="flex items-center gap-2">
                {order.paymentStatus !== 'PAID' && (
                  <>
                    <button
                      onClick={toggleSplitMode}
                      className={`btn ${splitMode ? 'btn-primary' : 'btn-secondary'} btn-sm flex items-center gap-2`}
                    >
                      <Split className="w-4 h-4" />
                      {splitMode ? 'Seçimi İptal' : 'Ayrı Öde'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {splitMode && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Ayrı ödemek istediğiniz ürünleri seçin
                </p>
              </div>
            )}

            {/* Kişi Grupları Özeti */}
            {existingGroupNames.length > 0 && !splitMode && (
              <div className="mb-4 space-y-2">
                {Object.entries(getGroupedItems())
                  .filter(([name]) => name !== 'Gruplanmamış')
                  .map(([name, items]) => {
                    const groupUnpaid = getGroupUnpaidTotal(name);
                    const groupTotal = getGroupTotal(name);
                    const allPaid = groupUnpaid <= 0;
                    return (
                      <div key={name} className={`p-3 rounded-lg border ${allPaid ? 'bg-green-50 border-green-200' : 'bg-purple-50 border-purple-200'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-purple-600" />
                            <span className="font-medium text-gray-900">{name}</span>
                            <span className="text-xs text-gray-500">({items.length} ürün)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {allPaid ? (
                              <span className="text-sm font-bold text-green-600 flex items-center gap-1">
                                <Check className="w-4 h-4" /> Ödendi
                              </span>
                            ) : (
                              <>
                                <span className="text-sm font-bold text-purple-700">
                                  {groupUnpaid.toLocaleString('tr-TR')} ₺
                                </span>
                                <button
                                  onClick={() => selectGroupItems(name)}
                                  className="btn btn-primary btn-sm text-xs"
                                >
                                  Öde
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {items.map(i => `${i.quantity}x ${getItemName(i)}`).join(', ')}
                        </div>
                      </div>
                    );
                  })}
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
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-medium ${isFullyPaid ? 'text-green-800' : 'text-gray-900'}`}>
                            {getItemName(item)}
                          </p>
                          {/* Custom item rozeti */}
                          {!item.menuItem && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold uppercase tracking-wider">
                              Özel
                            </span>
                          )}
                          {/* Kişi grup etiketi */}
                          {itemGroups[item.id] && !splitMode && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                              <User className="w-3 h-3" />
                              {itemGroups[item.id]}
                              <button
                                onClick={(e) => { e.stopPropagation(); removeGroup(item.id); }}
                                className="ml-0.5 hover:text-purple-900"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          )}
                          {/* Kişiye ata butonu */}
                          {!itemGroups[item.id] && !splitMode && !isFullyPaid && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setGroupingItemId(item.id);
                                setShowGroupModal(true);
                              }}
                              className="p-0.5 text-gray-300 hover:text-purple-500 hover:bg-purple-50 rounded transition-colors"
                              title="Kişiye ata"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {/* Modifiers — kendi tasarla içeriği (Hamur: Klasik, Sos: Domates ...) */}
                        {item.modifiers && item.modifiers.length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            {item.modifiers.map((m, idx) => (
                              <p key={idx} className="text-[12px] text-gray-700 leading-snug">
                                <span className="text-amber-700 font-semibold">→</span> {m}
                              </p>
                            ))}
                          </div>
                        )}
                        {item.notes && item.notes !== getItemName(item) && (
                          <p className="text-sm text-gray-500 mt-1">Not: {item.notes}</p>
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
                      <div className="flex items-center gap-1">
                        {!splitMode && (
                          <span className={`badge text-xs ${isFullyPaid ? 'bg-green-100 text-green-700' : getStatusColor(item.status)}`}>
                            {isFullyPaid ? 'Ödendi' : getStatusText(item.status)}
                          </span>
                        )}
                        {canDeleteItems && !isFullyPaid && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleDeleteItem(item.id, item.menuItem?.name || 'Ürün', item.quantity)}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Ürünü sil"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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

                {order.status === 'SERVED' && (
                  <>
                    <button
                      onClick={() => handleStatusChange('READY')}
                      disabled={isProcessing}
                      className="btn btn-secondary flex items-center gap-2"
                    >
                      <ChefHat className="w-4 h-4" />
                      Hazır'a Geri Al
                    </button>
                    <button
                      onClick={() => handleStatusChange('PREPARING')}
                      disabled={isProcessing}
                      className="btn btn-secondary flex items-center gap-2"
                    >
                      <ChefHat className="w-4 h-4" />
                      Hazırlanıyor'a Al
                    </button>
                    <button
                      onClick={() => handleStatusChange('COMPLETED')}
                      disabled={isProcessing}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Tamamla
                    </button>
                  </>
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
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>İndirim</span>
                  <span>−{Number(order.discount).toLocaleString('tr-TR')} ₺</span>
                </div>
              )}
              {Number(order.tax) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">KDV</span>
                  <span>{Number(order.tax).toLocaleString('tr-TR')} ₺</span>
                </div>
              )}
              {Number(order.deliveryFee) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Teslimat Ücreti</span>
                  <span>{Number(order.deliveryFee).toLocaleString('tr-TR')} ₺</span>
                </div>
              )}
              {Number(order.serviceCharge) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Servis Ücreti</span>
                  <span>{Number(order.serviceCharge).toLocaleString('tr-TR')} ₺</span>
                </div>
              )}
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
                              return item ? `${qty}x ${getItemName(item)}` : null;
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

            {/* Payment buttons */}
            {order.paymentStatus !== 'PAID' && order.status !== 'CANCELLED' && (
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => {
                    setPaymentAmount(remainingAmount.toString());
                    setSplitMode(false);
                    setSelectedItems({});
                    setShowPayment(true);
                  }}
                  className="btn btn-success w-full flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Tamamını Öde ({remainingAmount.toLocaleString('tr-TR')} ₺)
                </button>
                <button
                  onClick={() => {
                    setSplitMode(true);
                    setSelectedItems({});
                  }}
                  className="btn btn-secondary w-full flex items-center justify-center gap-2 text-sm"
                >
                  <Split className="w-4 h-4" />
                  Ürün Seçerek Öde
                </button>
              </div>
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
          <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {splitMode && Object.keys(selectedItems).length > 0 ? 'Seçili Ürünlerin Ödemesi' : 'Ödeme Al'}
            </h2>

            {/* Seçili ürünler listesi */}
            {splitMode && Object.keys(selectedItems).length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs font-medium text-blue-700 mb-2">Ödenecek ürünler:</p>
                <div className="space-y-1">
                  {Object.entries(selectedItems).map(([itemId, qty]) => {
                    const item = order?.items.find(i => i.id === itemId);
                    if (!item) return null;
                    return (
                      <div key={itemId} className="flex justify-between text-sm">
                        <span className="text-blue-900">{qty}x {getItemName(item)}</span>
                        <span className="font-medium text-blue-900">{(item.unitPrice * qty).toLocaleString('tr-TR')} ₺</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 pt-2 border-t border-blue-200 font-bold text-blue-900">
                  <span>Toplam</span>
                  <span>{getSelectedTotal().toLocaleString('tr-TR')} ₺</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Tutar - sadece split mode değilken göster */}
              {!(splitMode && Object.keys(selectedItems).length > 0) && (
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
              )}

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
                onClick={splitMode && Object.keys(selectedItems).length > 0 ? handleSplitPayment : handlePayment}
                disabled={isProcessing}
                className="btn btn-success flex-1"
              >
                {isProcessing ? 'İşleniyor...' : 'Onayla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kişi Gruplama Modalı */}
      {showGroupModal && groupingItemId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowGroupModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Kişiye Ata
            </h2>

            {/* Mevcut gruplar */}
            {existingGroupNames.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">Mevcut kişiler:</p>
                <div className="flex flex-wrap gap-2">
                  {existingGroupNames.map(name => (
                    <button
                      key={name}
                      onClick={() => assignGroup(groupingItemId, name)}
                      className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Yeni kişi ekle */}
            <div>
              <p className="text-sm text-gray-500 mb-2">
                {existingGroupNames.length > 0 ? 'Veya yeni kişi:' : 'Kişi adı:'}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && groupName.trim()) assignGroup(groupingItemId, groupName.trim());
                  }}
                  placeholder="Örn: Ahmet, Masa 1 Sol..."
                  className="input flex-1"
                  autoFocus
                />
                <button
                  onClick={() => groupName.trim() && assignGroup(groupingItemId, groupName.trim())}
                  disabled={!groupName.trim()}
                  className="btn btn-primary"
                >
                  Ata
                </button>
              </div>
            </div>

            <button
              onClick={() => { setShowGroupModal(false); setGroupingItemId(null); }}
              className="btn btn-secondary w-full mt-4"
            >
              İptal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

