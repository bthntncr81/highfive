import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Delete, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { api } from '../lib/api';

// Hızlı-giriş PIN'i belirleme/değiştirme. E-postayla ilk girişten sonra açılır
// (?ilk=1); kullanıcı kolay bir 6 haneli PIN seçer, sonrasında PIN ya da
// e-posta+şifre — hangisini isterse onunla girer. Atlanabilir.
export default function SetPin() {
  const [params] = useSearchParams();
  const firstTime = params.get('ilk') === '1';
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const { brandName, brandLogo } = useTheme();
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (pin.length !== 6 || saving) return;
    if (step === 'enter') {
      setFirstPin(pin);
      setPin('');
      setStep('confirm');
      return;
    }
    // confirm
    if (pin !== firstPin) {
      setError('PIN\'ler eşleşmedi — baştan dene');
      setPin('');
      setFirstPin('');
      setStep('enter');
      return;
    }
    (async () => {
      setSaving(true);
      setError('');
      try {
        await api.post('/api/auth/set-pin', { pin }, token || undefined);
        setDone(true);
        setTimeout(() => navigate('/'), 1600);
      } catch (err: any) {
        setError(err instanceof Error ? err.message : 'PIN kaydedilemedi');
        setPin('');
        setFirstPin('');
        setStep('enter');
      } finally {
        setSaving(false);
      }
    })();
  }, [pin, step, firstPin, saving, token, navigate]);

  const handleKeyPress = (num: string) => {
    if (pin.length < 6 && !saving && !done) {
      setPin(pin + num);
      setError('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#5D4037] via-[#3E2723] to-[#1A1A1A]" />

      <div className="w-full max-w-sm relative z-10 animate-bounce-in">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-primary-500 to-primary-700 p-6 relative">
            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-3 overflow-hidden">
                {brandLogo ? (
                  <img src={brandLogo} alt={brandName || 'Logo'} className="w-12 h-12 object-contain" />
                ) : (
                  <span className="text-3xl">🔢</span>
                )}
              </div>
              <h1 className="font-display text-2xl text-white tracking-wide">
                {firstTime ? 'Hızlı Giriş PIN\'i Belirle' : 'PIN Değiştir'}
              </h1>
              <p className="text-white/70 text-sm mt-1">
                {step === 'enter' ? 'Kolay hatırlayacağın 6 haneli bir PIN seç' : 'Aynı PIN\'i bir kez daha gir'}
              </p>
            </div>
          </div>

          <div className="p-6">
            {done ? (
              <div className="py-8 flex flex-col items-center gap-3 text-center">
                <CheckCircle2 className="w-14 h-14 text-green-500" />
                <p className="font-semibold text-gray-800">PIN kaydedildi!</p>
                <p className="text-sm text-gray-500">Artık girişte PIN'ini ya da e-posta+şifreni kullanabilirsin.</p>
              </div>
            ) : (
              <>
                {firstTime && step === 'enter' && !error && (
                  <div className="mb-5 p-3 bg-blue-50 border-2 border-blue-100 rounded-xl text-blue-800 text-sm font-medium">
                    Bundan sonra POS'a bu 6 haneli PIN ile saniyeler içinde girebilirsin. İstersen şimdilik atla.
                  </div>
                )}
                {error && (
                  <div className="mb-5 p-3 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-3 text-red-700 animate-shake">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium text-sm">{error}</span>
                  </div>
                )}

                <div className="flex justify-center gap-2 mb-6">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                        pin.length > i
                          ? 'bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg scale-110'
                          : 'bg-gray-100 border-2 border-gray-200'
                      }`}
                    >
                      {pin.length > i && <div className="w-3 h-3 bg-white rounded-full" />}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => (
                    <button
                      key={key}
                      onClick={() => {
                        if (key === '⌫') setPin(pin.slice(0, -1));
                        else if (key === 'C') { setPin(''); setError(''); }
                        else handleKeyPress(key);
                      }}
                      disabled={saving}
                      className={`pin-button ${key === '⌫' ? 'delete' : key === 'C' ? 'clear' : ''}`}
                    >
                      {key === '⌫' ? <Delete className="w-6 h-6" /> : key === 'C' ? <span className="text-lg">Sil</span> : key}
                    </button>
                  ))}
                </div>

                {saving && <p className="mt-4 text-center text-sm text-gray-500 font-medium">Kaydediliyor...</p>}

                <div className="mt-6 border-t border-gray-100 pt-4 text-center">
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    {firstTime ? 'Şimdilik atla — panele geç →' : 'Vazgeç'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
