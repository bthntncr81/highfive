import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api } from '../lib/api';
import { Search, ShoppingCart, Plus, Minus, Trash2, X, Send, Settings2 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  icon?: string;
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  badges: string[];
  available: boolean;
  categoryId: string;
}

// Malzeme listesi - ürün tipine göre
const INGREDIENTS: Record<string, string[]> = {
  'Pizza': ['Domates Sos', 'Mozzarella', 'Fesleğen', 'Sarımsak', 'Sucuk', 'Salam', 'Mantar', 'Mısır', 'Jalapeno', 'Biber', 'Soğan', 'Zeytin', 'Cheddar', 'Parmesan'],
  'Makarna': ['Krema', 'Domates Sos', 'Peynir Sos', 'Mantar', 'Sosis', 'Köz Biber', 'Patlıcan', 'Füme Et', 'Parmesan', 'Kaşar', 'Sarımsak'],
  'Sandviç': ['Mozzarella', 'Domates', 'Roka', 'Marul', 'Pesto Sos', 'Mayonez', 'Hardal', 'Kornişon', 'Jalapeno', 'Karamelize Soğan', 'Köz Biber'],
  'default': ['Tuz', 'Karabiber', 'Pul Biber', 'Kekik', 'Soğan', 'Sarımsak']
};

export default function Menu() {
  const { token } = useAuth();
  const { items, tableId, addItem, removeItem, updateQuantity, clearCart, total, itemCount } = useCart();
  const navigate = useNavigate();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCart, setShowCart] = useState(false);
  
  // Ürün özelleştirme modal state
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [excludedIngredients, setExcludedIngredients] = useState<string[]>([]);
  const [itemNotes, setItemNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [catResponse, menuResponse] = await Promise.all([
        api.get('/api/categories', token!),
        api.get('/api/menu', token!),
      ]);
      setCategories(catResponse.categories || []);
      setMenuItems(menuResponse.items || []);
      
      if (catResponse.categories?.length > 0) {
        setSelectedCategory(catResponse.categories[0].id);
      }
    } catch (error) {
      console.error('Data fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = !selectedCategory || item.categoryId === selectedCategory;
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && item.available;
  });

  const handleQuickAdd = (item: MenuItem) => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
    });
  };

  const openCustomizeModal = (item: MenuItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItem(item);
    setExcludedIngredients([]);
    setItemNotes('');
    setShowCustomizeModal(true);
  };

  const handleCustomizedAdd = () => {
    if (!selectedItem) return;
    
    const notes = [
      itemNotes,
      excludedIngredients.length > 0 ? `❌ ${excludedIngredients.join(', ')} OLMASIN` : ''
    ].filter(Boolean).join(' | ');
    
    addItem(
      {
        id: selectedItem.id,
        name: selectedItem.name,
        price: selectedItem.price,
        image: selectedItem.image,
      },
      1,
      notes || undefined,
      [],
      excludedIngredients
    );
    
    setShowCustomizeModal(false);
    setSelectedItem(null);
    setExcludedIngredients([]);
    setItemNotes('');
  };

  const toggleIngredient = (ingredient: string) => {
    setExcludedIngredients(prev => 
      prev.includes(ingredient)
        ? prev.filter(i => i !== ingredient)
        : [...prev, ingredient]
    );
  };

  const getIngredientsForCategory = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return INGREDIENTS['default'];
    
    if (category.name.includes('Pizza')) return INGREDIENTS['Pizza'];
    if (category.name.includes('Makarna')) return INGREDIENTS['Makarna'];
    if (category.name.includes('Sandviç')) return INGREDIENTS['Sandviç'];
    return INGREDIENTS['default'];
  };

  const handleSubmitOrder = async () => {
    if (items.length === 0) return;
    
    setIsSubmitting(true);
    try {
      const orderItems = items.map((item) => ({
        menuItemId: item.menuItem.id,
        quantity: item.quantity,
        notes: item.notes,
        modifiers: item.modifiers,
      }));

      const response = await api.post('/api/orders', {
        tableId: tableId || undefined,
        items: orderItems,
        type: tableId ? 'DINE_IN' : 'TAKEAWAY',
      }, token!);

      clearCart();
      navigate(`/orders/${response.order.id}`);
    } catch (error) {
      console.error('Order submit error:', error);
      alert('Sipariş oluşturulamadı');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCartItemQuantity = (itemId: string) => {
    const cartItem = items.find((i) => i.menuItem.id === itemId);
    return cartItem?.quantity || 0;
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Menu section */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-white border-b">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Menü</h1>
              {tableId && (
                <p className="text-sm text-primary-500">Masa siparişi oluşturuluyor</p>
              )}
            </div>
            <button
              onClick={() => setShowCart(true)}
              className="btn btn-primary flex items-center gap-2 lg:hidden"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>{itemCount}</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ürün ara..."
              className="input pl-10"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="p-4 bg-white border-b overflow-x-auto">
          <div className="flex gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.icon} {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Menu items grid */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems.map((item) => {
              const quantity = getCartItemQuantity(item.id);
              
              return (
                <div
                  key={item.id}
                  className={`card cursor-pointer hover:shadow-lg transition-all relative group ${
                    quantity > 0 ? 'ring-2 ring-primary-500' : ''
                  }`}
                  onClick={() => handleQuickAdd(item)}
                >
                  {/* Customize button */}
                  <button
                    onClick={(e) => openCustomizeModal(item, e)}
                    className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-orange-100 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"
                    title="Özelleştir"
                  >
                    <Settings2 className="w-4 h-4 text-orange-600" />
                  </button>

                  {/* Badges */}
                  {item.badges.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {item.badges.map((badge) => (
                        <span
                          key={badge}
                          className={`badge text-xs ${
                            badge === 'Acılı' ? 'bg-red-100 text-red-700' :
                            badge === 'Yeni' ? 'bg-green-100 text-green-700' :
                            badge === 'Popüler' ? 'bg-yellow-100 text-yellow-700' :
                            badge === 'Vegan' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Item info */}
                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                  {item.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">{item.description}</p>
                  )}
                  
                  {/* Price & quantity */}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-lg font-bold text-primary-500">
                      {item.price.toLocaleString('tr-TR')} ₺
                    </span>
                    {quantity > 0 && (
                      <span className="bg-primary-500 text-white text-sm px-2 py-1 rounded-full">
                        {quantity}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Ürün bulunamadı</p>
            </div>
          )}
        </div>
      </div>

      {/* Cart sidebar (desktop) */}
      <div className="hidden lg:flex w-96 bg-white border-l flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Sepet ({itemCount})</h2>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3">
          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Sepet boş</p>
          ) : (
            items.map((item) => (
              <div key={item.menuItem.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{item.menuItem.name}</p>
                  <p className="text-sm text-gray-500">
                    {item.menuItem.price.toLocaleString('tr-TR')} ₺
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                    className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                    className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeItem(item.menuItem.id)}
                    className="p-1 rounded-full text-red-500 hover:bg-red-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-4 border-t space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Toplam</span>
              <span className="text-2xl font-bold text-gray-900">
                {total.toLocaleString('tr-TR')} ₺
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={clearCart}
                className="btn btn-secondary flex-1"
              >
                Temizle
              </button>
              <button
                onClick={handleSubmitOrder}
                disabled={isSubmitting}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Gönderiliyor
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Sipariş Ver
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cart modal (mobile) */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 z-50 lg:hidden" onClick={() => setShowCart(false)}>
          <div
            className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Sepet ({itemCount})</h2>
              <button onClick={() => setShowCart(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3">
              {items.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Sepet boş</p>
              ) : (
                items.map((item) => (
                  <div key={item.menuItem.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.menuItem.name}</p>
                      <p className="text-sm text-gray-500">
                        {item.menuItem.price.toLocaleString('tr-TR')} ₺
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                        className="p-1 rounded-full bg-gray-200"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                        className="p-1 rounded-full bg-gray-200"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="p-4 border-t space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Toplam</span>
                  <span className="text-2xl font-bold">{total.toLocaleString('tr-TR')} ₺</span>
                </div>
                <button
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting}
                  className="btn btn-primary w-full py-3"
                >
                  {isSubmitting ? 'Gönderiliyor...' : 'Sipariş Ver'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ürün Özelleştirme Modal */}
      {showCustomizeModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCustomizeModal(false)}>
          <div 
            className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedItem.name}</h2>
                <p className="text-sm text-gray-500">{selectedItem.price.toLocaleString('tr-TR')} ₺</p>
              </div>
              <button 
                onClick={() => setShowCustomizeModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Çıkarılacak Malzemeler */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="text-red-500">❌</span>
                Olmasın (Çıkarılacak Malzemeler)
              </h3>
              <div className="flex flex-wrap gap-2">
                {getIngredientsForCategory(selectedItem.categoryId).map((ingredient) => (
                  <button
                    key={ingredient}
                    onClick={() => toggleIngredient(ingredient)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      excludedIngredients.includes(ingredient)
                        ? 'bg-red-500 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {excludedIngredients.includes(ingredient) && '❌ '}
                    {ingredient}
                  </button>
                ))}
              </div>
            </div>

            {/* Seçilen Çıkarılacaklar */}
            {excludedIngredients.length > 0 && (
              <div className="mb-6 p-3 bg-red-50 rounded-xl border border-red-200">
                <p className="text-sm text-red-700 font-medium">
                  🚫 Çıkarılacak: {excludedIngredients.join(', ')}
                </p>
              </div>
            )}

            {/* Özel Not */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span>📝</span>
                Özel Not
              </h3>
              <textarea
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                placeholder="Örn: Az pişmiş olsun, ekstra sos..."
                className="input min-h-[80px] resize-none"
              />
            </div>

            {/* Hızlı Notlar */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                {['Az pişmiş', 'Çok pişmiş', 'Ekstra sos', 'Yanında ketçap', 'Acısız'].map((note) => (
                  <button
                    key={note}
                    onClick={() => setItemNotes(prev => prev ? `${prev}, ${note}` : note)}
                    className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-sm hover:bg-amber-200 transition-all"
                  >
                    + {note}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="btn btn-secondary flex-1"
              >
                İptal
              </button>
              <button
                onClick={handleCustomizedAdd}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Sepete Ekle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

