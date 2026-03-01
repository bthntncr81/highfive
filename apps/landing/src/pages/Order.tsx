import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../lib/cartStore';
import { useContent } from '../lib/contentStore';
import { useLoyalty } from '../lib/loyaltyStore';
import { useOrderTracking } from '../hooks/useOrderTracking';
import { orderApi, happyHourApi, serviceChargeApi, type HappyHour } from '../lib/api';

type OrderMode = 'table' | 'takeaway' | 'delivery' | null;

const DELIVERY_FEE = 29; // Kurye ücreti

const TIP_OPTIONS = [
  { percent: 0, label: 'Yok' },
  { percent: 10, label: '%10' },
  { percent: 15, label: '%15' },
  { percent: 20, label: '%20' },
];

export const Order = () => {
  const navigate = useNavigate();
  useContent(); // Load content
  const { member, redeemPoints } = useLoyalty();
  const { trackOrder } = useOrderTracking();
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems,
    totalPrice,
    tableSession,
    clearTableSession,
  } = useCart();

  const [orderMode, setOrderMode] = useState<OrderMode>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Customer info for takeaway/delivery
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [apiMenuItems, setApiMenuItems] = useState<any[]>([]);

  // Tip state
  const [selectedTipPercent, setSelectedTipPercent] = useState(0);
  const [customTip, setCustomTip] = useState('');
  const [showCustomTip, setShowCustomTip] = useState(false);

  // Service charge
  const [serviceCharge, setServiceCharge] = useState(0);
  const [serviceChargeRate, setServiceChargeRate] = useState(0);

  // Happy Hour
  const [activeHappyHours, setActiveHappyHours] = useState<HappyHour[]>([]);

  // Loyalty Program - Puan kullanma
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);

  // Calculate max redeemable points (100 puan = 10₺)
  const maxRedeemablePoints = member ? Math.min(
    Math.floor(member.totalPoints / 100) * 100, // 100'ün katları
    Math.floor(totalPrice / 10) * 100 // Toplam fiyatı geçmemeli
  ) : 0;

  // Calculate points discount
  const pointsDiscount = usePoints ? redeemPoints(pointsToUse) : 0;

  // Calculate tip amount
  const tipAmount = showCustomTip
    ? parseFloat(customTip) || 0
    : Math.round(totalPrice * (selectedTipPercent / 100) * 100) / 100;

  // Calculate delivery fee
  const deliveryFee = orderMode === 'delivery' ? DELIVERY_FEE : 0;

  // Calculate grand total with points discount and delivery fee
  const grandTotal = Math.max(0, totalPrice + serviceCharge + tipAmount + deliveryFee - pointsDiscount);

  // Fetch API menu on mount
  useEffect(() => {
    fetchApiMenu();
    fetchServiceCharge();
    fetchActiveHappyHours();
  }, []);

  const fetchApiMenu = async () => {
    const response = await orderApi.getMenu();
    if (response.success && response.data?.items) {
      setApiMenuItems(response.data.items);
    }
  };

  const fetchServiceCharge = async () => {
    const response = await serviceChargeApi.calculate(totalPrice, undefined, orderMode || undefined);
    if (response.success && response.data) {
      setServiceCharge(response.data.serviceCharge);
      setServiceChargeRate(response.data.serviceChargeRate);
    }
  };

  const fetchActiveHappyHours = async () => {
    const response = await happyHourApi.getActive();
    if (response.success && response.data?.active) {
      setActiveHappyHours(response.data.active);
    }
  };

  // Calculate points to earn for this order
  const pointsToEarn = Math.floor((totalPrice - pointsDiscount) / 10) * (member?.loyaltyTier?.pointMultiplier || 1);

  // Recalculate service charge when order mode changes
  useEffect(() => {
    if (orderMode) {
      fetchServiceCharge();
    }
  }, [orderMode, totalPrice]);

  // Find API menu item by name
  const findApiMenuItem = (name: string) => {
    return apiMenuItems.find(
      (item) => item.name.toLowerCase() === name.toLowerCase()
    );
  };

  const handleSubmitOrder = async () => {
    if (items.length === 0) return;

    // Validation for delivery
    if (orderMode === 'delivery' && !customerAddress.trim()) {
      setError('Lütfen adres bilgisi girin');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Map landing page items to API menu items
      const orderItems = [];
      for (const ci of items) {
        const apiItem = findApiMenuItem(ci.item.name);
        if (apiItem) {
          orderItems.push({
            menuItemId: apiItem.id,
            quantity: ci.quantity,
            notes: '',
          });
        } else {
          console.warn(`Menu item not found in API: ${ci.item.name}`);
        }
      }

      if (orderItems.length === 0) {
        setError('Seçilen ürünler şu anda mevcut değil');
        setIsSubmitting(false);
        return;
      }

      // Determine order type
      let orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' = 'TAKEAWAY';
      if (orderMode === 'table') orderType = 'DINE_IN';
      else if (orderMode === 'delivery') orderType = 'DELIVERY';

      const response = await orderApi.createOrder({
        tableId: orderMode === 'table' && tableSession ? tableSession.id : undefined,
        sessionToken: orderMode === 'table' && tableSession ? tableSession.sessionToken : undefined,
        customerName: orderMode !== 'table' ? customerName : undefined,
        customerPhone: orderMode !== 'table' ? customerPhone : undefined,
        customerEmail: customerEmail || undefined,
        customerAddress: orderMode === 'delivery' ? customerAddress : undefined,
        items: orderItems,
        type: orderType,
        notes: orderNotes,
        tip: tipAmount > 0 ? tipAmount : undefined,
        deliveryFee: orderMode === 'delivery' ? DELIVERY_FEE : undefined,
      });

      if (response.success && response.data?.order) {
        const orderId = response.data.order.id;
        const orderNum = response.data.order.orderNumber;

        // Start tracking the order (for live status in navbar)
        trackOrder(orderId, orderNum, orderType);

        // If card payment, redirect to payment page
        if (paymentMethod === 'card') {
          navigate(`/payment?orderId=${orderId}&tip=${tipAmount}`);
          return;
        }

        // Cash payment - show success
        setOrderNumber(orderNum);
        setOrderSuccess(true);
        clearCart();
      } else {
        if (response.error?.includes('Oturum') || response.error?.includes('SESSION')) {
          clearTableSession();
          setError('Oturum süresi dolmuş. Lütfen QR kodu tekrar okutun.');
          setOrderMode(null);
        } else {
          setError(response.error || 'Sipariş oluşturulamadı');
        }
      }
    } catch (err) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Order success state
  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-xl p-8 text-center max-w-md w-full shadow-retro"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="text-7xl mb-4"
          >
            ✅
          </motion.div>
          <h1 className="font-display text-3xl text-foreground mb-2">
            Siparişiniz Alındı!
          </h1>
          {orderNumber && (
            <p className="text-primary font-display text-2xl mb-4">
              Sipariş No: #{orderNumber.toString().padStart(4, '0')}
            </p>
          )}
          {tableSession && (
            <p className="text-foreground-muted mb-4">
              📍 {tableSession.name}
            </p>
          )}
          {orderMode === 'delivery' && (
            <p className="text-foreground-muted mb-4">
              🚚 Kuryemiz en kısa sürede yola çıkacak
            </p>
          )}
          <p className="text-foreground-muted mb-6">
            Siparişiniz en kısa sürede hazırlanacaktır.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setOrderSuccess(false);
              setOrderNumber(null);
              clearTableSession();
              navigate('/menu');
            }}
            className="btn-primary w-full"
          >
            Menüye Dön
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <img
            src="/logo.svg"
            alt="High Five"
            className="w-24 h-24 mx-auto mb-4 object-contain"
          />
          <h1 className="font-display text-3xl text-foreground">
            Sipariş Ver
          </h1>
          {tableSession && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center gap-2 bg-accent text-foreground px-4 py-2 rounded-full mt-2 font-display"
            >
              📍 {tableSession.name}
            </motion.div>
          )}
        </motion.div>

        {/* Active Happy Hours Banner */}
        {activeHappyHours.length > 0 && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-gradient-to-r from-purple-600 to-pink-500 rounded-xl p-4 mb-6 text-white"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎉</span>
              <div>
                <h3 className="font-display text-lg">{activeHappyHours[0].name}</h3>
                <p className="text-sm text-white/80">
                  {activeHappyHours[0].description || `${activeHappyHours[0].discountPercent}% indirim!`}
                </p>
                <p className="text-xs text-white/60 mt-1">
                  ⏰ {activeHappyHours[0].endTime}'e kadar geçerli
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Order Mode Selection */}
        {!orderMode && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-xl p-6 shadow-retro mb-6"
          >
            <h2 className="font-display text-xl text-foreground mb-4 text-center">
              Nasıl sipariş vermek istersiniz?
            </h2>
            <div className={`grid grid-cols-1 ${tableSession ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
              {tableSession && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setOrderMode('table')}
                  className="p-6 border-2 border-accent bg-accent/10 rounded-xl hover:border-primary hover:bg-background/50 transition-all"
                >
                  <span className="text-4xl block mb-2">🍽️</span>
                  <span className="font-display text-foreground">Masaya Sipariş</span>
                  <p className="text-sm text-foreground-muted mt-1">📍 {tableSession.name}</p>
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setOrderMode('takeaway')}
                className="p-6 border-2 border-border rounded-xl hover:border-primary hover:bg-background/50 transition-all"
              >
                <span className="text-4xl block mb-2">🥡</span>
                <span className="font-display text-foreground">Gel Al</span>
                <p className="text-sm text-foreground-muted mt-1">Siparişinizi mağazadan alın</p>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setOrderMode('delivery')}
                className="p-6 border-2 border-border rounded-xl hover:border-blue-500 hover:bg-blue-50/50 transition-all"
              >
                <span className="text-4xl block mb-2">🚚</span>
                <span className="font-display text-foreground">Eve Servis</span>
                <p className="text-sm text-foreground-muted mt-1">Kapınıza getirelim (+{DELIVERY_FEE}₺)</p>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Cart Items */}
        {orderMode && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-xl p-6 shadow-retro mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl text-foreground">
                Sepetim ({totalItems} ürün)
              </h2>
              <button
                onClick={() => setOrderMode(null)}
                className="text-sm text-foreground-muted hover:text-primary"
              >
                ← Geri
              </button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-3">🛒</div>
                <p className="text-foreground-muted">Sepetiniz boş</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/menu')}
                  className="btn-secondary mt-4"
                >
                  Menüye Git
                </motion.button>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {items.map((cartItem) => (
                    <motion.div
                      key={cartItem.item.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, height: 0 }}
                      className="flex items-center gap-3 p-3 bg-background/50 rounded-lg"
                    >
                      <img
                        src={cartItem.item.image}
                        alt={cartItem.item.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-display text-foreground truncate">
                          {cartItem.item.name}
                        </h4>
                        <p className="text-sm text-primary font-display">
                          ₺{cartItem.item.price}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(cartItem.item.id, cartItem.quantity - 1)}
                          className="w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center hover:bg-background"
                        >
                          −
                        </button>
                        <span className="w-8 text-center font-display">{cartItem.quantity}</span>
                        <button
                          onClick={() => updateQuantity(cartItem.item.id, cartItem.quantity + 1)}
                          className="w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center hover:bg-background"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(cartItem.item.id)}
                        className="text-foreground-muted hover:text-primary p-1"
                      >
                        🗑️
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}

        {/* Customer Info (for takeaway & delivery) */}
        {(orderMode === 'takeaway' || orderMode === 'delivery') && items.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-xl p-6 shadow-retro mb-6"
          >
            <h2 className="font-display text-xl text-foreground mb-4">
              {orderMode === 'delivery' ? '🚚 Teslimat Bilgileri' : '📞 İletişim Bilgileri'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground-muted mb-1">Adınız *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary focus:outline-none"
                  placeholder="Adınız Soyadınız"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-muted mb-1">Telefon *</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary focus:outline-none"
                  placeholder="05XX XXX XX XX"
                />
              </div>

              {/* Address field for delivery */}
              {orderMode === 'delivery' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                >
                  <label className="block text-sm font-medium text-foreground-muted mb-1">Teslimat Adresi *</label>
                  <textarea
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary focus:outline-none resize-none"
                    rows={3}
                    placeholder="Mahalle, sokak, bina no, daire no..."
                  />
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 text-blue-700">
                      <span className="text-xl">🚚</span>
                      <div>
                        <p className="font-display text-sm">Kurye Ücreti: <span className="font-bold">{DELIVERY_FEE}₺</span></p>
                        <p className="text-xs text-blue-600">Tahmini teslimat: 30-45 dakika</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Loyalty Member Info (if logged in via header) */}
            {member && (
              <div className="mt-4 p-4 rounded-xl border-2 border-orange-300 bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">👑</span>
                    <div>
                      <p className="font-display text-foreground">
                        Hoş geldin, {member.name || 'Üye'}!
                      </p>
                      <p className="text-sm text-orange-600">
                        {member.loyaltyTier?.name || 'Bronze'} • {member.totalPoints} Puan
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-green-600 font-display">
                    +{pointsToEarn} puan kazanacaksın
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Order Notes */}
        {orderMode && items.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-xl p-6 shadow-retro mb-6"
          >
            <h2 className="font-display text-xl text-foreground mb-4">Sipariş Notu</h2>
            <textarea
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary focus:outline-none resize-none"
              rows={3}
              placeholder="Özel isteklerinizi yazın..."
            />
          </motion.div>
        )}

        {/* Tipping Section */}
        {orderMode && items.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-xl p-6 shadow-retro mb-6"
          >
            <h2 className="font-display text-xl text-foreground mb-4 flex items-center gap-2">
              <span>💝</span> Bahşiş Ekle
            </h2>
            <p className="text-sm text-foreground-muted mb-4">
              Ekibimizi mutlu etmek ister misiniz?
            </p>

            <div className="grid grid-cols-4 gap-2 mb-4">
              {TIP_OPTIONS.map((option) => (
                <motion.button
                  key={option.percent}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedTipPercent(option.percent);
                    setShowCustomTip(false);
                    setCustomTip('');
                  }}
                  className={`py-3 rounded-lg font-display transition-all ${
                    !showCustomTip && selectedTipPercent === option.percent
                      ? 'bg-primary text-white'
                      : 'bg-background text-foreground hover:bg-accent/30'
                  }`}
                >
                  {option.label}
                </motion.button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowCustomTip(!showCustomTip);
                  if (!showCustomTip) setSelectedTipPercent(0);
                }}
                className={`text-sm px-3 py-2 rounded-lg transition-all ${
                  showCustomTip
                    ? 'bg-primary text-white'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                ✏️ Özel Tutar
              </button>

              <AnimatePresence>
                {showCustomTip && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 'auto', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <span className="text-foreground font-display">₺</span>
                    <input
                      type="number"
                      value={customTip}
                      onChange={(e) => setCustomTip(e.target.value)}
                      className="w-24 px-3 py-2 rounded-lg border-2 border-border focus:border-primary focus:outline-none font-display"
                      placeholder="0"
                      min="0"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {tipAmount > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-green-600 mt-3 font-display"
              >
                💚 +₺{tipAmount.toFixed(2)} bahşiş eklenecek
              </motion.p>
            )}
          </motion.div>
        )}

        {/* Payment Method Selection */}
        {orderMode && items.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-xl p-6 shadow-retro mb-6"
          >
            <h2 className="font-display text-xl text-foreground mb-4">Ödeme Yöntemi</h2>
            <div className="grid grid-cols-1 gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setPaymentMethod('cash')}
                className={`p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                  paymentMethod === 'cash'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-foreground-muted'
                }`}
              >
                <span className="text-3xl">💵</span>
                <div className="text-left">
                  <span className="font-display text-foreground block">
                    {orderMode === 'delivery' ? 'Nakit / Kredi Kartı Kapıda' : 'Nakit / Kredi Kartı Kasada'}
                  </span>
                  <span className="text-xs text-foreground-muted">
                    {orderMode === 'delivery'
                      ? 'Ödemenizi kapıda nakit veya kart ile yapın'
                      : 'Ödemenizi kasada nakit veya kart ile yapın'}
                  </span>
                </div>
                {paymentMethod === 'cash' && (
                  <span className="ml-auto text-primary text-xl">✓</span>
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setPaymentMethod('card')}
                className={`p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                  paymentMethod === 'card'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-border hover:border-foreground-muted'
                }`}
              >
                <span className="text-3xl">💳</span>
                <div className="text-left">
                  <span className="font-display text-foreground block">Kredi Kartı Online</span>
                  <span className="text-xs text-foreground-muted">3D Secure ile güvenli online ödeme</span>
                </div>
                {paymentMethod === 'card' && (
                  <span className="ml-auto text-blue-500 text-xl">✓</span>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Email for Card Payment */}
        {paymentMethod === 'card' && orderMode && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-xl p-6 shadow-retro mb-6"
          >
            <h2 className="font-display text-xl text-foreground mb-4">E-posta Adresi</h2>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary focus:outline-none"
              placeholder="ornek@email.com"
              required
            />
            <p className="text-xs text-foreground-muted mt-2">
              Ödeme makbuzu bu adrese gönderilecektir.
            </p>
          </motion.div>
        )}

        {/* Loyalty Points Usage Section */}
        {member && member.totalPoints >= 100 && orderMode && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-5 shadow-retro border-2 border-orange-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👑</span>
                <div>
                  <h3 className="font-display text-lg text-foreground">Puanlarını Kullan</h3>
                  <p className="text-sm text-gray-600">
                    Mevcut: <span className="font-bold text-orange-600">{member.totalPoints} puan</span>
                    {member.loyaltyTier && ` (${member.loyaltyTier.name})`}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={usePoints}
                  onChange={(e) => {
                    setUsePoints(e.target.checked);
                    if (e.target.checked) {
                      setPointsToUse(maxRedeemablePoints);
                    } else {
                      setPointsToUse(0);
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>

            {usePoints && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-3 pt-3 border-t border-orange-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Kullanılacak Puan</span>
                  <span className="font-bold text-orange-600">{pointsToUse} puan</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max={maxRedeemablePoints}
                  step="100"
                  value={pointsToUse}
                  onChange={(e) => setPointsToUse(parseInt(e.target.value))}
                  className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>100 puan</span>
                  <span>{maxRedeemablePoints} puan (max)</span>
                </div>
                <div className="mt-3 p-3 bg-green-100 rounded-lg text-center">
                  <span className="text-green-700 font-display text-lg">
                    🎁 {redeemPoints(pointsToUse)}₺ indirim uygulanacak!
                  </span>
                </div>
              </motion.div>
            )}

            {!usePoints && (
              <p className="text-xs text-gray-500 mt-2">
                💡 100 puan = 10₺ indirim olarak kullanabilirsiniz
              </p>
            )}
          </motion.div>
        )}

        {/* Order Summary & Submit */}
        {orderMode && items.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-xl p-6 shadow-retro"
          >
            {/* Price Breakdown */}
            <div className="space-y-2 mb-4 pb-4 border-b border-border-light">
              <div className="flex justify-between text-foreground-muted">
                <span>Ara Toplam</span>
                <span>₺{totalPrice.toFixed(2)}</span>
              </div>

              {serviceCharge > 0 && (
                <div className="flex justify-between text-foreground-muted">
                  <span>Servis Ücreti (%{serviceChargeRate})</span>
                  <span>₺{serviceCharge.toFixed(2)}</span>
                </div>
              )}

              {deliveryFee > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>Kurye Ücreti 🚚</span>
                  <span>₺{deliveryFee.toFixed(2)}</span>
                </div>
              )}

              {tipAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Bahşiş 💝</span>
                  <span>₺{tipAmount.toFixed(2)}</span>
                </div>
              )}

              {pointsDiscount > 0 && (
                <div className="flex justify-between text-orange-600 font-medium">
                  <span>Puan İndirimi 🎁</span>
                  <span>-₺{pointsDiscount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Points to earn info */}
            {member && !usePoints && (
              <div className="flex items-center justify-between mb-3 p-2 bg-amber-50 rounded-lg">
                <span className="text-sm text-amber-700">Bu siparişten kazanacağın</span>
                <span className="font-bold text-amber-600">+{pointsToEarn} puan ⭐</span>
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <span className="font-display text-lg text-foreground">Toplam</span>
              <div className="text-right">
                {pointsDiscount > 0 && (
                  <span className="text-sm text-gray-400 line-through block">
                    ₺{(totalPrice + serviceCharge + tipAmount + deliveryFee).toFixed(2)}
                  </span>
                )}
                <span className="font-display text-2xl text-primary">
                  ₺{grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm"
              >
                {error}
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmitOrder}
              disabled={
                isSubmitting ||
                ((orderMode === 'takeaway' || orderMode === 'delivery') && (!customerName || !customerPhone)) ||
                (orderMode === 'delivery' && !customerAddress.trim()) ||
                !paymentMethod ||
                (paymentMethod === 'card' && !customerEmail)
              }
              className={`w-full py-4 rounded-xl font-display text-lg transition-all ${
                paymentMethod === 'card'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                  : orderMode === 'delivery'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white'
                  : 'bg-primary hover:bg-primary/90 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
                    🍕
                  </motion.span>
                  Gönderiliyor...
                </span>
              ) : paymentMethod === 'card' ? (
                <span className="flex items-center justify-center gap-2">💳 Kart ile Öde - ₺{grandTotal.toFixed(2)}</span>
              ) : orderMode === 'delivery' ? (
                <span className="flex items-center justify-center gap-2">🚚 Eve Siparişi Onayla - ₺{grandTotal.toFixed(2)}</span>
              ) : (
                <span className="flex items-center justify-center gap-2">✅ Siparişi Onayla</span>
              )}
            </motion.button>

            {orderMode === 'takeaway' && (!customerName || !customerPhone) && (
              <p className="text-xs text-center text-foreground-muted mt-2">
                Lütfen iletişim bilgilerinizi doldurun
              </p>
            )}

            {orderMode && !paymentMethod && (
              <p className="text-xs text-center text-foreground-muted mt-2">
                Lütfen ödeme yöntemi seçin
              </p>
            )}

            {paymentMethod === 'card' && (
              <p className="text-xs text-center text-foreground-muted mt-3 flex items-center justify-center gap-2">
                <span>🔒</span> 3D Secure ile güvenli ödeme
              </p>
            )}
          </motion.div>
        )}

        {/* Add more items button */}
        {orderMode && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => navigate('/menu')}
            className="w-full mt-4 py-3 border-2 border-border rounded-xl text-foreground font-display hover:bg-background transition-colors"
          >
            + Daha Fazla Ürün Ekle
          </motion.button>
        )}
      </div>
    </div>
  );
};
