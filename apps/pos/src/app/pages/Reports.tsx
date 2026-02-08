import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Clock,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface DailyReport {
  date: string;
  summary: {
    totalOrders: number;
    totalRevenue: number;
    totalTips: number;
    cashAmount: number;
    cardAmount: number;
    otherAmount: number;
    cancelledOrders: number;
    avgOrderTime?: number;
  };
  topItems: { id: string; name: string; count: number; revenue: number }[];
  hourlyBreakdown: Record<number, { orders: number; revenue: number }>;
}

export default function Reports() {
  const { token } = useAuth();
  const [report, setReport] = useState<DailyReport | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);

  const downloadReport = () => {
    if (!report) return;

    const reportData = {
      tarih: report.date,
      ozet: {
        toplamSiparis: report.summary.totalOrders,
        toplamCiro: report.summary.totalRevenue,
        nakit: report.summary.cashAmount,
        kart: report.summary.cardAmount,
        diger: report.summary.otherAmount,
        iptalSiparis: report.summary.cancelledOrders,
        ortHazirlamaSuresi: report.summary.avgOrderTime,
      },
      enCokSatanlar: report.topItems,
      saatlikDagilim: report.hourlyBreakdown,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapor-${selectedDate}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchReport();
  }, [selectedDate]);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/api/reports/daily?date=${selectedDate}`, token!);
      setReport(response);
    } catch (error) {
      console.error('Report fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
          <h1 className="text-2xl font-bold text-gray-900">Raporlar</h1>
          <p className="text-gray-500">Günlük satış ve performans verileri</p>
        </div>
        <button 
          onClick={downloadReport}
          disabled={!report}
          className="btn btn-secondary flex items-center gap-2 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Rapor İndir
        </button>
      </div>

      {/* Date selector */}
      <div className="card">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeDate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="text-center">
            <div className="flex items-center gap-2 justify-center">
              <Calendar className="w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-lg font-semibold bg-transparent border-none focus:outline-none text-center"
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">{formatDate(selectedDate)}</p>
          </div>
          
          <button
            onClick={() => changeDate(1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
            disabled={selectedDate >= new Date().toISOString().split('T')[0]}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Toplam Ciro</p>
              <p className="text-2xl font-bold text-gray-900">
                {report?.summary.totalRevenue.toLocaleString('tr-TR')} ₺
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Toplam Sipariş</p>
              <p className="text-2xl font-bold text-gray-900">
                {report?.summary.totalOrders}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Ortalama Sipariş</p>
              <p className="text-2xl font-bold text-gray-900">
                {report?.summary.totalOrders
                  ? Math.round(report.summary.totalRevenue / report.summary.totalOrders).toLocaleString('tr-TR')
                  : 0} ₺
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Ort. Hazırlık Süresi</p>
              <p className="text-2xl font-bold text-gray-900">
                {report?.summary.avgOrderTime || '-'} dk
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment breakdown */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Ödeme Dağılımı</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Nakit</span>
              </div>
              <span className="font-medium">
                {report?.summary.cashAmount.toLocaleString('tr-TR')} ₺
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Kredi Kartı</span>
              </div>
              <span className="font-medium">
                {report?.summary.cardAmount.toLocaleString('tr-TR')} ₺
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span>Diğer</span>
              </div>
              <span className="font-medium">
                {report?.summary.otherAmount.toLocaleString('tr-TR')} ₺
              </span>
            </div>
          </div>

          {/* Progress bars */}
          <div className="mt-4 h-4 bg-gray-100 rounded-full overflow-hidden flex">
            {report && report.summary.totalRevenue > 0 && (
              <>
                <div
                  className="bg-green-500"
                  style={{
                    width: `${(report.summary.cashAmount / report.summary.totalRevenue) * 100}%`,
                  }}
                />
                <div
                  className="bg-blue-500"
                  style={{
                    width: `${(report.summary.cardAmount / report.summary.totalRevenue) * 100}%`,
                  }}
                />
                <div
                  className="bg-purple-500"
                  style={{
                    width: `${(report.summary.otherAmount / report.summary.totalRevenue) * 100}%`,
                  }}
                />
              </>
            )}
          </div>
        </div>

        {/* Top selling items */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">En Çok Satanlar</h2>
          {report?.topItems.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Veri yok</p>
          ) : (
            <div className="space-y-3">
              {report?.topItems.slice(0, 5).map((item, index) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-gray-100 text-gray-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-50 text-gray-500'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{item.count} adet</p>
                    <p className="text-xs text-gray-500">
                      {item.revenue.toLocaleString('tr-TR')} ₺
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hourly breakdown */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Saatlik Dağılım</h2>
        <div className="overflow-x-auto">
          <div className="min-w-[800px] h-48 flex items-end gap-1">
            {report &&
              Object.entries(report.hourlyBreakdown).map(([hour, data]) => {
                const maxRevenue = Math.max(
                  ...Object.values(report.hourlyBreakdown).map((d) => d.revenue)
                );
                const height = maxRevenue > 0 ? (data.revenue / maxRevenue) * 100 : 0;
                
                return (
                  <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t transition-all ${
                        data.orders > 0 ? 'bg-primary-500' : 'bg-gray-200'
                      }`}
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`${data.orders} sipariş - ${data.revenue.toLocaleString('tr-TR')} ₺`}
                    />
                    <span className="text-xs text-gray-500">{hour}:00</span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}

