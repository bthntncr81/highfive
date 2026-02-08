import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Sparkles, Pizza } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş başarısız');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#C41E3A] via-[#9B1730] to-[#5D4037]">
        {/* Checkered pattern overlay */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `repeating-conic-gradient(#FFF 0% 25%, transparent 0% 50%)`,
            backgroundSize: '40px 40px'
          }}
        />
        
        {/* Floating food icons */}
        <div className="absolute top-20 left-20 text-white/10 animate-float">
          <Pizza className="w-24 h-24" />
        </div>
        <div className="absolute top-40 right-32 text-white/10 animate-float" style={{ animationDelay: '1s' }}>
          <svg className="w-20 h-20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        </div>
        <div className="absolute bottom-32 left-40 text-white/10 animate-float" style={{ animationDelay: '2s' }}>
          <Sparkles className="w-16 h-16" />
        </div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md relative z-10 animate-bounce-in">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header with pattern */}
          <div className="bg-gradient-to-r from-[#F4A300] to-[#CC8800] p-6 relative">
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `repeating-conic-gradient(#FFF 0% 25%, transparent 0% 50%)`,
                backgroundSize: '20px 20px'
              }}
            />
            <div className="relative text-center">
              {/* Logo */}
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-4">
                <span className="text-4xl">🖐️</span>
              </div>
              <h1 className="font-display text-4xl text-white tracking-wider drop-shadow-lg">
                HIGH FIVE
              </h1>
              <p className="text-white/80 font-medium mt-1">POS SİSTEMİ</p>
            </div>
          </div>

          {/* Form */}
          <div className="p-8">
            {/* Error message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-3 text-red-700 animate-shake">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  E-posta Adresi
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-12"
                    placeholder="ornek@highfive.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Şifre
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-12 pr-12"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary w-full py-4 text-lg mt-6"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Giriş yapılıyor...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    🚀 Giriş Yap
                  </span>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-sm text-gray-400 font-medium">veya</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            {/* PIN login link */}
            <Link
              to="/pin"
              className="btn btn-secondary w-full py-4 text-lg flex items-center justify-center gap-2"
            >
              <span className="text-2xl">🔢</span>
              PIN ile Hızlı Giriş
            </Link>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white/90 text-sm">
            <span className="font-semibold">Demo:</span>
            <code className="bg-white/20 px-2 py-0.5 rounded">admin@highfive.com</code>
            <span>/</span>
            <code className="bg-white/20 px-2 py-0.5 rounded">admin123</code>
          </div>
        </div>
      </div>
    </div>
  );
}
