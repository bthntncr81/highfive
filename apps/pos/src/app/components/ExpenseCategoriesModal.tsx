// ExpenseCategoriesModal — gider kategorilerini CRUD (admin only).
// Sistem kategorileri silinemez (isSystem=true), sadece görsel + sortOrder + active değiştirilebilir.

import { useState } from 'react';
import { api } from '../lib/api';
import { X, Plus, Trash2, Lock, Edit2, Check } from 'lucide-react';

interface ExpenseCategory {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  isSystem: boolean;
  sortOrder: number;
  active: boolean;
}

interface Props {
  token: string;
  categories: ExpenseCategory[];
  onClose: () => void;
  onChange: () => void;
}

export default function ExpenseCategoriesModal({ token, categories, onClose, onChange }: Props) {
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('💼');
  const [newColor, setNewColor] = useState('#6366f1');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ExpenseCategory>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setIsSubmitting(true);
    try {
      await api.post(
        '/api/expense-categories',
        { name, icon: newIcon, color: newColor, sortOrder: 50 },
        token,
      );
      setNewName('');
      onChange();
    } catch (error: any) {
      alert(error?.message || 'Kategori eklenemedi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await api.put(`/api/expense-categories/${id}`, editForm, token);
      setEditingId(null);
      setEditForm({});
      onChange();
    } catch (error: any) {
      alert(error?.message || 'Güncelleme hatası');
    }
  };

  const handleDelete = async (c: ExpenseCategory) => {
    if (c.isSystem) return;
    if (!confirm(`"${c.name}" kategorisini silmek istediğinizden emin misiniz?`)) return;
    try {
      const res = await api.delete(`/api/expense-categories/${c.id}`, token);
      if (res?.soft) {
        alert('Kategoriye bağlı gider olduğu için pasif yapıldı (silinmedi)');
      }
      onChange();
    } catch (error: any) {
      alert(error?.message || 'Silme hatası');
    }
  };

  const handleToggleActive = async (c: ExpenseCategory) => {
    try {
      await api.put(`/api/expense-categories/${c.id}`, { active: !c.active }, token);
      onChange();
    } catch (error: any) {
      alert(error?.message || 'Güncelleme hatası');
    }
  };

  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Gider Kategorileri</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {/* Add new */}
          <form onSubmit={handleAdd} className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Yeni Kategori Ekle</p>
            <div className="grid grid-cols-12 gap-2">
              <input
                type="text"
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                placeholder="Emoji"
                className="input col-span-2 text-center"
                maxLength={4}
              />
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="input col-span-2 h-10 p-1"
              />
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Kategori adı (ör: Mühendislik)"
                className="input col-span-6"
                required
              />
              <button type="submit" className="btn btn-primary col-span-2" disabled={isSubmitting}>
                <Plus className="w-4 h-4" />
                Ekle
              </button>
            </div>
          </form>

          {/* List */}
          <div className="space-y-2">
            {sorted.map((c) => (
              <div
                key={c.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  c.active ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-60'
                }`}
              >
                {editingId === c.id ? (
                  <>
                    <input
                      type="text"
                      value={editForm.icon ?? c.icon ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                      className="input w-16 text-center"
                      maxLength={4}
                    />
                    <input
                      type="color"
                      value={editForm.color ?? c.color ?? '#999999'}
                      onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                      className="input w-16 h-10 p-1"
                    />
                    <input
                      type="text"
                      value={editForm.name ?? c.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="input flex-1"
                      disabled={c.isSystem}
                    />
                    <input
                      type="number"
                      value={editForm.sortOrder ?? c.sortOrder}
                      onChange={(e) => setEditForm({ ...editForm, sortOrder: Number(e.target.value) })}
                      className="input w-20"
                      placeholder="Sıra"
                    />
                    <button onClick={() => handleSaveEdit(c.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded">
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditForm({});
                      }}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                      style={{ backgroundColor: c.color ? `${c.color}20` : '#f3f4f6' }}
                    >
                      {c.icon || '📁'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{c.name}</p>
                        {c.isSystem && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                            <Lock className="w-3 h-3" /> Sistem
                          </span>
                        )}
                        {!c.active && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            Pasif
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">Sıra: {c.sortOrder}</p>
                    </div>
                    <button
                      onClick={() => handleToggleActive(c)}
                      className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                    >
                      {c.active ? 'Pasif Yap' : 'Aktif Yap'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(c.id);
                        setEditForm({});
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {!c.isSystem && (
                      <button
                        onClick={() => handleDelete(c)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end px-6 py-3 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="btn btn-secondary">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
