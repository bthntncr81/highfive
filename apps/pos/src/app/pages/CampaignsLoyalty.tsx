import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Gift, Tag, Percent, Star, Crown, Package,
  Plus, Trash2, Edit2, Check, X, Search, Award, TrendingUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

interface LoyaltyTier {
  id: string;
  name: string;
  minPoints: number;
  pointsMultiplier: number;
  discountPercent: number;
  benefits: string[];
  color: string;
  icon: string;
  customerCount?: number;
}

interface Customer {
  id: string;
  phone: string;
  email?: string;
  name?: string;
  totalPoints: number;
  lifetimePoints: number;
  totalSpent: number;
  orderCount: number;
  loyaltyTier?: LoyaltyTier;
  lastOrderAt?: string;
}

interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: string;
  discountType?: string;
  discountValue?: number;
  minPurchase?: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  currentUsage: number;
  usageLimit?: number;
}

interface BundleDeal {
  id: string;
  name: string;
  description?: string;
  image?: string;
  originalPrice: number;
  bundlePrice: number;
  savings: number;
  isActive: boolean;
  soldCount: number;
  items: { menuItem: { id: string; name: string; price: number }; quantity: number }[];
}

interface Coupon {
  id: string;
  code: string;
  name: string;
  discountType: string;
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  currentUsage: number;
  usageLimit?: number;
}


type TabType = 'loyalty' | 'customers' | 'campaigns' | 'bundles' | 'coupons';

export default function CampaignsLoyalty() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('loyalty');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [bundles, setBundles] = useState<BundleDeal[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  
  // Modal states
  const [showTierModal, setShowTierModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showBundleModal, setShowBundleModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  
  // Search
  const [customerSearch, setCustomerSearch] = useState('');

  // Stats
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    totalPointsIssued: 0,
    activeCampaigns: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tiersRes, customersRes, campaignsRes, bundlesRes, couponsRes, menuRes] = await Promise.all([
        api.get('/api/loyalty/tiers', token!),
        api.get('/api/loyalty/customers', token!),
        api.get('/api/campaigns', token!),
        api.get('/api/bundles', token!),
        api.get('/api/coupons', token!),
        api.get('/api/menu', token!),
      ]);

      setTiers(tiersRes.tiers || getDefaultTiers());
      setCustomers(customersRes.customers || []);
      setCampaigns(campaignsRes.campaigns || []);
      setBundles(bundlesRes.bundles || []);
      setCoupons(couponsRes.coupons || []);
      setMenuItems(menuRes.items || []);

      // Calculate stats
      const customerList = customersRes.customers || [];
      setStats({
        totalCustomers: customerList.length,
        activeCustomers: customerList.filter((c: Customer) => c.orderCount > 0).length,
        totalPointsIssued: customerList.reduce((sum: number, c: Customer) => sum + c.lifetimePoints, 0),
        activeCampaigns: (campaignsRes.campaigns || []).filter((c: Campaign) => c.isActive).length,
      });
    } catch (error) {
      console.error('Fetch error:', error);
      // Set default tiers if API fails
      setTiers(getDefaultTiers());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultTiers = (): LoyaltyTier[] => [
    { id: '1', name: 'Bronze', minPoints: 0, pointsMultiplier: 1, discountPercent: 0, benefits: ['Her 10₺ = 1 puan'], color: '#CD7F32', icon: '🥉' },
    { id: '2', name: 'Silver', minPoints: 500, pointsMultiplier: 1.25, discountPercent: 5, benefits: ['%5 indirim', '1.25x puan'], color: '#C0C0C0', icon: '🥈' },
    { id: '3', name: 'Gold', minPoints: 1500, pointsMultiplier: 1.5, discountPercent: 10, benefits: ['%10 indirim', '1.5x puan', 'Öncelikli destek'], color: '#FFD700', icon: '🥇' },
    { id: '4', name: 'Platinum', minPoints: 5000, pointsMultiplier: 2, discountPercent: 15, benefits: ['%15 indirim', '2x puan', 'VIP ayrıcalıklar'], color: '#E5E4E2', icon: '👑' },
  ];

  const filteredCustomers = customers.filter(c => 
    c.phone?.includes(customerSearch) ||
    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const formatCurrency = (amount: number) => `₺${amount.toLocaleString('tr-TR')}`;

  const tabs: { id: TabType; label: string; icon: React.ReactNode; emoji: string }[] = [
    { id: 'loyalty', label: 'Sadakat Seviyeleri', icon: <Crown />, emoji: '👑' },
    { id: 'customers', label: 'Üyeler', icon: <Users />, emoji: '👥' },
    { id: 'campaigns', label: 'Kampanyalar', icon: <Gift />, emoji: '🎁' },
    { id: 'bundles', label: 'Paket Menüler', icon: <Package />, emoji: '📦' },
    { id: 'coupons', label: 'Kuponlar', icon: <Tag />, emoji: '🎟️' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="text-5xl">
          🎯
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-4xl">🎯</span>
            Kampanyalar & Sadakat Programı
          </h1>
          <p className="text-gray-500 mt-1">Müşteri sadakat programı ve kampanya yönetimi</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div whileHover={{ y: -4 }} className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <Users className="w-8 h-8 opacity-80" />
            <span className="text-3xl">👥</span>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.totalCustomers}</p>
          <p className="text-blue-100 text-sm">Toplam Üye</p>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <TrendingUp className="w-8 h-8 opacity-80" />
            <span className="text-3xl">✨</span>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.activeCustomers}</p>
          <p className="text-green-100 text-sm">Aktif Üye</p>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <Star className="w-8 h-8 opacity-80" />
            <span className="text-3xl">⭐</span>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.totalPointsIssued.toLocaleString()}</p>
          <p className="text-purple-100 text-sm">Dağıtılan Puan</p>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <Gift className="w-8 h-8 opacity-80" />
            <span className="text-3xl">🎁</span>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.activeCampaigns}</p>
          <p className="text-orange-100 text-sm">Aktif Kampanya</p>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="text-xl">{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Loyalty Tiers Tab */}
          {activeTab === 'loyalty' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Sadakat Seviyeleri</h2>
                <button onClick={() => setShowTierModal(true)} className="btn btn-primary flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Seviye Ekle
                </button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {tiers.map((tier, index) => (
                  <motion.div
                    key={tier.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-2xl p-6 shadow-sm border-2 hover:shadow-lg transition-shadow"
                    style={{ borderColor: tier.color }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-4xl">{tier.icon}</span>
                      <div
                        className="px-3 py-1 rounded-full text-white text-sm font-bold"
                        style={{ backgroundColor: tier.color }}
                      >
                        {tier.name}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Min. Puan</span>
                        <span className="font-bold">{tier.minPoints.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Puan Çarpanı</span>
                        <span className="font-bold text-green-600">{tier.pointsMultiplier}x</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Sabit İndirim</span>
                        <span className="font-bold text-red-600">%{tier.discountPercent}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-2">Avantajlar:</p>
                      <ul className="space-y-1">
                        {tier.benefits.map((benefit, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                            <Check className="w-3 h-3 text-green-500" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* How it works */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 mt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-2xl">💡</span>
                  Nasıl Çalışır?
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">1</div>
                    <div>
                      <p className="font-medium text-gray-900">Üye Ol</p>
                      <p className="text-sm text-gray-600">Müşteri telefon numarasıyla üye olur</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">2</div>
                    <div>
                      <p className="font-medium text-gray-900">Puan Kazan</p>
                      <p className="text-sm text-gray-600">Her 10₺ harcamada 1 puan</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">3</div>
                    <div>
                      <p className="font-medium text-gray-900">Harca</p>
                      <p className="text-sm text-gray-600">100 puan = 10₺ indirim</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Customers Tab */}
          {activeTab === 'customers' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Üyeler ({customers.length})</h2>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Üye ara..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-10 pr-4 py-2 border rounded-lg w-64"
                    />
                  </div>
                </div>
              </div>

              {filteredCustomers.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <span className="text-6xl">👥</span>
                  <p className="text-gray-500 mt-4">Henüz üye yok</p>
                  <p className="text-gray-400 text-sm">Müşteriler sipariş verirken üye olabilir</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Üye</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Seviye</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Puan</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Harcama</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Sipariş</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Son Sipariş</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredCustomers.map((customer) => (
                        <tr key={customer.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <div>
                              <p className="font-medium text-gray-900">{customer.name || 'İsimsiz'}</p>
                              <p className="text-sm text-gray-500">{customer.phone}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className="px-3 py-1 rounded-full text-white text-xs font-bold"
                              style={{ backgroundColor: customer.loyaltyTier?.color || '#CD7F32' }}
                            >
                              {customer.loyaltyTier?.icon} {customer.loyaltyTier?.name || 'Bronze'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="font-bold text-purple-600">{customer.totalPoints}</span>
                          </td>
                          <td className="px-4 py-4 text-right font-medium">
                            {formatCurrency(Number(customer.totalSpent))}
                          </td>
                          <td className="px-4 py-4 text-right text-gray-600">{customer.orderCount}</td>
                          <td className="px-4 py-4 text-right text-gray-500 text-sm">
                            {customer.lastOrderAt
                              ? new Date(customer.lastOrderAt).toLocaleDateString('tr-TR')
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Campaigns Tab */}
          {activeTab === 'campaigns' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">İndirim Kampanyaları</h2>
                <button onClick={() => setShowCampaignModal(true)} className="btn btn-primary flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Kampanya Oluştur
                </button>
              </div>

              {campaigns.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <span className="text-6xl">🎁</span>
                  <p className="text-gray-500 mt-4">Henüz kampanya yok</p>
                  <button onClick={() => setShowCampaignModal(true)} className="btn btn-primary mt-4">
                    İlk Kampanyayı Oluştur
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {campaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className={`bg-white rounded-xl p-6 shadow-sm border-2 ${
                        campaign.isActive ? 'border-green-200' : 'border-gray-100'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900">{campaign.name}</h3>
                            {campaign.isActive ? (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Aktif</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">Pasif</span>
                            )}
                          </div>
                          <p className="text-gray-500 text-sm mt-1">{campaign.description}</p>
                          <div className="flex gap-4 mt-3 text-sm text-gray-600">
                            <span>📅 {new Date(campaign.startDate).toLocaleDateString('tr-TR')} - {new Date(campaign.endDate).toLocaleDateString('tr-TR')}</span>
                            {campaign.discountValue && (
                              <span className="text-red-600 font-medium">
                                {campaign.discountType === 'PERCENT' ? `%${campaign.discountValue}` : `₺${campaign.discountValue}`} indirim
                              </span>
                            )}
                            {campaign.usageLimit && (
                              <span>{campaign.currentUsage}/{campaign.usageLimit} kullanım</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button className="p-2 hover:bg-gray-100 rounded-lg">
                            <Edit2 className="w-4 h-4 text-gray-500" />
                          </button>
                          <button className="p-2 hover:bg-red-100 rounded-lg">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bundles Tab */}
          {activeTab === 'bundles' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Paket Menüler / Combo</h2>
                <button onClick={() => setShowBundleModal(true)} className="btn btn-primary flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Paket Oluştur
                </button>
              </div>

              {bundles.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <span className="text-6xl">📦</span>
                  <p className="text-gray-500 mt-4">Henüz paket menü yok</p>
                  <button onClick={() => setShowBundleModal(true)} className="btn btn-primary mt-4">
                    İlk Paketi Oluştur
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bundles.map((bundle) => (
                    <motion.div
                      key={bundle.id}
                      whileHover={{ y: -4 }}
                      className="bg-white rounded-xl overflow-hidden shadow-sm"
                    >
                      {bundle.image && (
                        <img src={bundle.image} alt={bundle.name} className="w-full h-40 object-cover" />
                      )}
                      <div className="p-4">
                        <h3 className="font-bold text-gray-900">{bundle.name}</h3>
                        <p className="text-gray-500 text-sm">{bundle.description}</p>
                        <div className="mt-3 space-y-1">
                          {bundle.items.map((item, i) => (
                            <div key={i} className="text-sm text-gray-600 flex justify-between">
                              <span>{item.quantity}x {item.menuItem.name}</span>
                              <span className="text-gray-400">{formatCurrency(item.menuItem.price)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-end justify-between">
                          <div>
                            <p className="text-gray-400 line-through text-sm">{formatCurrency(bundle.originalPrice)}</p>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(bundle.bundlePrice)}</p>
                          </div>
                          <div className="text-right">
                            <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-sm font-bold">
                              {formatCurrency(bundle.savings)} Tasarruf
                            </span>
                            <p className="text-xs text-gray-400 mt-1">{bundle.soldCount} satış</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Coupons Tab */}
          {activeTab === 'coupons' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Kupon Kodları</h2>
                <button onClick={() => setShowCouponModal(true)} className="btn btn-primary flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Kupon Oluştur
                </button>
              </div>

              {coupons.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <span className="text-6xl">🎟️</span>
                  <p className="text-gray-500 mt-4">Henüz kupon yok</p>
                  <button onClick={() => setShowCouponModal(true)} className="btn btn-primary mt-4">
                    İlk Kuponu Oluştur
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {coupons.map((coupon) => (
                    <div
                      key={coupon.id}
                      className={`bg-white rounded-xl p-4 shadow-sm border-2 ${
                        coupon.isActive ? 'border-purple-200' : 'border-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl">🎟️</span>
                        {coupon.isActive ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Aktif</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">Pasif</span>
                        )}
                      </div>
                      <div className="bg-gray-100 rounded-lg p-2 text-center mb-3">
                        <code className="text-lg font-mono font-bold text-purple-600">{coupon.code}</code>
                      </div>
                      <h3 className="font-medium text-gray-900">{coupon.name}</h3>
                      <p className="text-red-600 font-bold mt-1">
                        {coupon.discountType === 'PERCENT' ? `%${coupon.discountValue}` : `₺${coupon.discountValue}`} İndirim
                      </p>
                      <div className="text-xs text-gray-500 mt-2 space-y-1">
                        <p>📅 {new Date(coupon.startDate).toLocaleDateString('tr-TR')} - {new Date(coupon.endDate).toLocaleDateString('tr-TR')}</p>
                        {coupon.usageLimit && (
                          <p>📊 {coupon.currentUsage}/{coupon.usageLimit} kullanım</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Campaign Modal */}
      <CampaignModal 
        show={showCampaignModal} 
        onClose={() => setShowCampaignModal(false)} 
        onSave={fetchData}
        token={token!}
      />

      {/* Bundle Modal */}
      <BundleModal 
        show={showBundleModal} 
        onClose={() => setShowBundleModal(false)} 
        onSave={fetchData}
        menuItems={menuItems}
        token={token!}
      />

      {/* Coupon Modal */}
      <CouponModal 
        show={showCouponModal} 
        onClose={() => setShowCouponModal(false)} 
        onSave={fetchData}
        token={token!}
      />
    </div>
  );
}

// Campaign Modal Component
function CampaignModal({ show, onClose, onSave, token }: { show: boolean; onClose: () => void; onSave: () => void; token: string }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'DISCOUNT',
    discountType: 'PERCENT',
    discountValue: 10,
    minPurchase: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const handleSubmit = async () => {
    try {
      await api.post('/api/campaigns', form, token);
      onSave();
      onClose();
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl p-6 max-w-md w-full"
      >
        <h2 className="text-xl font-bold mb-4">🎁 Yeni Kampanya</h2>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Kampanya adı"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input w-full"
          />
          <textarea
            placeholder="Açıklama"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input w-full"
            rows={2}
          />
          <div className="grid grid-cols-2 gap-4">
            <select
              value={form.discountType}
              onChange={(e) => setForm({ ...form, discountType: e.target.value })}
              className="input"
            >
              <option value="PERCENT">% İndirim</option>
              <option value="FIXED">₺ İndirim</option>
            </select>
            <input
              type="number"
              placeholder="Değer"
              value={form.discountValue}
              onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
              className="input"
            />
          </div>
          <input
            type="number"
            placeholder="Min. sepet tutarı (₺)"
            value={form.minPurchase}
            onChange={(e) => setForm({ ...form, minPurchase: Number(e.target.value) })}
            className="input w-full"
          />
          <div className="grid grid-cols-2 gap-4">
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="input"
            />
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="input"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn btn-secondary flex-1">İptal</button>
          <button onClick={handleSubmit} className="btn btn-primary flex-1">Oluştur</button>
        </div>
      </motion.div>
    </div>
  );
}

// Bundle Modal Component
function BundleModal({ show, onClose, onSave, menuItems, token }: { show: boolean; onClose: () => void; onSave: () => void; menuItems: any[]; token: string }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    bundlePrice: 0,
    items: [] as { menuItemId: string; quantity: number }[],
  });

  const addItem = (menuItemId: string) => {
    if (!form.items.find((i) => i.menuItemId === menuItemId)) {
      setForm({ ...form, items: [...form.items, { menuItemId, quantity: 1 }] });
    }
  };

  const originalPrice = form.items.reduce((sum, item) => {
    const menuItem = menuItems.find((m) => m.id === item.menuItemId);
    return sum + (menuItem ? Number(menuItem.price) * item.quantity : 0);
  }, 0);

  const handleSubmit = async () => {
    try {
      await api.post('/api/bundles', {
        ...form,
        originalPrice,
        savings: originalPrice - form.bundlePrice,
      }, token);
      onSave();
      onClose();
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-xl font-bold mb-4">📦 Yeni Paket Menü</h2>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Paket adı (örn: Aile Menüsü)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input w-full"
          />
          <textarea
            placeholder="Açıklama"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input w-full"
            rows={2}
          />

          <div>
            <label className="block text-sm font-medium mb-2">Ürünler</label>
            <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addItem(item.id)}
                  className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm flex justify-between ${
                    form.items.find((i) => i.menuItemId === item.id) ? 'bg-purple-50' : ''
                  }`}
                >
                  <span>{item.name}</span>
                  <span className="text-gray-500">₺{item.price}</span>
                </button>
              ))}
            </div>
          </div>

          {form.items.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-medium mb-2">Seçilen Ürünler:</p>
              {form.items.map((item, i) => {
                const menuItem = menuItems.find((m) => m.id === item.menuItemId);
                return (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{menuItem?.name}</span>
                    <span>₺{menuItem?.price}</span>
                  </div>
                );
              })}
              <div className="border-t mt-2 pt-2 font-medium flex justify-between">
                <span>Normal Toplam:</span>
                <span>₺{originalPrice}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Paket Fiyatı</label>
            <input
              type="number"
              value={form.bundlePrice}
              onChange={(e) => setForm({ ...form, bundlePrice: Number(e.target.value) })}
              className="input w-full"
            />
            {form.bundlePrice > 0 && originalPrice > form.bundlePrice && (
              <p className="text-green-600 text-sm mt-1">
                ₺{originalPrice - form.bundlePrice} tasarruf!
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn btn-secondary flex-1">İptal</button>
          <button onClick={handleSubmit} className="btn btn-primary flex-1">Oluştur</button>
        </div>
      </motion.div>
    </div>
  );
}

// Coupon Modal Component
function CouponModal({ show, onClose, onSave, token }: { show: boolean; onClose: () => void; onSave: () => void; token: string }) {
  const [form, setForm] = useState({
    code: '',
    name: '',
    discountType: 'PERCENT',
    discountValue: 10,
    minPurchase: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    usageLimit: 100,
  });

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm({ ...form, code });
  };

  const handleSubmit = async () => {
    try {
      await api.post('/api/coupons', form, token);
      onSave();
      onClose();
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl p-6 max-w-md w-full"
      >
        <h2 className="text-xl font-bold mb-4">🎟️ Yeni Kupon</h2>
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Kupon kodu (örn: YENI2024)"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="input flex-1 font-mono"
            />
            <button onClick={generateCode} className="btn btn-secondary">Rastgele</button>
          </div>
          <input
            type="text"
            placeholder="Kupon adı"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input w-full"
          />
          <div className="grid grid-cols-2 gap-4">
            <select
              value={form.discountType}
              onChange={(e) => setForm({ ...form, discountType: e.target.value })}
              className="input"
            >
              <option value="PERCENT">% İndirim</option>
              <option value="FIXED">₺ İndirim</option>
            </select>
            <input
              type="number"
              placeholder="Değer"
              value={form.discountValue}
              onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
              className="input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              placeholder="Min. sepet (₺)"
              value={form.minPurchase}
              onChange={(e) => setForm({ ...form, minPurchase: Number(e.target.value) })}
              className="input"
            />
            <input
              type="number"
              placeholder="Kullanım limiti"
              value={form.usageLimit}
              onChange={(e) => setForm({ ...form, usageLimit: Number(e.target.value) })}
              className="input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="input"
            />
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="input"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn btn-secondary flex-1">İptal</button>
          <button onClick={handleSubmit} className="btn btn-primary flex-1">Oluştur</button>
        </div>
      </motion.div>
    </div>
  );
}

