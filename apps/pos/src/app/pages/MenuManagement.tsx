import { AlertCircle, Edit2, Image, Film, Plus, Trash2, X, Beaker, Scale, Link2, Upload, Eye, FolderPlus, GripVertical } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Category {
  id: string;
  name: string;
  icon: string;
  image?: string;
  sortOrder: number;
  active: boolean;
  _count?: { items: number };
}

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
}

interface MenuItemIngredient {
  id: string;
  rawMaterialId: string;
  amount: number;
  optional: boolean;
  rawMaterial: RawMaterial;
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  available: boolean;
  badges: string[];
  allergens: string[];
  calories?: number;
  prepTime?: number;
  featured: boolean;
  category: Category;
  categoryId: string;
  ingredients?: MenuItemIngredient[];
}

const ALLERGEN_OPTIONS = [
  { value: 'GLUTEN', label: 'Gluten', emoji: '🌾' },
  { value: 'MILK', label: 'Süt', emoji: '🥛' },
  { value: 'EGGS', label: 'Yumurta', emoji: '🥚' },
  { value: 'FISH', label: 'Balık', emoji: '🐟' },
  { value: 'PEANUTS', label: 'Fıstık', emoji: '🥜' },
  { value: 'SOYBEANS', label: 'Soya', emoji: '🫘' },
  { value: 'NUTS', label: 'Kuruyemiş', emoji: '🌰' },
  { value: 'CELERY', label: 'Kereviz', emoji: '🥬' },
  { value: 'MUSTARD', label: 'Hardal', emoji: '🟡' },
  { value: 'SESAME_SEEDS', label: 'Susam', emoji: '⚪' },
  { value: 'CRUSTACEANS', label: 'Kabuklu', emoji: '🦐' },
  { value: 'MOLLUSCS', label: 'Yumuşakça', emoji: '🦑' },
  { value: 'LUPIN', label: 'Acı Bakla', emoji: '🫛' },
  { value: 'SULPHUR_DIOXIDE', label: 'Kükürt', emoji: '🧪' },
];

const BADGE_OPTIONS = [
  { value: 'yeni', label: 'Yeni', color: 'bg-green-100 text-green-800' },
  { value: 'populer', label: 'Popüler', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'chef', label: 'Şef Önerisi', color: 'bg-purple-100 text-purple-800' },
  { value: 'vegan', label: 'Vegan', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'aci', label: 'Acılı', color: 'bg-red-100 text-red-800' },
];

const CATEGORY_ICONS = [
  '🍕', '🍝', '🥪', '🥤', '🍰', '🍔', '🌮', '🥗', '🍣', '🍜',
  '🥩', '🍗', '🐟', '🥘', '🧁', '☕', '🍺', '🍷', '🧃', '🥐',
  '🍟', '🌯', '🥙', '🍲', '🥧', '🫔', '🥚', '🧀', '🍩', '🎂',
];

// Helper: check if URL is a video
function isVideoUrl(url?: string): boolean {
  if (!url) return false;
  const videoExts = ['.mp4', '.webm', '.ogg', '.mov'];
  const lower = url.toLowerCase();
  return videoExts.some((ext) => lower.includes(ext));
}

// Helper: build full media URL
function getMediaUrl(path?: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_URL}${path}`;
}

export default function MenuManagement() {
  const { token } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cross-sell management
  const [showCrossSellModal, setShowCrossSellModal] = useState(false);
  const [crossSellItem, setCrossSellItem] = useState<MenuItem | null>(null);
  const [crossSellTargets, setCrossSellTargets] = useState<string[]>([]);

  // Ingredient management
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [ingredientItem, setIngredientItem] = useState<MenuItem | null>(null);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [itemIngredients, setItemIngredients] = useState<{ rawMaterialId: string; amount: string; optional: boolean }[]>([]);
  const [isSavingIngredients, setIsSavingIngredients] = useState(false);

  // Category management
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', icon: '🍽️' });
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // Media viewer
  const [mediaViewer, setMediaViewer] = useState<{ url: string; isVideo: boolean; title: string } | null>(null);

  // File upload
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    categoryId: '',
    name: '',
    description: '',
    price: '',
    image: '',
    badges: [] as string[],
    allergens: [] as string[],
    calories: '',
    prepTime: '',
    featured: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [menuRes, catRes, matRes] = await Promise.all([
        api.get('/api/menu', token!),
        api.get('/api/categories', token!),
        api.get('/api/raw-materials', token!),
      ]);
      setMenuItems(menuRes.items || []);
      setCategories(catRes.categories || []);
      setRawMaterials((matRes.materials || []).filter((m: any) => m.active));
    } catch (error) {
      console.error('Data fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== FILE UPLOAD ====================
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
      'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
    ];
    if (!allowedTypes.includes(file.type)) {
      alert('Desteklenmeyen dosya formatı! JPG, PNG, WebP, GIF, SVG, MP4, WebM, OGG desteklenir.');
      return;
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      alert('Dosya boyutu çok büyük! Maksimum 50MB.');
      return;
    }

    setIsUploading(true);
    try {
      const result = await api.upload('/api/upload', file, token!);
      if (result.file?.url) {
        setFormData({ ...formData, image: result.file.url });
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      alert('Dosya yükleme hatası: ' + (error.message || 'Bilinmeyen hata'));
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveMedia = () => {
    setFormData({ ...formData, image: '' });
  };

  // ==================== MENU ITEM CRUD ====================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        calories: formData.calories ? parseInt(formData.calories) : undefined,
        prepTime: formData.prepTime ? parseInt(formData.prepTime) : undefined,
      };

      if (editingItem) {
        await api.put(`/api/menu/${editingItem.id}`, payload, token!);
      } else {
        await api.post('/api/menu', payload, token!);
      }

      setShowModal(false);
      setEditingItem(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Submit error:', error);
      alert('İşlem başarısız');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      categoryId: categories[0]?.id || '',
      name: '',
      description: '',
      price: '',
      image: '',
      badges: [],
      allergens: [],
      calories: '',
      prepTime: '',
      featured: false,
    });
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      categoryId: item.categoryId,
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      image: item.image || '',
      badges: item.badges || [],
      allergens: item.allergens || [],
      calories: item.calories?.toString() || '',
      prepTime: item.prepTime?.toString() || '',
      featured: item.featured,
    });
    setShowModal(true);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;

    try {
      const result = await api.delete(`/api/menu/${itemId}`, token!);
      if (result.softDeleted) {
        alert(result.message || 'Ürün siparişlerde kullanıldığı için pasife alındı.');
      }
      fetchData();
    } catch (error: any) {
      console.error('Delete error:', error);
      alert('Silme işlemi başarısız: ' + (error.message || 'Bilinmeyen hata'));
    }
  };

  const handleToggleAvailable = async (item: MenuItem) => {
    try {
      await api.patch(`/api/stock/menu/${item.id}/availability`, {
        available: !item.available,
      }, token!);
      fetchData();
    } catch (error) {
      console.error('Toggle error:', error);
    }
  };

  // ==================== CATEGORY CRUD ====================
  const openCategoryModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({ name: category.name, icon: category.icon || '🍽️' });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', icon: '🍽️' });
    }
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      alert('Kategori adı gerekli');
      return;
    }
    setIsSavingCategory(true);
    try {
      if (editingCategory) {
        await api.put(`/api/categories/${editingCategory.id}`, {
          name: categoryForm.name,
          icon: categoryForm.icon,
        }, token!);
      } else {
        await api.post('/api/categories', {
          name: categoryForm.name,
          icon: categoryForm.icon,
          sortOrder: categories.length,
        }, token!);
      }
      setShowCategoryModal(false);
      setEditingCategory(null);
      fetchData();
    } catch (error: any) {
      console.error('Category save error:', error);
      alert('Kategori kaydedilemedi: ' + (error.message || ''));
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    const itemCount = cat?._count?.items || menuItems.filter((m) => m.categoryId === catId).length;

    if (itemCount > 0) {
      if (!confirm(`Bu kategoride ${itemCount} ürün var. Kategori pasife alınacak. Devam edilsin mi?`)) return;
    } else {
      if (!confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) return;
    }

    try {
      await api.delete(`/api/categories/${catId}`, token!);
      fetchData();
    } catch (error: any) {
      console.error('Delete category error:', error);
      alert('Kategori silinemedi: ' + (error.message || ''));
    }
  };

  // ==================== CROSS-SELL ====================
  const openCrossSellModal = (item: MenuItem) => {
    setCrossSellItem(item);
    setCrossSellTargets([]);
    setShowCrossSellModal(true);
  };

  const handleSaveCrossSells = async () => {
    if (!crossSellItem) return;

    try {
      for (const targetId of crossSellTargets) {
        await api.post('/api/crosssells', {
          fromItemId: crossSellItem.id,
          toItemId: targetId,
        }, token!);
      }
      setShowCrossSellModal(false);
      alert('Cross-sell ilişkileri kaydedildi!');
    } catch (error) {
      console.error('Cross-sell save error:', error);
      alert('Kayıt başarısız');
    }
  };

  // ==================== INGREDIENT MANAGEMENT ====================
  const openIngredientModal = (item: MenuItem) => {
    setIngredientItem(item);
    const existing = (item.ingredients || []).map((ing) => ({
      rawMaterialId: ing.rawMaterialId,
      amount: Number(ing.amount).toString(),
      optional: ing.optional,
    }));
    setItemIngredients(existing.length > 0 ? existing : []);
    setShowIngredientModal(true);
  };

  const addIngredientRow = () => {
    setItemIngredients([...itemIngredients, { rawMaterialId: '', amount: '', optional: false }]);
  };

  const removeIngredientRow = (index: number) => {
    setItemIngredients(itemIngredients.filter((_, i) => i !== index));
  };

  const updateIngredientRow = (index: number, field: string, value: any) => {
    const updated = [...itemIngredients];
    updated[index] = { ...updated[index], [field]: value };
    setItemIngredients(updated);
  };

  const handleSaveIngredients = async () => {
    if (!ingredientItem) return;
    setIsSavingIngredients(true);

    try {
      const validIngredients = itemIngredients.filter(
        (ing) => ing.rawMaterialId && ing.amount && parseFloat(ing.amount) > 0
      );

      await api.post(
        `/api/raw-materials/menu-item/${ingredientItem.id}/ingredients/bulk`,
        {
          ingredients: validIngredients.map((ing) => ({
            rawMaterialId: ing.rawMaterialId,
            amount: parseFloat(ing.amount),
            optional: ing.optional,
          })),
        },
        token!
      );

      setShowIngredientModal(false);
      setIngredientItem(null);
      fetchData();
    } catch (error) {
      console.error('Save ingredients error:', error);
      alert('İçerik kaydetme başarısız');
    } finally {
      setIsSavingIngredients(false);
    }
  };

  const getUnitShort = (unit: string) => {
    const map: Record<string, string> = {
      GRAM: 'g', KILOGRAM: 'kg', LITRE: 'L', MILLILITRE: 'mL', ADET: 'adet', PORSIYON: 'prs',
    };
    return map[unit] || unit;
  };

  // ==================== FILTERING ====================
  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item)
      ? array.filter((i) => i !== item)
      : [...array, item];
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
          <h1 className="text-2xl font-bold text-gray-900">Menü Yönetimi</h1>
          <p className="text-gray-500">{menuItems.length} ürün &middot; {categories.length} kategori</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openCategoryModal()}
            className="btn btn-secondary flex items-center gap-2"
          >
            <FolderPlus className="w-4 h-4" />
            Kategori Ekle
          </button>
          <button
            onClick={() => {
              setEditingItem(null);
              resetForm();
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ürün Ekle
          </button>
        </div>
      </div>

      {/* Category Management Bar */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Kategoriler</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedCategory === 'all'
                ? 'bg-primary-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tümü ({menuItems.length})
          </button>
          {categories.map((cat) => {
            const count = menuItems.filter((m) => m.categoryId === cat.id).length;
            return (
              <div key={cat.id} className="relative group">
                <button
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-primary-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.icon} {cat.name} ({count})
                </button>
                {/* Category edit/delete on hover */}
                <div className="absolute -top-1 -right-1 hidden group-hover:flex gap-0.5 z-10">
                  <button
                    onClick={(e) => { e.stopPropagation(); openCategoryModal(cat); }}
                    className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-blue-600 shadow"
                    title="Düzenle"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                    className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 shadow"
                    title="Sil"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
          <button
            onClick={() => openCategoryModal()}
            className="px-4 py-2 rounded-lg text-sm font-medium border-2 border-dashed border-gray-300 text-gray-400 hover:border-primary-400 hover:text-primary-500 transition-all flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Yeni
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Ürün ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`card relative ${!item.available ? 'opacity-60' : ''}`}
          >
            {/* Image / Video Preview */}
            <div
              className="relative h-40 -mx-4 -mt-4 mb-4 overflow-hidden rounded-t-xl bg-gray-100 cursor-pointer group"
              onClick={() => {
                if (item.image) {
                  setMediaViewer({
                    url: getMediaUrl(item.image),
                    isVideo: isVideoUrl(item.image),
                    title: item.name,
                  });
                }
              }}
            >
              {item.image ? (
                isVideoUrl(item.image) ? (
                  // Video thumbnail
                  <div className="w-full h-full flex items-center justify-center bg-gray-900">
                    <video
                      src={getMediaUrl(item.image)}
                      className="w-full h-full object-cover"
                      muted
                      preload="metadata"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-all">
                      <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                        <Film className="w-6 h-6 text-gray-800" />
                      </div>
                    </div>
                  </div>
                ) : (
                  // Image
                  <>
                    <img
                      src={getMediaUrl(item.image)}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Eye className="w-8 h-8 text-white drop-shadow-lg" />
                    </div>
                  </>
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <Image className="w-12 h-12" />
                </div>
              )}

              {/* Availability Badge */}
              {!item.available && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                    Tükendi
                  </span>
                </div>
              )}

              {/* Featured Badge */}
              {item.featured && (
                <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold">
                  ⭐ Öne Çıkan
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-gray-900">{item.name}</h3>
                <span className="font-bold text-primary-600">₺{item.price}</span>
              </div>

              {item.description && (
                <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
              )}

              {/* Badges */}
              {item.badges && item.badges.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.badges.map((badge) => {
                    const badgeInfo = BADGE_OPTIONS.find((b) => b.value === badge);
                    return (
                      <span
                        key={badge}
                        className={`text-xs px-2 py-0.5 rounded-full ${badgeInfo?.color || 'bg-gray-100 text-gray-600'}`}
                      >
                        {badgeInfo?.label || badge}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Allergens */}
              {item.allergens && item.allergens.length > 0 && (
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-orange-500" />
                  <span className="text-xs text-orange-600">
                    {item.allergens.map((a) => ALLERGEN_OPTIONS.find((o) => o.value === a)?.emoji).join(' ')}
                  </span>
                </div>
              )}

              {/* Category */}
              <p className="text-xs text-gray-400">
                {item.category?.icon} {item.category?.name}
              </p>

              {/* Ingredients count */}
              {item.ingredients && item.ingredients.length > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Beaker className="w-3 h-3 text-purple-500" />
                  <span className="text-xs text-purple-600 font-medium">
                    {item.ingredients.length} içerik
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              <button
                onClick={() => handleToggleAvailable(item)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  item.available
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {item.available ? '❌ Kapat' : '✅ Aç'}
              </button>
              <button
                onClick={() => openIngredientModal(item)}
                className="p-2 hover:bg-purple-100 rounded-lg text-purple-600"
                title="İçerik Yönetimi"
              >
                <Beaker className="w-4 h-4" />
              </button>
              <button
                onClick={() => openCrossSellModal(item)}
                className="p-2 hover:bg-blue-100 rounded-lg text-blue-600"
                title="Cross-sell Ayarla"
              >
                <Link2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleEdit(item)}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="p-2 hover:bg-red-100 rounded-lg text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-gray-500">Ürün bulunamadı</p>
        </div>
      )}

      {/* ==================== ADD/EDIT MENU ITEM MODAL ==================== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            {/* Sticky Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b shrink-0">
              <h2 className="text-xl font-semibold">
                {editingItem ? 'Ürün Düzenle' : 'Yeni Ürün'}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="overflow-y-auto p-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategori *
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className="input flex-1"
                      required
                    >
                      <option value="">Seçin</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => openCategoryModal()}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
                      title="Yeni Kategori Ekle"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fiyat (₺) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ürün Adı *
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
                  Açıklama
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  rows={2}
                />
              </div>

              {/* ===== MEDIA UPLOAD SECTION ===== */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Görsel / Video
                </label>

                {/* Current media preview */}
                {formData.image ? (
                  <div className="relative mb-3 rounded-xl overflow-hidden border-2 border-gray-200">
                    {isVideoUrl(formData.image) ? (
                      <video
                        src={getMediaUrl(formData.image)}
                        className="w-full h-48 object-cover bg-black"
                        controls
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={getMediaUrl(formData.image)}
                        alt="Ürün görseli"
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={handleRemoveMedia}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                      {isVideoUrl(formData.image) ? '🎥 Video' : '🖼️ Görsel'}
                    </div>
                  </div>
                ) : null}

                {/* Upload area */}
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,video/mp4,video/webm,video/ogg,video/quicktime"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="media-upload"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className={`flex-1 py-3 border-2 border-dashed rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                      isUploading
                        ? 'border-gray-300 text-gray-400 cursor-wait'
                        : 'border-primary-300 text-primary-600 hover:bg-primary-50 hover:border-primary-400'
                    }`}
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-500 border-t-transparent"></div>
                        Yükleniyor...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        {formData.image ? 'Değiştir' : 'Görsel veya Video Yükle'}
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  JPG, PNG, WebP, GIF, SVG, MP4, WebM, OGG (max 50MB)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kalori (kcal)
                  </label>
                  <input
                    type="number"
                    value={formData.calories}
                    onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hazırlama Süresi (dk)
                  </label>
                  <input
                    type="number"
                    value={formData.prepTime}
                    onChange={(e) => setFormData({ ...formData, prepTime: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              {/* Badges */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Etiketler
                </label>
                <div className="flex flex-wrap gap-2">
                  {BADGE_OPTIONS.map((badge) => (
                    <button
                      key={badge.value}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          badges: toggleArrayItem(formData.badges, badge.value),
                        })
                      }
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        formData.badges.includes(badge.value)
                          ? badge.color + ' ring-2 ring-offset-2 ring-gray-400'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {badge.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Allergens */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alerjenler
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALLERGEN_OPTIONS.map((allergen) => (
                    <button
                      key={allergen.value}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          allergens: toggleArrayItem(formData.allergens, allergen.value),
                        })
                      }
                      className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                        formData.allergens.includes(allergen.value)
                          ? 'bg-orange-100 text-orange-700 ring-2 ring-offset-2 ring-orange-400'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {allergen.emoji} {allergen.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Featured */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">⭐ Öne Çıkan Ürün</span>
              </label>
            </div>

              {/* Sticky Footer */}
              <div className="flex gap-2 p-6 pt-4 border-t shrink-0">
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

      {/* ==================== CATEGORY MODAL ==================== */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 pb-4 border-b">
              <h2 className="text-xl font-semibold">
                {editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori'}
              </h2>
              <button onClick={() => setShowCategoryModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Category Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori Adı *
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="input"
                  placeholder="Ör: Pizza, İçecekler..."
                  autoFocus
                />
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  İkon
                </label>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 bg-primary-50 rounded-xl flex items-center justify-center text-3xl border-2 border-primary-200">
                    {categoryForm.icon}
                  </div>
                  <div className="text-sm text-gray-500">
                    Aşağıdan bir ikon seçin
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl max-h-32 overflow-y-auto">
                  {CATEGORY_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setCategoryForm({ ...categoryForm, icon })}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                        categoryForm.icon === icon
                          ? 'bg-primary-500 shadow-md scale-110 ring-2 ring-primary-300'
                          : 'bg-white hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 p-6 pt-0">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="btn btn-secondary flex-1"
              >
                İptal
              </button>
              <button
                onClick={handleSaveCategory}
                disabled={isSavingCategory || !categoryForm.name.trim()}
                className="btn btn-primary flex-1"
              >
                {isSavingCategory ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== INGREDIENT MODAL ==================== */}
      {showIngredientModal && ingredientItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            {/* Sticky Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b shrink-0">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Beaker className="w-5 h-5 text-purple-500" />
                  İçerik Yönetimi
                </h2>
                <p className="text-sm text-gray-500">
                  "{ingredientItem.name}" ürününün içerikleri
                </p>
              </div>
              <button onClick={() => setShowIngredientModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto p-6 py-4 flex-1 min-h-0">
            {/* Ingredients list */}
            <div className="space-y-3 mb-4">
              {itemIngredients.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Scale className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Henüz içerik eklenmemiş</p>
                  <p className="text-sm">Aşağıdaki butonla içerik ekleyin</p>
                </div>
              ) : (
                itemIngredients.map((ing, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    {/* Material select */}
                    <div className="flex-1 min-w-0">
                      <select
                        value={ing.rawMaterialId}
                        onChange={(e) => updateIngredientRow(index, 'rawMaterialId', e.target.value)}
                        className="input text-sm"
                      >
                        <option value="">Ham madde seçin...</option>
                        {rawMaterials.map((mat) => (
                          <option key={mat.id} value={mat.id}>
                            {mat.name} ({getUnitShort(mat.unit)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Amount */}
                    <div className="w-28">
                      <input
                        type="number"
                        step="0.1"
                        value={ing.amount}
                        onChange={(e) => updateIngredientRow(index, 'amount', e.target.value)}
                        className="input text-sm text-center"
                        placeholder="Miktar"
                      />
                    </div>

                    {/* Unit label */}
                    <div className="w-10 text-xs text-gray-500 text-center">
                      {ing.rawMaterialId
                        ? getUnitShort(rawMaterials.find((m) => m.id === ing.rawMaterialId)?.unit || '')
                        : ''}
                    </div>

                    {/* Optional toggle */}
                    <label className="flex items-center gap-1 cursor-pointer" title="Çıkarılabilir (Olmasın seçeneği)">
                      <input
                        type="checkbox"
                        checked={ing.optional}
                        onChange={(e) => updateIngredientRow(index, 'optional', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-purple-600"
                      />
                      <span className="text-xs text-gray-500 whitespace-nowrap">Çıkarılabilir</span>
                    </label>

                    {/* Remove */}
                    <button
                      onClick={() => removeIngredientRow(index)}
                      className="p-1.5 hover:bg-red-100 rounded-lg text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add ingredient button */}
            <button
              onClick={addIngredientRow}
              className="w-full py-3 border-2 border-dashed border-purple-300 rounded-lg text-purple-600 hover:bg-purple-50 font-medium flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              İçerik Ekle
            </button>

            {rawMaterials.length === 0 && (
              <p className="text-sm text-amber-600 mt-2 text-center">
                Henüz ham madde tanımlanmamış. Önce "Ham Madde Yönetimi" sayfasından ham madde ekleyin.
              </p>
            )}
            </div>

            {/* Sticky Footer */}
            <div className="flex gap-2 p-6 pt-4 border-t shrink-0">
              <button onClick={() => setShowIngredientModal(false)} className="btn btn-secondary flex-1">
                İptal
              </button>
              <button
                onClick={handleSaveIngredients}
                disabled={isSavingIngredients}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {isSavingIngredients ? 'Kaydediliyor...' : (
                  <>
                    <Beaker className="w-4 h-4" />
                    İçerikleri Kaydet ({itemIngredients.filter((i) => i.rawMaterialId && i.amount).length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CROSS-SELL MODAL ==================== */}
      {showCrossSellModal && crossSellItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg flex flex-col max-h-[90vh]">
            {/* Sticky Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b shrink-0">
              <div>
                <h2 className="text-xl font-semibold">Cross-sell Ayarla</h2>
                <p className="text-sm text-gray-500">
                  "{crossSellItem.name}" ile birlikte önerilecek ürünler
                </p>
              </div>
              <button onClick={() => setShowCrossSellModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto p-6 py-4 flex-1 min-h-0">
            <div className="space-y-2">
              {menuItems
                .filter((item) => item.id !== crossSellItem.id)
                .map((item) => (
                  <label
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      crossSellTargets.includes(item.id)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={crossSellTargets.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCrossSellTargets([...crossSellTargets, item.id]);
                        } else {
                          setCrossSellTargets(crossSellTargets.filter((id) => id !== item.id));
                        }
                      }}
                      className="w-5 h-5 rounded border-gray-300 text-primary-600"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.category?.name}</p>
                    </div>
                    <span className="font-bold text-primary-600">₺{item.price}</span>
                  </label>
                ))}
            </div>
            </div>

            {/* Sticky Footer */}
            <div className="flex gap-2 p-6 pt-4 border-t shrink-0">
              <button
                onClick={() => setShowCrossSellModal(false)}
                className="btn btn-secondary flex-1"
              >
                İptal
              </button>
              <button
                onClick={handleSaveCrossSells}
                className="btn btn-primary flex-1"
              >
                Kaydet ({crossSellTargets.length} ürün)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MEDIA VIEWER (LIGHTBOX) ==================== */}
      {mediaViewer && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[70] p-4"
          onClick={() => setMediaViewer(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setMediaViewer(null)}
              className="absolute -top-12 right-0 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Title */}
            <div className="absolute -top-12 left-0 text-white text-lg font-medium">
              {mediaViewer.title}
            </div>

            {/* Content */}
            {mediaViewer.isVideo ? (
              <video
                src={mediaViewer.url}
                className="w-full max-h-[85vh] rounded-xl"
                controls
                autoPlay
              />
            ) : (
              <img
                src={mediaViewer.url}
                alt={mediaViewer.title}
                className="w-full max-h-[85vh] object-contain rounded-xl"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
