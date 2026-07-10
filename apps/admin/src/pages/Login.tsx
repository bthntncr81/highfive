import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, LogIn, ShieldCheck } from 'lucide-react';
import { api, setToken } from '../lib/api';
import { OtOrderMark } from '../components/OtOrderMark';

// Super-admin login: allowlisted e-mail + password → Bearer token.
export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await api.login(email, password);
      setToken(r.token);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center">
          <OtOrderMark size={44} />
          <p className="wordmark-ot mt-3">
            OtOrder<b>.</b>
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
            <ShieldCheck size={15} /> Platform yönetim paneli
          </p>
        </div>

        <form onSubmit={submit} className="card mt-8 space-y-4 p-6">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-soft">E-posta</span>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-soft">Şifre</span>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Giriş yapılıyor…
              </>
            ) : (
              <>
                <LogIn size={18} /> Giriş yap
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-ink-muted">Yalnızca yetkili OtOrder operatörleri girebilir.</p>
      </div>
    </div>
  );
}
