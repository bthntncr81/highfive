import { motion } from 'framer-motion'

export const DistanceSales = () => {
  return (
    <main className="min-h-screen bg-white">
      <div className="bg-primary py-12 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white">Mesafeli Satış Sözleşmesi</h1>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="prose prose-lg text-gray-700 space-y-6">

          <h2 className="text-xl font-bold text-gray-900">1. Taraflar</h2>
          <p><strong>SATICI:</strong><br />
          Ticari Unvanı: High Five Pizza & Makarna<br />
          Adres: Cumhuriyet Mahallesi, İstanbul Caddesi No 151/1, Akçakoca, Düzce<br />
          Telefon: 0555 243 81 81<br />
          Web Sitesi: highfivepps.com</p>
          <p><strong>ALICI:</strong> Sipariş veren kişi.</p>

          <h2 className="text-xl font-bold text-gray-900">2. Sözleşmenin Konusu</h2>
          <p>İşbu sözleşme, ALICI'nın SATICI'ya ait highfivepps.com web sitesi üzerinden elektronik ortamda sipariş verdiği ürünlerin satışı ve teslimatına ilişkin 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri gereğince tarafların hak ve yükümlülüklerini düzenler.</p>

          <h2 className="text-xl font-bold text-gray-900">3. Ürün Bilgileri</h2>
          <p>Sipariş edilen ürünlerin türü, adedi, fiyatı ve teslimat bilgileri sipariş özeti sayfasında belirtilmektedir. Ürün fiyatlarına KDV dahildir.</p>

          <h2 className="text-xl font-bold text-gray-900">4. Genel Hükümler</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>ALICI, sipariş verdiği ürünlerin temel nitelikleri, fiyatı ve ödeme şekli ile teslimat koşullarını kabul etmiş sayılır.</li>
            <li>Sipariş onayı, ödemenin tahsili ile birlikte gerçekleşir.</li>
            <li>SATICI, siparişi kabul edip etmeme hakkını saklı tutar.</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900">5. Teslimat</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Ürünler, ALICI'nın belirttiği adrese teslim edilir.</li>
            <li>Tahmini teslimat süresi 30-45 dakikadır.</li>
            <li>Mücbir sebepler nedeniyle teslimat gecikebilir.</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900">6. Cayma Hakkı</h2>
          <p>Gıda ürünleri, 6502 sayılı Kanun'un 15. maddesi ve Mesafeli Sözleşmeler Yönetmeliği'nin 15/g maddesi gereğince cayma hakkı kapsamı dışındadır. Ancak SATICI, hazırlanmamış siparişlerde iptal talebini değerlendirebilir.</p>

          <h2 className="text-xl font-bold text-gray-900">7. Ödeme</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Ödemeler iyzico 3D Secure güvenli ödeme altyapısı üzerinden kredi/banka kartı ile veya kapıda nakit olarak yapılabilir.</li>
            <li>Kart bilgileri SATICI tarafında saklanmaz.</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900">8. Uyuşmazlık Çözümü</h2>
          <p>İşbu sözleşmeden doğan uyuşmazlıklarda Düzce Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir.</p>

          <h2 className="text-xl font-bold text-gray-900">9. Yürürlük</h2>
          <p>ALICI, sipariş vererek işbu sözleşmenin tüm koşullarını kabul etmiş sayılır.</p>
        </motion.div>
      </div>
    </main>
  )
}
