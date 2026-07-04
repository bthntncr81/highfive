import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Clock,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Copy,
  ExternalLink,
  X,
  Wallet,
  PiggyBank,
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
    totalExpenses?: number;
    netProfit?: number;
  };
  topItems: { id: string; name: string; count: number; revenue: number }[];
  hourlyBreakdown: Record<number, { orders: number; revenue: number }>;
  expensesByCategory?: { name: string; amount: number; icon?: string | null; color?: string | null }[];
}

export default function Reports() {
  const { token } = useAuth();
  const [report, setReport] = useState<DailyReport | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);

  // AI-prompt modal state. The prompt assembles month + daily-context numbers
  // into a Turkish-language brief tailored for Gemini/ChatGPT to return
  // restaurant-specific recommendations.
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBuilding, setAiBuilding] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiCopied, setAiCopied] = useState(false);
  const today = new Date();
  const [aiYear, setAiYear] = useState(today.getFullYear());
  const [aiMonth, setAiMonth] = useState(today.getMonth() + 1);

  const buildAiPrompt = async () => {
    setAiBuilding(true);
    setAiError('');
    setAiCopied(false);
    try {
      const monthly = await api.get(
        `/api/reports/monthly?year=${aiYear}&month=${aiMonth}&detailed=true`,
        token!,
      );
      const tl = (n: number) => `${Math.round(Number(n || 0)).toLocaleString('tr-TR')} ₺`;

      const monthLabel = new Date(aiYear, aiMonth - 1, 1).toLocaleDateString('tr-TR', {
        year: 'numeric', month: 'long',
      });

      const lines: string[] = [];
      lines.push(`Sen deneyimli bir restoran/F&B operasyon danışmanısın. Aşağıda ${monthLabel} ayına ait POS verileri var (gün gün, saatlik kırılımlı). Bu verilere bakarak özet bir analiz çıkar ve uygulanabilir, somut öneriler ver.`);
      lines.push('');

      lines.push(`## ${monthLabel} — Aylık Özet`);
      lines.push(`- Toplam tamamlanmış sipariş: ${monthly?.summary?.totalOrders ?? 0}`);
      lines.push(`- Toplam ciro: ${tl(monthly?.summary?.totalRevenue)}`);
      lines.push(`- Toplam gider: ${tl(monthly?.summary?.totalExpenses)}`);
      const netP = Number(monthly?.summary?.netProfit ?? 0);
      const totRev = Number(monthly?.summary?.totalRevenue ?? 0);
      lines.push(`- **Net kâr (ciro − gider): ${tl(netP)}**`);
      lines.push(`- Kâr marjı: ${totRev > 0 ? ((netP / totRev) * 100).toFixed(1) : 0}%`);
      lines.push(`- Günlük ortalama sipariş: ${monthly?.summary?.avgDailyOrders ?? 0}`);
      lines.push(`- Günlük ortalama ciro: ${tl(monthly?.summary?.avgDailyRevenue)}`);
      lines.push(`- Aydaki gün sayısı: ${monthly?.summary?.daysInMonth ?? '-'}`);
      lines.push('');

      const cats = Array.isArray(monthly?.categoryBreakdown) ? monthly.categoryBreakdown : [];
      if (cats.length > 0) {
        lines.push('## Kategori Dağılımı (ciroya göre azalan)');
        for (const c of cats) {
          lines.push(`- ${c.name}: ${c.orders} adet • ${tl(c.revenue)}`);
        }
        lines.push('');
      }

      const expCats = Array.isArray(monthly?.expenseBreakdown) ? monthly.expenseBreakdown : [];
      if (expCats.length > 0) {
        lines.push('## Gider Dağılımı (kategoriye göre azalan)');
        for (const c of expCats) {
          lines.push(`- ${c.name}: ${c.count} kalem • ${tl(c.amount)}`);
        }
        lines.push('');
      }

      const daily: any[] = Array.isArray(monthly?.dailyBreakdown) ? monthly.dailyBreakdown : [];
      if (daily.length > 0) {
        lines.push('## Günlük Detay (her gün ayrı blok)');
        for (const d of daily) {
          const dateLabel = new Date(d.date).toLocaleDateString('tr-TR', {
            day: '2-digit', month: 'short', weekday: 'short',
          });
          lines.push('');
          lines.push(`### ${dateLabel} — ${d.date}`);
          if (d.orders === 0) {
            lines.push('- Bu gün sipariş yok.');
            continue;
          }
          lines.push(`- Sipariş: ${d.orders} • Ciro: ${tl(d.revenue)} • İptal: ${d.cancelled || 0}`);
          lines.push(`- Ödeme: nakit ${tl(d.cashAmount)} • kart ${tl(d.cardAmount)} • diğer ${tl(d.otherAmount)}`);
          if (typeof d.expenses === 'number' && d.expenses > 0) {
            lines.push(`- Gider: ${tl(d.expenses)} • Net: ${tl((d.netProfit ?? (d.revenue - d.expenses)))}`);
          }
          if (d.topItems?.length) {
            lines.push(`- En çok satan ürünler:`);
            for (const t of d.topItems) {
              lines.push(`  · ${t.name} → ${t.count} adet, ${tl(t.revenue)}`);
            }
          }
          const hours = d.hourly ? Object.entries(d.hourly).map(([h, v]) => ({ hour: Number(h), ...(v as any) })) : [];
          if (hours.length) {
            hours.sort((a: any, b: any) => a.hour - b.hour);
            lines.push(`- Saatlik dağılım:`);
            for (const e of hours as any[]) {
              lines.push(`  · ${String(e.hour).padStart(2, '0')}:00 → ${e.orders} sipariş, ${tl(e.revenue)}`);
            }
          }
        }
        lines.push('');
      }

      lines.push('## Senden Beklenen Çıktı');
      lines.push('1. **Kısa Yönetici Özeti** (3-4 cümle): Bu ay genel performans nasıl?');
      lines.push('2. **Güçlü Yönler**: Verilerin gösterdiği 3 olumlu nokta.');
      lines.push('3. **Zayıf / Riskli Alanlar**: Müdahale gerektiren 3 nokta (ör. düşük ciro saatleri, çok satılmayan kategoriler, iptal oranı, yavaş günler).');
      lines.push('4. **Gün/Saat Bazlı İçgörüler**: En yoğun ve en sönük gün/saat dilimleri; haftanın günlerinde örüntüler. Hangi günü hangi saatte hangi aksiyon?');
      lines.push('5. **Aksiyon Önerileri**: 5 somut öneri — her biri için *neden* + *uygulama yolu* + *beklenen etki*. Genel tavsiye değil, bu restorana özel ve veriye dayalı.');
      lines.push('6. **KPI Hedefi**: Gelecek ay için 3 ölçülebilir hedef (ör. günlük ortalama ciroda %X artış, peak hour\'da Y sipariş, iptal oranı %Z altı).');
      lines.push('7. **Kâr/Gider Analizi**: Hangi gider kategorilerinde tasarruf imkânı var? Net kâr marjını artırmak için 2-3 alan ve uygulanabilir öneri.');
      lines.push('');
      lines.push('Türkçe yaz. Madde madde, net ve uygulanabilir ol. Belirsiz "iletişim güçlendirilebilir" gibi cümlelerden kaçın — somut rakam, gün adı, saat dilimi ve aksiyon ver.');

      setAiPrompt(lines.join('\n'));
    } catch (e: any) {
      setAiError(e?.message || 'Veri çekilemedi');
    } finally {
      setAiBuilding(false);
    }
  };

  const copyAiPrompt = async () => {
    try {
      await navigator.clipboard.writeText(aiPrompt);
      setAiCopied(true);
      setTimeout(() => setAiCopied(false), 2500);
    } catch { /* ignore */ }
  };

  const openInGemini = () => {
    // Gemini's web UI accepts a URL-encoded prompt query (best-effort).
    // Some browsers truncate very long URLs; if it fails the user can still
    // copy the prompt manually via the Kopyala button.
    const u = `https://gemini.google.com/app?q=${encodeURIComponent(aiPrompt)}`;
    window.open(u, '_blank', 'noopener');
  };

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setAiOpen(true); setAiPrompt(''); setAiError(''); }}
            className="btn flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-md"
          >
            <Sparkles className="w-4 h-4" />
            Yapay Zeka Önerisi
          </button>
          <button
            onClick={downloadReport}
            disabled={!report}
            className="btn btn-secondary flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Rapor İndir
          </button>
        </div>
      </div>

      {/* AI prompt modal */}
      {aiOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold">Yapay Zeka Önerisi için Prompt</h2>
              </div>
              <button onClick={() => setAiOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
              <p className="text-sm text-gray-600">
                Aylık satış verileri + son haftanın özeti + bugünün detayı bir araya getirilip Gemini/ChatGPT'ye verilebilecek hazır bir prompt'a dönüşür. Prompt'u <b>Kopyala</b>'ya basıp herhangi bir AI'a yapıştırabilirsin.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yıl</label>
                  <input
                    type="number" min={2024} max={today.getFullYear()}
                    value={aiYear}
                    onChange={(e) => setAiYear(Number(e.target.value))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ay</label>
                  <select
                    value={aiMonth}
                    onChange={(e) => setAiMonth(Number(e.target.value))}
                    className="input"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {new Date(2024, m - 1, 1).toLocaleDateString('tr-TR', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={buildAiPrompt}
                  disabled={aiBuilding}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {aiBuilding ? 'Hazırlanıyor…' : 'Prompt Oluştur'}
                </button>
                {aiPrompt && (
                  <>
                    <button
                      onClick={copyAiPrompt}
                      className="btn btn-secondary flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      {aiCopied ? '✓ Kopyalandı' : 'Kopyala'}
                    </button>
                    <button
                      onClick={openInGemini}
                      className="btn btn-secondary flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Gemini'de Aç
                    </button>
                  </>
                )}
              </div>

              {aiError && (
                <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  ⚠️ {aiError}
                </div>
              )}

              {aiPrompt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Oluşturulan prompt</label>
                  <textarea
                    value={aiPrompt}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono text-xs bg-gray-50"
                    rows={18}
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
            <div className="p-3 bg-red-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Toplam Gider</p>
              <p className="text-2xl font-bold text-gray-900">
                {(report?.summary.totalExpenses ?? 0).toLocaleString('tr-TR')} ₺
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div
              className="p-3 rounded-lg"
              style={{
                backgroundColor: (report?.summary.netProfit ?? 0) >= 0 ? '#d1fae5' : '#fee2e2',
              }}
            >
              <PiggyBank
                className="w-6 h-6"
                style={{ color: (report?.summary.netProfit ?? 0) >= 0 ? '#059669' : '#dc2626' }}
              />
            </div>
            <div>
              <p className="text-sm text-gray-500">Net Kâr</p>
              <p
                className="text-2xl font-bold"
                style={{ color: (report?.summary.netProfit ?? 0) >= 0 ? '#047857' : '#b91c1c' }}
              >
                {(report?.summary.netProfit ?? 0).toLocaleString('tr-TR')} ₺
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
              <p className="text-sm text-gray-500">Ort. Hazırlık</p>
              <p className="text-2xl font-bold text-gray-900">
                {report?.summary.avgOrderTime || '-'} dk
              </p>
            </div>
          </div>
        </div>

        {/* Kâr marjı bilgi kartı (ciro > 0 ise) */}
        {report?.summary.totalRevenue && report.summary.totalRevenue > 0 && (
          <div className="card md:col-span-2">
            <div className="flex items-center gap-4">
              <div
                className="p-3 rounded-lg"
                style={{
                  backgroundColor: (report.summary.netProfit ?? 0) >= 0 ? '#ecfdf5' : '#fef2f2',
                }}
              >
                <Wallet
                  className="w-6 h-6"
                  style={{ color: (report.summary.netProfit ?? 0) >= 0 ? '#059669' : '#dc2626' }}
                />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Kâr Marjı (Net Kâr ÷ Ciro)</p>
                <div className="flex items-baseline gap-3">
                  <p
                    className="text-2xl font-bold"
                    style={{ color: (report.summary.netProfit ?? 0) >= 0 ? '#047857' : '#b91c1c' }}
                  >
                    {(((report.summary.netProfit ?? 0) / report.summary.totalRevenue) * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {(report.summary.totalRevenue - (report.summary.totalExpenses ?? 0)).toLocaleString('tr-TR')} ₺ /{' '}
                    {report.summary.totalRevenue.toLocaleString('tr-TR')} ₺
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
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

