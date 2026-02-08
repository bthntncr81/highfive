import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../lib/cartStore';
import { useLoyalty } from '../lib/loyaltyStore';

// Credit card formatting helpers
const formatCardNumber = (value: string) => {
  const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  const matches = v.match(/\d{4,16}/g);
  const match = (matches && matches[0]) || '';
  const parts = [];
  for (let i = 0, len = match.length; i < len; i += 4) {
    parts.push(match.substring(i, i + 4));
  }
  return parts.length ? parts.join(' ') : value;
};

const formatExpiry = (value: string) => {
  const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  if (v.length >= 2) {
    return v.substring(0, 2) + '/' + v.substring(2, 4);
  }
  return v;
};

// Card brand detection
const getCardBrand = (number: string): string => {
  const cleanNumber = number.replace(/\s/g, '');
  if (/^4/.test(cleanNumber)) return 'visa';
  if (/^5[1-5]/.test(cleanNumber)) return 'mastercard';
  if (/^3[47]/.test(cleanNumber)) return 'amex';
  if (/^6(?:011|5)/.test(cleanNumber)) return 'discover';
  if (/^9792/.test(cleanNumber)) return 'troy';
  return 'generic';
};

// Card brand colors
const cardBrandColors: Record<string, string> = {
  visa: 'from-blue-600 to-blue-800',
  mastercard: 'from-red-500 to-orange-500',
  amex: 'from-blue-400 to-blue-600',
  troy: 'from-green-500 to-teal-600',
  generic: 'from-gray-600 to-gray-800',
};

// Card brand icons
const CardBrandIcon = ({ brand }: { brand: string }) => {
  const icons: Record<string, string> = {
    visa: '💳',
    mastercard: '🔴',
    amex: '💎',
    troy: '🇹🇷',
    generic: '💳',
  };
  return <span className="text-2xl">{icons[brand] || icons.generic}</span>;
};

// Floating food items for background animation
const FloatingFood = () => {
  const foods = ['🍕', '🍝', '🥪', '🧀', '🍅', '🌶️', '🥬', '🫒'];
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {foods.map((food, i) => (
        <motion.div
          key={i}
          className="absolute text-4xl opacity-20"
          initial={{
            x: Math.random() * window.innerWidth,
            y: window.innerHeight + 50,
          }}
          animate={{
            y: -100,
            x: Math.random() * window.innerWidth,
            rotate: Math.random() * 360,
          }}
          transition={{
            duration: 15 + Math.random() * 10,
            repeat: Infinity,
            delay: i * 2,
            ease: 'linear',
          }}
        >
          {food}
        </motion.div>
      ))}
    </div>
  );
};

// Payment step indicator
const PaymentSteps = ({ currentStep }: { currentStep: number }) => {
  const steps = [
    { icon: '📝', label: 'Bilgiler' },
    { icon: '💳', label: 'Kart' },
    { icon: '🔐', label: '3DS' },
    { icon: '✅', label: 'Tamam' },
  ];

  return (
    <div className="flex justify-center mb-8">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center">
          <motion.div
            className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${
              i <= currentStep
                ? 'bg-diner-red text-white shadow-lg'
                : 'bg-gray-200 text-gray-400'
            }`}
            animate={i === currentStep ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            {step.icon}
          </motion.div>
          {i < steps.length - 1 && (
            <div
              className={`w-8 h-1 mx-1 rounded ${
                i < currentStep ? 'bg-diner-red' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
};

// Credit card visual
const CreditCardVisual = ({
  cardNumber,
  cardHolder,
  expiry,
  brand,
  isFlipped,
}: {
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  brand: string;
  isFlipped: boolean;
}) => {
  return (
    <div className="perspective-1000 mb-6">
      <motion.div
        className="relative w-full max-w-sm mx-auto h-48"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front of card */}
        <div
          className={`absolute inset-0 rounded-2xl p-6 bg-gradient-to-br ${cardBrandColors[brand]} shadow-2xl backface-hidden`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="flex justify-between items-start mb-8">
            <motion.div
              className="w-12 h-10 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-md"
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <CardBrandIcon brand={brand} />
          </div>
          <div className="text-white text-xl tracking-widest font-mono mb-4">
            {cardNumber || '•••• •••• •••• ••••'}
          </div>
          <div className="flex justify-between text-white/80 text-sm">
            <div>
              <div className="text-xs opacity-60">Kart Sahibi</div>
              <div className="uppercase tracking-wider">
                {cardHolder || 'AD SOYAD'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs opacity-60">Son Kullanım</div>
              <div>{expiry || 'MM/YY'}</div>
            </div>
          </div>
        </div>

        {/* Back of card */}
        <div
          className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${cardBrandColors[brand]} shadow-2xl`}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="w-full h-12 bg-black/40 mt-6" />
          <div className="px-6 mt-4">
            <div className="flex items-center">
              <div className="flex-1 h-10 bg-white/20 rounded" />
              <div className="w-16 h-10 bg-white flex items-center justify-center ml-2 rounded text-gray-800 font-mono text-lg">
                •••
              </div>
            </div>
            <p className="text-white/60 text-xs mt-4 text-center">
              Bu kartın arkasındaki 3 haneli güvenlik kodu (CVV)
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Order summary component
const OrderSummary = ({ items, total }: { items: any[]; total: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 backdrop-blur rounded-2xl p-4 mb-6 shadow-lg"
    >
      <h3 className="font-display text-lg text-diner-chocolate mb-3 flex items-center gap-2">
        <span>🛒</span> Sipariş Özeti
      </h3>
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-diner-chocolate-light">
              {item.quantity}x {item.item.name}
            </span>
            <span className="font-medium">₺{item.item.price * item.quantity}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-diner-kraft/30 mt-3 pt-3 flex justify-between">
        <span className="font-display text-diner-chocolate">Toplam</span>
        <span className="font-display text-xl text-diner-red">₺{total}</span>
      </div>
    </motion.div>
  );
};

// Main Payment Component
export const Payment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  
  const { items, totalPrice, clearCart, tableSession, clearTableSession } = useCart();
  const { member, refreshMember } = useLoyalty();
  
  const [step, setStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  
  const cardBrand = getCardBrand(cardNumber);
  const popupRef = useRef<Window | null>(null);

  // Listen for 3DS callback
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === '3ds_result') {
        console.log('3DS Result:', event.data);
        
        if (event.data.status === 'success' && event.data.paymentId) {
          // Complete the payment
          await completePayment(event.data.paymentId, event.data.conversationId);
        } else {
          setError('3DS doğrulama başarısız. Lütfen tekrar deneyin.');
          setStep(1);
          setIsProcessing(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [orderId]);

  const completePayment = async (paymentId: string, conversationId: string) => {
    try {
      const response = await fetch('http://localhost:3000/api/payment/complete-3ds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, conversationId, orderId }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStep(3);
        setPaymentSuccess(true);
        clearCart();
        if (tableSession) {
          clearTableSession();
        }
        // Refresh member data to update points
        if (member) {
          setTimeout(() => {
            refreshMember();
          }, 1000); // Wait a bit for backend to process
        }
      } else {
        setError(data.error || 'Ödeme tamamlanamadı');
        setStep(1);
      }
    } catch (err) {
      setError('Ödeme tamamlanırken hata oluştu');
      setStep(1);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerEmail || !customerPhone) {
      setError('Lütfen tüm bilgileri doldurun');
      return;
    }
    setError(null);
    setStep(1);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cardNumber || !cardHolder || !expiry || !cvc) {
      setError('Lütfen tüm kart bilgilerini doldurun');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setStep(2);

    try {
      const [expMonth, expYear] = expiry.split('/');
      
      const response = await fetch('http://localhost:3000/api/payment/initialize-3ds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          cardHolderName: cardHolder,
          cardNumber: cardNumber.replace(/\s/g, ''),
          expireMonth: expMonth,
          expireYear: '20' + expYear,
          cvc,
          customerName,
          customerEmail,
          customerPhone,
          customerAddress,
          customerCity: 'Istanbul',
        }),
      });

      const data = await response.json();

      if (data.success && data.htmlContent) {
        // Decode base64 HTML content from iyzico
        let decodedHtml: string;
        try {
          decodedHtml = atob(data.htmlContent);
        } catch {
          // If not base64, use as is
          decodedHtml = data.htmlContent;
        }
        
        // Open 3DS popup
        const popup = window.open('', '3DS Doğrulama', 'width=500,height=600,left=200,top=100');
        if (popup) {
          popup.document.write(decodedHtml);
          popup.document.close();
          popupRef.current = popup;

          // Check if popup was closed without completing
          const checkClosed = setInterval(() => {
            if (popup.closed) {
              clearInterval(checkClosed);
              if (!paymentSuccess) {
                setError('3DS doğrulama iptal edildi');
                setStep(1);
                setIsProcessing(false);
              }
            }
          }, 500);
        } else {
          setError('Popup engelleyici aktif olabilir. Lütfen izin verin.');
          setStep(1);
          setIsProcessing(false);
        }
      } else {
        setError(data.error || 'Ödeme başlatılamadı');
        setStep(1);
        setIsProcessing(false);
      }
    } catch (err) {
      setError('Ödeme işlemi başlatılamadı');
      setStep(1);
      setIsProcessing(false);
    }
  };

  // Success screen
  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-diner-cream to-diner-cream-dark flex items-center justify-center p-4">
        <FloatingFood />
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl p-8 text-center max-w-md w-full shadow-2xl relative z-10"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: 3, duration: 0.5 }}
              className="text-5xl"
            >
              ✅
            </motion.span>
          </motion.div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h1 className="font-display text-3xl text-diner-chocolate mb-2">
              Ödeme Başarılı!
            </h1>
            <p className="text-diner-chocolate-light mb-6">
              Siparişiniz alındı ve ödemeniz onaylandı.
            </p>
            
            <motion.div
              className="flex justify-center gap-4 text-4xl mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {['🍕', '🍝', '🥪'].map((food, i) => (
                <motion.span
                  key={i}
                  animate={{
                    y: [0, -10, 0],
                    rotate: [0, 10, -10, 0],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 2,
                    delay: i * 0.2,
                  }}
                >
                  {food}
                </motion.span>
              ))}
            </motion.div>

            <p className="text-sm text-diner-chocolate-light mb-6">
              Siparişiniz en kısa sürede hazırlanacaktır.
              <br />
              Afiyet olsun! 🎉
            </p>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/menu')}
              className="btn-primary w-full"
            >
              Menüye Dön
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-diner-cream to-diner-cream-dark py-8 px-4 relative">
      <FloatingFood />
      
      <div className="max-w-lg mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-6"
        >
          <motion.img
            src="/logo.png"
            alt="High Five"
            className="w-20 h-20 mx-auto mb-2"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 4 }}
          />
          <h1 className="font-display text-2xl text-diner-chocolate">
            Güvenli Ödeme
          </h1>
          <p className="text-sm text-diner-chocolate-light">
            🔒 256-bit SSL ile korunan güvenli ödeme
          </p>
        </motion.div>

        {/* Steps */}
        <PaymentSteps currentStep={step} />

        {/* Order Summary */}
        <OrderSummary items={items} total={totalPrice} />

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-4 flex items-center gap-2"
            >
              <span>⚠️</span>
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 0: Customer Info */}
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.form
              key="customer-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleCustomerSubmit}
              className="bg-white rounded-2xl p-6 shadow-xl"
            >
              <h2 className="font-display text-xl text-diner-chocolate mb-4 flex items-center gap-2">
                <span>📝</span> Müşteri Bilgileri
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-diner-chocolate-light mb-1">
                    Ad Soyad *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="input-field"
                    placeholder="Örn: Ahmet Yılmaz"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-diner-chocolate-light mb-1">
                    E-posta *
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="input-field"
                    placeholder="ornek@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-diner-chocolate-light mb-1">
                    Telefon *
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="input-field"
                    placeholder="05XX XXX XX XX"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-diner-chocolate-light mb-1">
                    Adres (Opsiyonel)
                  </label>
                  <textarea
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="input-field resize-none"
                    rows={2}
                    placeholder="Fatura adresi"
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
              >
                <span>Devam Et</span>
                <span>→</span>
              </motion.button>
            </motion.form>
          )}

          {/* Step 1: Card Info */}
          {step === 1 && (
            <motion.form
              key="card-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handlePaymentSubmit}
              className="bg-white rounded-2xl p-6 shadow-xl"
            >
              <h2 className="font-display text-xl text-diner-chocolate mb-4 flex items-center gap-2">
                <span>💳</span> Kart Bilgileri
              </h2>

              {/* Credit Card Visual */}
              <CreditCardVisual
                cardNumber={cardNumber}
                cardHolder={cardHolder}
                expiry={expiry}
                brand={cardBrand}
                isFlipped={isCardFlipped}
              />

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-diner-chocolate-light mb-1">
                    Kart Numarası
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    className="input-field font-mono tracking-wider"
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-diner-chocolate-light mb-1">
                    Kart Üzerindeki İsim
                  </label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                    className="input-field uppercase"
                    placeholder="AD SOYAD"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-diner-chocolate-light mb-1">
                      Son Kullanım
                    </label>
                    <input
                      type="text"
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      className="input-field"
                      placeholder="MM/YY"
                      maxLength={5}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-diner-chocolate-light mb-1">
                      CVV
                    </label>
                    <input
                      type="text"
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))}
                      onFocus={() => setIsCardFlipped(true)}
                      onBlur={() => setIsCardFlipped(false)}
                      className="input-field"
                      placeholder="123"
                      maxLength={4}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep(0)}
                  className="btn-secondary flex-1"
                >
                  ← Geri
                </motion.button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isProcessing}
                  className="btn-primary flex-[2] flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        🍕
                      </motion.span>
                      İşleniyor...
                    </>
                  ) : (
                    <>
                      <span>🔐</span>
                      <span>Güvenli Öde - ₺{totalPrice}</span>
                    </>
                  )}
                </motion.button>
              </div>

              {/* Security badges */}
              <div className="flex items-center justify-center gap-4 mt-6 text-xs text-diner-chocolate-light">
                <span className="flex items-center gap-1">
                  <span>🔒</span> SSL
                </span>
                <span className="flex items-center gap-1">
                  <span>🛡️</span> 3D Secure
                </span>
                <span className="flex items-center gap-1">
                  <span>💳</span> iyzico
                </span>
              </div>
            </motion.form>
          )}

          {/* Step 2: 3DS Processing */}
          {step === 2 && (
            <motion.div
              key="3ds-processing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl p-8 shadow-xl text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="text-6xl mb-4"
              >
                🔐
              </motion.div>
              <h2 className="font-display text-2xl text-diner-chocolate mb-2">
                3D Secure Doğrulama
              </h2>
              <p className="text-diner-chocolate-light mb-4">
                Bankanızın güvenlik doğrulaması için popup pencereyi kontrol edin.
              </p>
              <motion.div
                className="flex justify-center gap-2"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-3 h-3 bg-diner-red rounded-full"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Back to order button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => navigate('/order')}
          className="w-full text-center text-diner-chocolate-light hover:text-diner-red mt-4 text-sm"
        >
          ← Siparişe Geri Dön
        </motion.button>
      </div>
    </div>
  );
};

