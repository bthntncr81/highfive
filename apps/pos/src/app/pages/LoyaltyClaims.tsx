// Loyalty Claim onay sayfası — Google review / Instagram story gibi screenshot
// doğrulamalı ödül taleplerini admin inceler. Onay → puan müşteriye yatar.

import { useCallback, useEffect, useState } from 'react';
import { Check, X, Clock, RefreshCw, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000';

type Claim = {
  id: string;
  customerId: string;
  programId: string;
  proofImageUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rewardPoints: number;
  adminNote: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  customer: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
  };
  program: {
    id: string;
    name: string;
    type: string;
  };
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Bekliyor',
  APPROVED: 'Onaylandı',
  REJECTED: 'Reddedildi',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  APPROVED: 'bg-green-100 text-green-800 border-green-300',
  REJECTED: 'bg-red-100 text-red-800 border-red-300',
};

export default function LoyaltyClaims() {
  const { token } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>(
    'PENDING',
  );
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const q = filter === 'ALL' ? '' : `?status=${filter}`;
      const res = await api.get(`/api/loyalty/claims${q}`, token);
      setClaims((res?.claims as Claim[]) || []);
    } catch {
      setClaims([]);
    } finally {
      setLoading(false);
    }
  }, [filter, token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (claim: Claim) => {
    if (
      !confirm(
        `${claim.customer.name || 'Müşteri'}'ye ${claim.rewardPoints} puan verilecek. Onaylıyor musun?`,
      )
    )
      return;
    setActing(claim.id);
    try {
      await api.post(`/api/loyalty/claims/${claim.id}/approve`, {}, token!);
      await load();
    } catch (e: any) {
      alert(e?.message || 'Onay başarısız');
    } finally {
      setActing(null);
    }
  };

  const handleReject = async (claim: Claim) => {
    const reason = prompt('Red sebebi (opsiyonel, müşteriye görünür):') ?? '';
    if (reason === null) return;
    setActing(claim.id);
    try {
      await api.post(
        `/api/loyalty/claims/${claim.id}/reject`,
        { reason },
        token!,
      );
      await load();
    } catch (e: any) {
      alert(e?.message || 'Red başarısız');
    } finally {
      setActing(null);
    }
  };

  const pendingCount = claims.filter((c) => c.status === 'PENDING').length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">⭐ Yorum Onayları</h1>
          <p className="text-sm text-gray-500 mt-1">
            Google review / Instagram story screenshot doğrulamalı ödül talepleri.
            Onaylanınca müşteriye otomatik puan yatar.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Yenile
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 font-medium text-sm transition border-b-2 -mb-px ${
              filter === s
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {s === 'ALL' ? 'Hepsi' : STATUS_LABEL[s]}
            {s === 'PENDING' && pendingCount > 0 && filter !== 'PENDING' ? (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-[10px] rounded-full font-bold">
                {pendingCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Yükleniyor...</div>
      ) : claims.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {filter === 'PENDING'
              ? 'Bekleyen talep yok 🎉'
              : 'Bu kategoride talep yok'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {claims.map((c) => {
            const isPending = c.status === 'PENDING';
            const isProcessing = acting === c.id;
            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-gray-200 p-4 flex gap-4"
              >
                {/* Screenshot thumbnail */}
                <button
                  onClick={() => setPreview(`${API_URL}${c.proofImageUrl}`)}
                  className="flex-shrink-0 w-32 h-32 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 hover:opacity-80"
                  title="Tam boyutu için tıkla"
                >
                  <img
                    src={`${API_URL}${c.proofImageUrl}`}
                    alt="Yorum screenshot"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900">
                          {c.customer.name || 'İsimsiz müşteri'}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${STATUS_COLOR[c.status]}`}
                        >
                          {STATUS_LABEL[c.status]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {c.customer.phone || '—'} ·{' '}
                        {c.customer.email || 'e-posta yok'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {c.program.name} ({c.program.type})
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-extrabold text-emerald-600">
                        +{c.rewardPoints}
                      </div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wide">
                        puan
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
                    Gönderim:{' '}
                    {new Date(c.createdAt).toLocaleString('tr-TR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>

                  {c.adminNote ? (
                    <div className="mt-2 text-xs text-red-700 bg-red-50 px-2 py-1.5 rounded">
                      Red sebebi: {c.adminNote}
                    </div>
                  ) : null}

                  {c.reviewedAt ? (
                    <div className="mt-2 text-xs text-gray-500">
                      İşlem:{' '}
                      {new Date(c.reviewedAt).toLocaleString('tr-TR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  ) : null}

                  {/* Action buttons */}
                  {isPending ? (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleApprove(c)}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        {isProcessing ? 'İşleniyor...' : 'Onayla & puan ver'}
                      </button>
                      <button
                        onClick={() => handleReject(c)}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg font-semibold text-sm hover:bg-red-50 disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                        Reddet
                      </button>
                      <a
                        href={`${API_URL}${c.proofImageUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 text-gray-600 hover:text-gray-900 text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Tam boyut
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image preview modal */}
      {preview ? (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6"
          onClick={() => setPreview(null)}
        >
          <img
            src={preview}
            alt="Yorum screenshot"
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setPreview(null)}
            className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
