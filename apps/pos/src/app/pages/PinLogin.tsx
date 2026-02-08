import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Delete, ArrowLeft } from 'lucide-react';

export default function PinLogin() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { pinLogin } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (pin.length === 4) {
      handleSubmit();
    }
  }, [pin]);

  const handleSubmit = async () => {
    if (pin.length !== 4) return;
    
    setError('');
    setIsLoading(true);

    try {
      await pinLogin(pin);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş başarısız');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (num: string) => {
    if (pin.length < 4 && !isLoading) {
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
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#C41E3A]/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#F4A300]/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* Login Card */}
      <div className="w-full max-w-sm relative z-10 animate-bounce-in">
        {/* Back button */}
        <Link 
          to="/login"
          className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">E-posta ile Giriş</span>
        </Link>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#C41E3A] to-[#9B1730] p-6 relative">
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `repeating-conic-gradient(#FFF 0% 25%, transparent 0% 50%)`,
                backgroundSize: '16px 16px'
              }}
            />
            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-3">
                <span className="text-3xl">🔐</span>
              </div>
              <h1 className="font-display text-3xl text-white tracking-wider">
                PIN GİRİŞİ
              </h1>
              <p className="text-white/70 text-sm mt-1">4 haneli PIN kodunuzu girin</p>
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

            {/* PIN display */}
            <div className="flex justify-center gap-4 mb-6">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    pin.length > i
                      ? 'bg-gradient-to-br from-[#C41E3A] to-[#9B1730] shadow-lg scale-110'
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
                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                setPin(value);
              }}
              className="sr-only"
              maxLength={4}
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
                  <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-[#C41E3A] border-t-transparent animate-spin"></div>
                </div>
                <p className="text-gray-500 font-medium">Giriş yapılıyor...</p>
              </div>
            )}
          </div>
        </div>

        {/* Demo PIN */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/80 text-sm">
            <span className="font-semibold">Demo PIN:</span>
            <code className="bg-white/20 px-3 py-1 rounded-lg font-mono tracking-wider">1234</code>
          </div>
        </div>

        {/* Quick access buttons */}
        <div className="mt-4 flex justify-center gap-3">
          {['1111', '2222', '3333'].map((quickPin) => (
            <button
              key={quickPin}
              onClick={() => setPin(quickPin)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg text-white/70 hover:text-white text-sm font-medium transition-colors"
            >
              {quickPin}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
