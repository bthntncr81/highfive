import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  LifeBuoy,
  Plus,
  X,
  Send,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Lock,
  User,
  Headset,
} from 'lucide-react';

// ============================================================================
// Destek — restoran personeli platform operatörüne (OtOrder) talep/şikayet/
// teknik sorun bildirir, yanıtları görür ve yanıt yazar.
// Backend: apps/api/src/routes/support.ts
// ============================================================================

interface TicketReply {
  id: string;
  fromAdmin: boolean;
  authorName: string | null;
  message: string;
  createdAt: string;
}

type TicketType = 'REQUEST' | 'COMPLAINT' | 'ISSUE';
type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH';

interface Ticket {
  id: string;
  type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  subject: string;
  message: string;
  openedByName: string | null;
  createdAt: string;
  replies: TicketReply[];
}

const TYPE_OPTIONS: { value: TicketType; label: string }[] = [
  { value: 'REQUEST', label: 'Talep' },
  { value: 'COMPLAINT', label: 'Şikayet' },
  { value: 'ISSUE', label: 'Teknik Sorun' },
];

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: 'LOW', label: 'Düşük' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'Yüksek' },
];

const STATUS_INFO: Record<TicketStatus, { label: string; color: string }> = {
  OPEN: { label: 'Açık', color: 'bg-blue-100 text-blue-800' },
  IN_PROGRESS: { label: 'İşlemde', color: 'bg-amber-100 text-amber-800' },
  RESOLVED: { label: 'Çözüldü', color: 'bg-green-100 text-green-800' },
  CLOSED: { label: 'Kapalı', color: 'bg-gray-100 text-gray-600' },
};

const TYPE_INFO: Record<TicketType, { label: string; color: string }> = {
  REQUEST: { label: 'Talep', color: 'bg-primary-50 text-primary-700' },
  COMPLAINT: { label: 'Şikayet', color: 'bg-red-50 text-red-700' },
  ISSUE: { label: 'Teknik Sorun', color: 'bg-orange-50 text-orange-700' },
};

const PRIORITY_INFO: Record<TicketPriority, { label: string; color: string }> = {
  LOW: { label: 'Düşük', color: 'bg-gray-100 text-gray-600' },
  NORMAL: { label: 'Normal', color: 'bg-gray-100 text-gray-700' },
  HIGH: { label: 'Yüksek', color: 'bg-red-100 text-red-700' },
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const EMPTY_FORM = {
  type: 'REQUEST' as TicketType,
  priority: 'NORMAL' as TicketPriority,
  subject: '',
  message: '',
};

export default function Support() {
  const { token } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Yeni talep modalı
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Yanıt yazma (ticket id → taslak / hata)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyErrors, setReplyErrors] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      const response = await api.get('/api/support/tickets', token!);
      setTickets(response.tickets || []);
    } catch (error) {
      console.error('Support tickets fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Başarı bildirimi — birkaç saniye sonra kendiliğinden kaybolur
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(''), 4000);
    return () => clearTimeout(t);
  }, [successMsg]);

  const openNewTicketModal = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!form.subject.trim() || !form.message.trim()) {
      setFormError('Konu ve mesaj zorunlu');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(
        '/api/support/tickets',
        {
          type: form.type,
          priority: form.priority,
          subject: form.subject.trim(),
          message: form.message.trim(),
        },
        token!
      );
      setShowModal(false);
      setForm(EMPTY_FORM);
      setSuccessMsg('Talebiniz oluşturuldu — en kısa sürede yanıtlanacak.');
      await fetchTickets();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Talep oluşturulamadı');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (ticketId: string) => {
    const draft = (replyDrafts[ticketId] || '').trim();
    if (!draft) return;

    setReplyingId(ticketId);
    setReplyErrors((prev) => ({ ...prev, [ticketId]: '' }));
    try {
      await api.post(`/api/support/tickets/${ticketId}/reply`, { message: draft }, token!);
      setReplyDrafts((prev) => ({ ...prev, [ticketId]: '' }));
      setSuccessMsg('Yanıtınız gönderildi.');
      await fetchTickets();
    } catch (error) {
      setReplyErrors((prev) => ({
        ...prev,
        [ticketId]: error instanceof Error ? error.message : 'Yanıt gönderilemedi',
      }));
    } finally {
      setReplyingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Destek</h1>
          <p className="text-gray-500">
            {tickets.length > 0
              ? `${tickets.length} talep · OtOrder Destek ekibine ulaşın`
              : 'OtOrder Destek ekibine ulaşın'}
          </p>
        </div>
        <button onClick={openNewTicketModal} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Yeni Talep
        </button>
      </div>

      {/* Başarı bildirimi */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Boş durum */}
      {tickets.length === 0 ? (
        <div className="card text-center py-16 px-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary-50 rounded-2xl flex items-center justify-center">
            <LifeBuoy className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Henüz talebiniz yok</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Bir sorun mu yaşıyorsunuz ya da bir isteğiniz mi var? Bize yazın, OtOrder Destek ekibi
            en kısa sürede yanıtlasın.
          </p>
          <button
            onClick={openNewTicketModal}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Yeni Talep Oluştur
          </button>
        </div>
      ) : (
        /* Talep listesi */
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const status = STATUS_INFO[ticket.status] || STATUS_INFO.OPEN;
            const type = TYPE_INFO[ticket.type] || TYPE_INFO.REQUEST;
            const priority = PRIORITY_INFO[ticket.priority] || PRIORITY_INFO.NORMAL;
            const isExpanded = expandedId === ticket.id;
            const isClosed = ticket.status === 'CLOSED';

            return (
              <div key={ticket.id} className="card overflow-hidden !p-0">
                {/* Satır başlığı — tıkla → genişlet */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`badge ${status.color}`}>{status.label}</span>
                      <span className={`badge ${type.color}`}>{type.label}</span>
                      {ticket.priority === 'HIGH' && (
                        <span className={`badge ${priority.color}`}>Yüksek öncelik</span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900 truncate">{ticket.subject}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {ticket.openedByName || 'Personel'} · {formatDate(ticket.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <MessageSquare className="w-4 h-4" />
                      {ticket.replies.length}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Genişleyen detay — orijinal mesaj + yanıt zinciri + yanıt kutusu */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 space-y-3 bg-gray-50/50">
                    {/* Orijinal mesaj */}
                    <div className="p-3 bg-white border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-1.5 text-xs text-gray-500">
                        <User className="w-3.5 h-3.5" />
                        <span className="font-medium text-gray-700">
                          {ticket.openedByName || 'Personel'}
                        </span>
                        <span>· {formatDate(ticket.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{ticket.message}</p>
                    </div>

                    {/* Yanıt zinciri */}
                    {ticket.replies.map((reply) => (
                      <div
                        key={reply.id}
                        className={`p-3 rounded-lg border ${
                          reply.fromAdmin
                            ? 'bg-primary-50 border-primary-200 border-l-4 border-l-primary-600'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5 text-xs text-gray-500">
                          {reply.fromAdmin ? (
                            <>
                              <Headset className="w-3.5 h-3.5 text-primary-600" />
                              <span className="px-1.5 py-0.5 bg-primary-600 text-white rounded font-semibold">
                                OtOrder Destek
                              </span>
                              {reply.authorName && (
                                <span className="font-medium text-gray-700">{reply.authorName}</span>
                              )}
                            </>
                          ) : (
                            <>
                              <User className="w-3.5 h-3.5" />
                              <span className="font-medium text-gray-700">
                                {reply.authorName || 'Personel'}
                              </span>
                            </>
                          )}
                          <span>· {formatDate(reply.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{reply.message}</p>
                      </div>
                    ))}

                    {/* Yanıt yazma — kapalı talepte gizli */}
                    {isClosed ? (
                      <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg text-sm text-gray-500">
                        <Lock className="w-4 h-4 shrink-0" />
                        Bu talep kapatıldı. Yeni bir konu için yeni talep açabilirsiniz.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {replyErrors[ticket.id] && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {replyErrors[ticket.id]}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={replyDrafts[ticket.id] || ''}
                            onChange={(e) =>
                              setReplyDrafts((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleReply(ticket.id);
                              }
                            }}
                            className="input flex-1"
                            placeholder="Yanıt yazın..."
                          />
                          <button
                            type="button"
                            onClick={() => handleReply(ticket.id)}
                            disabled={replyingId === ticket.id || !(replyDrafts[ticket.id] || '').trim()}
                            className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
                          >
                            <Send className="w-4 h-4" />
                            {replyingId === ticket.id ? 'Gönderiliyor...' : 'Gönder'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Yeni talep modalı */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Yeni Destek Talebi</h2>
              <button onClick={() => setShowModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {formError}
                </div>
              )}

              {/* Tip — segment butonlar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tip</label>
                <div className="grid grid-cols-3 gap-2">
                  {TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, type: opt.value })}
                      className={`p-3 rounded-lg border-2 text-sm font-medium text-center transition-colors ${
                        form.type === opt.value
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Öncelik — segment butonlar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Öncelik</label>
                <div className="grid grid-cols-3 gap-2">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, priority: opt.value })}
                      className={`p-3 rounded-lg border-2 text-sm font-medium text-center transition-colors ${
                        form.priority === opt.value
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Konu */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Konu</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value.slice(0, 200) })}
                  className="input"
                  maxLength={200}
                  placeholder="Kısaca özetleyin"
                  required
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{form.subject.length}/200</p>
              </div>

              {/* Mesaj */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mesaj</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="input min-h-[120px] resize-y"
                  placeholder="Sorununuzu ya da isteğinizi detaylı anlatın"
                  required
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  İptal
                </button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary flex-1">
                  {isSubmitting ? 'Gönderiliyor...' : 'Gönder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
