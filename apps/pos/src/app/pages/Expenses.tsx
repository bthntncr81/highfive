// Giderler — finansal takip sayfası.
// ADMIN/MANAGER: full CRUD + approve. CASHIER: list/create + edit/delete own only.
// Sabit (isSystem) + custom kategoriler. Auto-approve threshold > 10k ₺ admin onayı bekler.

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  Wallet,
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Receipt,
  Image as ImageIcon,
  Download,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  PiggyBank,
  Tag,
  FolderCog,
} from 'lucide-react';
import ExpenseCategoriesModal from '../components/ExpenseCategoriesModal';

interface ExpenseCategory {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  isSystem: boolean;
  sortOrder: number;
  active: boolean;
}

interface ExpenseUser {
  id: string;
  name: string;
  role: string;
}

interface Expense {
  id: string;
  amount: number;
  categoryId: string;
  description: string | null;
  expenseDate: string;
  vendor: string | null;
  paymentMethod: 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'ONLINE' | 'MULTINET' | 'SODEXO' | 'TICKET' | 'TAB' | 'DIGITAL_COIN' | 'OTHER';
  receiptUrl: string | null;
  notes: string | null;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  createdById: string;
  approvedById: string | null;
  approvedAt: string | null;
  createdAt: string;
  category: ExpenseCategory;
  createdBy: ExpenseUser;
  approvedBy: { id: string; name: string } | null;
}

interface Stats {
  monthTotal: number;
  weekTotal: number;
  pendingCount: number;
  topCategories: { categoryId: string; name: string; amount: number; icon?: string | null; color?: string | null }[];
}

const PAYMENT_OPTIONS = [
  { value: 'CASH', label: 'Nakit' },
  { value: 'CREDIT_CARD', label: 'Kredi Kartı' },
  { value: 'ONLINE', label: 'Banka / Online' },
  { value: 'OTHER', label: 'Diğer' },
];

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  APPROVED: { label: 'Onaylandı', color: '#059669', bg: '#d1fae5' },
  PENDING_APPROVAL: { label: 'Onay Bekliyor', color: '#b45309', bg: '#fef3c7' },
  REJECTED: { label: 'Reddedildi', color: '#b91c1c', bg: '#fee2e2' },
};

const todayISO = () => new Date().toISOString().split('T')[0];

export default function Expenses() {
  const { user, token } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    categoryId: '',
    paymentMethod: '',
    status: '',
    search: '',
    sortBy: 'expenseDate' as 'expenseDate' | 'amount',
    sortOrder: 'desc' as 'asc' | 'desc',
  });

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showReceiptUrl, setShowReceiptUrl] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Inline new category (admin only, modal içinde)
  const [showInlineNewCategory, setShowInlineNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [formData, setFormData] = useState({
    amount: '',
    categoryId: '',
    expenseDate: todayISO(),
    vendor: '',
    paymentMethod: 'CASH',
    description: '',
    notes: '',
    receiptUrl: '',
  });

  useEffect(() => {
    if (!token) return;
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filters]);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filters.dateFrom) qs.set('startDate', filters.dateFrom);
      if (filters.dateTo) qs.set('endDate', filters.dateTo);
      if (filters.categoryId) qs.set('categoryId', filters.categoryId);
      if (filters.paymentMethod) qs.set('paymentMethod', filters.paymentMethod);
      if (filters.status) qs.set('status', filters.status);
      if (filters.search.trim()) qs.set('search', filters.search.trim());
      qs.set('sortBy', filters.sortBy);
      qs.set('sortOrder', filters.sortOrder);

      const [expRes, catRes, statsRes] = await Promise.all([
        api.get(`/api/expenses?${qs.toString()}`, token!),
        api.get('/api/expense-categories', token!),
        api.get('/api/expenses/stats', token!).catch(() => null),
      ]);
      setExpenses(expRes.expenses || []);
      setCategories(catRes.categories || []);
      if (statsRes) setStats(statsRes);
    } catch (error) {
      console.error('Expenses fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreate = () => {
    setEditingExpense(null);
    setFormData({
      amount: '',
      categoryId: categories[0]?.id ?? '',
      expenseDate: todayISO(),
      vendor: '',
      paymentMethod: 'CASH',
      description: '',
      notes: '',
      receiptUrl: '',
    });
    setShowInlineNewCategory(false);
    setNewCategoryName('');
    setShowModal(true);
  };

  const openEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setFormData({
      amount: String(exp.amount),
      categoryId: exp.categoryId,
      expenseDate: exp.expenseDate.split('T')[0],
      vendor: exp.vendor ?? '',
      paymentMethod: exp.paymentMethod,
      description: exp.description ?? '',
      notes: exp.notes ?? '',
      receiptUrl: exp.receiptUrl ?? '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      alert('Lütfen geçerli bir tutar girin');
      return;
    }
    if (!formData.categoryId) {
      alert('Kategori seçin');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        amount: Number(formData.amount),
        categoryId: formData.categoryId,
        expenseDate: formData.expenseDate,
        vendor: formData.vendor || undefined,
        paymentMethod: formData.paymentMethod,
        description: formData.description || undefined,
        notes: formData.notes || undefined,
        receiptUrl: formData.receiptUrl || undefined,
      };

      if (editingExpense) {
        await api.put(`/api/expenses/${editingExpense.id}`, payload, token!);
      } else {
        await api.post('/api/expenses', payload, token!);
      }

      setShowModal(false);
      await fetchAll();
    } catch (error: any) {
      alert(error?.message || 'Bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (exp: Expense) => {
    if (!confirm(`"${exp.category.name} - ${Number(exp.amount).toFixed(2)} ₺" giderini silmek istediğinizden emin misiniz?`)) return;
    try {
      await api.delete(`/api/expenses/${exp.id}`, token!);
      await fetchAll();
    } catch (error: any) {
      alert(error?.message || 'Silme hatası');
    }
  };

  const handleApprove = async (exp: Expense) => {
    try {
      await api.patch(`/api/expenses/${exp.id}/approve`, {}, token!);
      await fetchAll();
    } catch (error: any) {
      alert(error?.message || 'Onaylama hatası');
    }
  };

  const handleReject = async (exp: Expense) => {
    if (!confirm('Bu gideri reddetmek istediğinizden emin misiniz?')) return;
    try {
      await api.patch(`/api/expenses/${exp.id}/reject`, {}, token!);
      await fetchAll();
    } catch (error: any) {
      alert(error?.message || 'Reddetme hatası');
    }
  };

  const handleReceiptUpload = async (file: File) => {
    setUploadingReceipt(true);
    try {
      const res = await api.upload('/api/upload', file, token!);
      const url = res.url || res.path || res.imageUrl;
      if (!url) throw new Error('Upload başarısız');
      setFormData((f) => ({ ...f, receiptUrl: url }));
    } catch (error: any) {
      alert(error?.message || 'Fiş yükleme hatası');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleInlineNewCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      const res = await api.post('/api/expense-categories', { name, sortOrder: 50 }, token!);
      setCategories((cs) => [...cs, res.category]);
      setFormData((f) => ({ ...f, categoryId: res.category.id }));
      setNewCategoryName('');
      setShowInlineNewCategory(false);
    } catch (error: any) {
      alert(error?.message || 'Kategori eklenemedi');
    }
  };

  const canEdit = (exp: Expense): boolean => {
    if (isAdmin) return true;
    if (user?.role === 'CASHIER' && exp.createdById === user.id) return true;
    return false;
  };

  const exportCSV = () => {
    const rows: (string | number)[][] = [
      ['Tarih', 'Kategori', 'Tutar', 'Ödeme', 'Kimden', 'Açıklama', 'Oluşturan', 'Durum'],
      ...expenses.map((e) => [
        new Date(e.expenseDate).toLocaleDateString('tr-TR'),
        e.category.name,
        Number(e.amount),
        PAYMENT_OPTIONS.find((p) => p.value === e.paymentMethod)?.label ?? e.paymentMethod,
        e.vendor ?? '',
        e.description ?? '',
        e.createdBy.name,
        STATUS_META[e.status]?.label ?? e.status,
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `giderler-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const total = useMemo(
    () => expenses.reduce((s, e) => s + Number(e.amount), 0),
    [expenses],
  );

  const activeCategories = useMemo(
    () => categories.filter((c) => c.active),
    [categories],
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-100 rounded-xl">
            <Wallet className="w-7 h-7 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Giderler</h1>
            <p className="text-sm text-gray-500">Mali takip — kategori, fiş, onay</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowCategoriesModal(true)}
              className="btn btn-secondary"
              title="Kategorileri Yönet"
            >
              <FolderCog className="w-4 h-4" />
              Kategoriler
            </button>
          )}
          <button onClick={exportCSV} className="btn btn-secondary" disabled={expenses.length === 0}>
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button onClick={fetchAll} className="btn btn-secondary" title="Yenile">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={openCreate} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            Yeni Gider
          </button>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Bu Ay Toplam"
            value={`${stats.monthTotal.toLocaleString('tr-TR')} ₺`}
            Icon={TrendingDown}
            color="#dc2626"
            bg="#fee2e2"
          />
          <StatCard
            label="Bu Hafta"
            value={`${stats.weekTotal.toLocaleString('tr-TR')} ₺`}
            Icon={Calendar}
            color="#7c3aed"
            bg="#ede9fe"
          />
          <StatCard
            label="Onay Bekleyen"
            value={String(stats.pendingCount)}
            Icon={Clock}
            color="#d97706"
            bg="#fef3c7"
          />
          <div className="card">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl" style={{ backgroundColor: '#fee2e2' }}>
                <PiggyBank className="w-6 h-6" style={{ color: '#dc2626' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-500">Bu Ay Top 3 Kategori</p>
                {stats.topCategories.length === 0 ? (
                  <p className="text-base text-gray-400 mt-1">—</p>
                ) : (
                  <div className="mt-1 space-y-0.5">
                    {stats.topCategories.map((c) => (
                      <div key={c.categoryId} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 truncate">
                          {c.icon} {c.name}
                        </span>
                        <span className="font-semibold text-gray-900 ml-2">
                          {c.amount.toLocaleString('tr-TR')} ₺
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-3 text-gray-700">
          <Filter className="w-4 h-4" />
          <span className="font-semibold">Filtreler</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500">Başlangıç</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Bitiş</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Kategori</label>
            <select
              value={filters.categoryId}
              onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
              className="input"
            >
              <option value="">Tümü</option>
              {activeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Ödeme Yöntemi</label>
            <select
              value={filters.paymentMethod}
              onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
              className="input"
            >
              <option value="">Tümü</option>
              {PAYMENT_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Durum</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input"
            >
              <option value="">Tümü</option>
              <option value="APPROVED">Onaylandı</option>
              <option value="PENDING_APPROVAL">Onay Bekliyor</option>
              <option value="REJECTED">Reddedildi</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-500">Arama</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Açıklama, kimden, not…"
                className="input pl-9"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">Sıralama</label>
            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-') as [
                  'expenseDate' | 'amount',
                  'asc' | 'desc',
                ];
                setFilters({ ...filters, sortBy, sortOrder });
              }}
              className="input"
            >
              <option value="expenseDate-desc">Tarih (en yeni)</option>
              <option value="expenseDate-asc">Tarih (en eski)</option>
              <option value="amount-desc">Tutar (en yüksek)</option>
              <option value="amount-asc">Tutar (en düşük)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-900">{expenses.length}</span> kayıt
            {expenses.length > 0 && (
              <>
                {' '}— toplam{' '}
                <span className="font-semibold text-red-600">
                  {total.toLocaleString('tr-TR')} ₺
                </span>
              </>
            )}
          </p>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-gray-500">Yükleniyor…</div>
        ) : expenses.length === 0 ? (
          <div className="py-16 text-center">
            <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Henüz gider kaydı yok</p>
            <p className="text-sm text-gray-400 mt-1">
              "Yeni Gider" butonuyla ilk kaydı ekleyin
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="text-left py-2 px-2">Tarih</th>
                  <th className="text-left py-2 px-2">Kategori</th>
                  <th className="text-right py-2 px-2">Tutar</th>
                  <th className="text-left py-2 px-2">Ödeme</th>
                  <th className="text-left py-2 px-2">Kimden</th>
                  <th className="text-left py-2 px-2">Açıklama</th>
                  <th className="text-center py-2 px-2">Fiş</th>
                  <th className="text-left py-2 px-2">Oluşturan</th>
                  <th className="text-left py-2 px-2">Durum</th>
                  <th className="text-right py-2 px-2">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2 text-sm text-gray-700">
                      {new Date(e.expenseDate).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: e.category.color ? `${e.category.color}20` : '#f3f4f6',
                          color: e.category.color ?? '#374151',
                        }}
                      >
                        {e.category.icon} {e.category.name}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-gray-900">
                      {Number(e.amount).toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-600">
                      {PAYMENT_OPTIONS.find((p) => p.value === e.paymentMethod)?.label ?? e.paymentMethod}
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-700">{e.vendor || '—'}</td>
                    <td className="py-3 px-2 text-sm text-gray-700 max-w-[200px] truncate" title={e.description ?? ''}>
                      {e.description || '—'}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {e.receiptUrl ? (
                        <button
                          onClick={() => setShowReceiptUrl(e.receiptUrl)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Fişi görüntüle"
                        >
                          <ImageIcon className="w-4 h-4 mx-auto" />
                        </button>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-700">{e.createdBy.name}</td>
                    <td className="py-3 px-2">
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: STATUS_META[e.status]?.bg,
                          color: STATUS_META[e.status]?.color,
                        }}
                      >
                        {STATUS_META[e.status]?.label ?? e.status}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin && e.status === 'PENDING_APPROVAL' && (
                          <>
                            <button
                              onClick={() => handleApprove(e)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                              title="Onayla"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(e)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                              title="Reddet"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {canEdit(e) && (
                          <>
                            <button
                              onClick={() => openEdit(e)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                              title="Düzenle"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(e)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                              title="Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-red-600" />
                {editingExpense ? 'Gider Düzenle' : 'Yeni Gider'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Tutar (₺) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="input"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Tarih *</label>
                  <input
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">Kategori *</label>
                  <div className="flex gap-2">
                    <select
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className="input flex-1"
                      required
                    >
                      <option value="">Seçin...</option>
                      {activeCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.name}
                        </option>
                      ))}
                    </select>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setShowInlineNewCategory((s) => !s)}
                        className="btn btn-secondary"
                        title="Yeni Kategori"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {showInlineNewCategory && (
                    <div className="mt-2 flex gap-2 p-2 bg-gray-50 rounded-lg">
                      <input
                        autoFocus
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Yeni kategori adı"
                        className="input flex-1"
                        onKeyDown={(ev) => {
                          if (ev.key === 'Enter') {
                            ev.preventDefault();
                            handleInlineNewCategory();
                          }
                        }}
                      />
                      <button type="button" onClick={handleInlineNewCategory} className="btn btn-primary">
                        Ekle
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Ödeme Yöntemi</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="input"
                  >
                    {PAYMENT_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Kimden (Tedarikçi)</label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    placeholder="BEDAŞ, Migros, vs."
                    className="input"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">Açıklama</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Kısa açıklama"
                    className="input"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">Notlar</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="input"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">Fiş / Fatura Fotosu</label>
                  {formData.receiptUrl ? (
                    <div className="flex items-center gap-3 mt-1">
                      <img src={formData.receiptUrl} alt="Fiş" className="w-20 h-20 object-cover rounded-lg border" />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, receiptUrl: '' })}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Kaldır
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleReceiptUpload(file);
                        }}
                        disabled={uploadingReceipt}
                        className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                      />
                      {uploadingReceipt && <p className="text-xs text-gray-500 mt-1">Yükleniyor…</p>}
                    </div>
                  )}
                </div>
              </div>
              {!isAdmin && Number(formData.amount) >= 10000 && (
                <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-800">
                    Bu tutar 10.000 ₺ üzeri. Gider admin onayı bekleyecek (PENDING_APPROVAL).
                  </p>
                </div>
              )}
            </form>
            <div className="flex justify-end gap-2 px-6 py-3 border-t border-gray-200 bg-gray-50">
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">
                İptal
              </button>
              <button onClick={handleSubmit} className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Kaydediliyor…' : editingExpense ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt preview modal */}
      {showReceiptUrl && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
          onClick={() => setShowReceiptUrl(null)}
        >
          <img src={showReceiptUrl} alt="Fiş" className="max-w-full max-h-[90vh] rounded-lg" />
          <button
            onClick={() => setShowReceiptUrl(null)}
            className="absolute top-4 right-4 p-2 bg-white rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Categories CRUD modal */}
      {showCategoriesModal && (
        <ExpenseCategoriesModal
          token={token!}
          categories={categories}
          onClose={() => setShowCategoriesModal(false)}
          onChange={fetchAll}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  Icon,
  color,
  bg,
}: {
  label: string;
  value: string;
  Icon: any;
  color: string;
  bg: string;
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl" style={{ backgroundColor: bg }}>
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
