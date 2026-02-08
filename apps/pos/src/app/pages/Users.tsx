import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Plus, Edit2, Trash2, User, Shield, X } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  createdAt: string;
}

const ROLES = [
  { value: 'ADMIN', label: 'Admin', color: 'bg-red-100 text-red-800' },
  { value: 'MANAGER', label: 'Yönetici', color: 'bg-purple-100 text-purple-800' },
  { value: 'WAITER', label: 'Garson', color: 'bg-blue-100 text-blue-800' },
  { value: 'KITCHEN', label: 'Mutfak', color: 'bg-orange-100 text-orange-800' },
  { value: 'CASHIER', label: 'Kasa', color: 'bg-green-100 text-green-800' },
];

export default function Users() {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'WAITER',
    pin: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/users', token!);
      setUsers(response.users || []);
    } catch (error) {
      console.error('Users fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingUser) {
        await api.put(`/api/users/${editingUser.id}`, formData, token!);
      } else {
        await api.post('/api/users', formData, token!);
      }
      
      setShowModal(false);
      setEditingUser(null);
      setFormData({ email: '', password: '', name: '', role: 'WAITER', pin: '' });
      fetchUsers();
    } catch (error) {
      console.error('Submit error:', error);
      alert('İşlem başarısız');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (user: UserData) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      name: user.name,
      role: user.role,
      pin: '',
    });
    setShowModal(true);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;

    try {
      await api.delete(`/api/users/${userId}`, token!);
      fetchUsers();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Silme işlemi başarısız');
    }
  };

  const getRoleInfo = (role: string) => {
    return ROLES.find((r) => r.value === role) || ROLES[2];
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
          <h1 className="text-2xl font-bold text-gray-900">Kullanıcılar</h1>
          <p className="text-gray-500">{users.length} kullanıcı</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setFormData({ email: '', password: '', name: '', role: 'WAITER', pin: '' });
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Kullanıcı Ekle
        </button>
      </div>

      {/* Users list */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="table-cell text-left font-medium text-gray-600">Kullanıcı</th>
              <th className="table-cell text-left font-medium text-gray-600">E-posta</th>
              <th className="table-cell text-left font-medium text-gray-600">Rol</th>
              <th className="table-cell text-left font-medium text-gray-600">Durum</th>
              <th className="table-cell text-right font-medium text-gray-600">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const roleInfo = getRoleInfo(user.role);
              
              return (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="table-cell text-gray-600">{user.email}</td>
                  <td className="table-cell">
                    <span className={`badge ${roleInfo.color}`}>
                      {roleInfo.label}
                    </span>
                  </td>
                  <td className="table-cell">
                    {user.active ? (
                      <span className="badge bg-green-100 text-green-800">Aktif</span>
                    ) : (
                      <span className="badge bg-gray-100 text-gray-800">Pasif</span>
                    )}
                  </td>
                  <td className="table-cell text-right">
                    <button
                      onClick={() => handleEdit(user)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="p-2 hover:bg-red-100 rounded-lg text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Henüz kullanıcı yok</p>
          </div>
        )}
      </div>

      {/* User modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">
                {editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ad Soyad
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-posta
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Şifre {editingUser && '(boş bırakılırsa değişmez)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input"
                  required={!editingUser}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PIN (4 haneli)
                </label>
                <input
                  type="text"
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  className="input"
                  maxLength={4}
                  placeholder="Hızlı giriş için"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rol
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, role: role.value })}
                      className={`p-3 rounded-lg border-2 text-left transition-colors ${
                        formData.role === role.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className={`badge ${role.color}`}>{role.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary flex-1"
                >
                  {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

