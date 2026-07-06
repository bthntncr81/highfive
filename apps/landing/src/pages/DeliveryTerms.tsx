import { motion } from 'framer-motion'
import { useContent } from '../lib/contentStore'

export const DeliveryTerms = () => {
  const { content } = useContent()
  const siteName = content.site?.name || 'Restoranımız'
  const address = content.contact?.address || ''
  const phone = content.links?.phoneTel || content.whatsapp?.phone || ''
  return (
    <main className="min-h-screen bg-white">
      <div className="bg-primary py-12 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white">Teslimat ve İade Şartları</h1>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="prose prose-lg text-gray-700 space-y-6">

          <h2 className="text-xl font-bold text-gray-900">1. Teslimat Koşulları</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Teslimat hizmeti hizmet bölgemiz ve yakın çevresine yapılmaktadır.</li>
            <li>Tahmini teslimat süresi 30-45 dakikadır. Yoğun saatlerde süre uzayabilir.</li>
            <li>Teslimat ücreti 29₺'dir.</li>
            <li>Minimum sipariş tutarı bulunmamaktadır.</li>
            <li>"Gel Al" siparişlerinde teslimat ücreti alınmaz.</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900">2. Sipariş İptali</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Sipariş henüz hazırlanmaya başlanmamışsa ücretsiz iptal edilebilir.</li>
            <li>Hazırlanmaya başlanan siparişler iptal edilemez.</li>
            <li>İptal taleplerinizi {phone} numarasından iletebilirsiniz.</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900">3. İade Koşulları</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Teslim edilen ürünlerde eksiklik veya hata varsa, teslimat anında bildirilmesi halinde ürün yenisiyle değiştirilir veya ücret iade edilir.</li>
            <li>Gıda ürünlerinin doğası gereği, teslim alındıktan sonra iade kabul edilmez.</li>
            <li>Kalite sorunu yaşamanız durumunda bizi arayarak çözüm sunmamıza fırsat verin.</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900">4. Online Ödeme İadesi</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Kredi kartı ile yapılan ödemelerin iadesi, iptal onayından sonra 1-7 iş günü içinde kartınıza yansır.</li>
            <li>İade işlemi iyzico güvenli ödeme altyapısı üzerinden gerçekleştirilir.</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900">5. İletişim</h2>
          <p>Teslimat ve iade ile ilgili tüm sorularınız için:<br />
          {siteName}<br />
          Tel: {phone}<br />
          {address && <>Adres: {address}</>}</p>
        </motion.div>
      </div>
    </main>
  )
}
