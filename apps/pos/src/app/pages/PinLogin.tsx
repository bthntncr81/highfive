import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Delete } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function PinLogin() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { brandName, brandLogo } = useTheme();

  const { pinLogin } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (pin.length === 6) {
      handleSubmit();
    }
  }, [pin]);

  const handleSubmit = async () => {
    if (pin.length !== 6) return;
    
    setError('');
    setIsLoading(true);

    try {
      await pinLogin(pin);
      navigate('/');
    } catch (err: any) {
      // Hesap askıda: PIN girişi kilitli — sahibi e-posta girişinden ödeyebilir.
      if (err?.status === 402) {
        setError('Hesap askıda. İşletme sahibi e-posta girişiyle ödeme yapabilir.');
        navigate('/login-email?suspended=1');
        return;
      }
      setError(err instanceof Error ? err.message : 'Giriş başarısız');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (num: string) => {
    if (pin.length < 6 && !isLoading) {
      setPin(pin + num);
      setError('');
    }
  };

  const handleDelete = () => {
    if (!isLoading) {
      setPin(pin.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (!isLoading) {
      setPin('');
      setError('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#5D4037] via-[#3E2723] to-[#1A1A1A]">
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
        
        {/* Floating circles */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#005387]/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* Login Card */}
      <div className="w-full max-w-sm relative z-10 animate-bounce-in">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header — marka rengi (primary CSS-var) + tenant logo/adı */}
          <div className="bg-gradient-to-r from-primary-500 to-primary-700 p-6 relative">
            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-3 overflow-hidden">
                {brandLogo ? (
                  <img src={brandLogo} alt={brandName || 'Logo'} className="w-12 h-12 object-contain" />
                ) : (
                  <span className="text-3xl">🔐</span>
                )}
              </div>
              <h1 className="font-display text-3xl text-white tracking-wider">
                {brandName || 'GİRİŞ'}
              </h1>
              <p className="text-white/70 text-sm mt-1">6 haneli PIN'inizi girin</p>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Error message */}
            {error && (
              <div className="mb-5 p-3 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-3 text-red-700 animate-shake">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm">{error}</span>
              </div>
            )}

            {/* PIN display — 6 hane */}
            <div className="flex justify-center gap-2 mb-6">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    pin.length > i
                      ? 'bg-gradient-to-br from-[#bb1e10] to-[#8a1610] shadow-lg scale-110'
                      : 'bg-gray-100 border-2 border-gray-200'
                  }`}
                >
                  <div className={`pin-dot ${pin.length > i ? 'filled' : ''}`}>
                    {pin.length > i && (
                      <div className="w-3 h-3 bg-white rounded-full" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Hidden input for keyboard */}
            <input
              ref={inputRef}
              type="tel"
              value={pin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setPin(value);
              }}
              className="sr-only"
              maxLength={6}
              disabled={isLoading}
            />

            {/* Number pad */}
            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    if (key === '⌫') handleDelete();
                    else if (key === 'C') handleClear();
                    else handleKeyPress(key);
                  }}
                  disabled={isLoading}
                  className={`pin-button ${
                    key === '⌫' ? 'delete' : key === 'C' ? 'clear' : ''
                  }`}
                >
                  {key === '⌫' ? (
                    <Delete className="w-6 h-6" />
                  ) : key === 'C' ? (
                    <span className="text-lg">Sil</span>
                  ) : (
                    key
                  )}
                </button>
              ))}
            </div>

            {/* Loading indicator */}
            {isLoading && (
              <div className="mt-6 flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-4 border-gray-200"></div>
                  <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-[#bb1e10] border-t-transparent animate-spin"></div>
                </div>
                <p className="text-gray-500 font-medium">Giriş yapılıyor...</p>
              </div>
            )}

            {/* İlk giriş / PIN'i olmayanlar: e-posta+şifre girişi */}
            <div className="mt-6 border-t border-gray-100 pt-4 text-center">
              <Link to="/login-email" className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors">
                PIN'in yok mu? E-posta ve şifreyle giriş yap →
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
