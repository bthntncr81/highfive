import { motion } from 'framer-motion'

export const Privacy = () => {
  return (
    <main className="min-h-screen bg-white">
      <div className="bg-primary py-12 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white">Gizlilik Sözleşmesi</h1>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="prose prose-lg text-gray-700 space-y-6">

          <p><strong>Son Güncelleme:</strong> 22 Mart 2026</p>

          <h2 className="text-xl font-bold text-gray-900">1. Veri Sorumlusu</h2>
          <p>High Five Pizza & Makarna ("Şirket"), Cumhuriyet Mahallesi, İstanbul Caddesi No 151/1, Akçakoca, Düzce adresinde faaliyet göstermektedir. Kişisel verilerinizin korunması konusunda 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu sıfatıyla hareket etmektedir.</p>

          <h2 className="text-xl font-bold text-gray-900">2. Toplanan Kişisel Veriler</h2>
          <p>Hizmetlerimizi sunabilmek için aşağıdaki kişisel veriler toplanabilir:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Ad ve soyad</li>
            <li>Telefon numarası</li>
            <li>E-posta adresi</li>
            <li>Teslimat adresi</li>
            <li>Ödeme bilgileri (iyzico üzerinden güvenli şekilde işlenir)</li>
            <li>Sipariş geçmişi</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900">3. Verilerin Kullanım Amacı</h2>
          <p>Toplanan kişisel veriler aşağıdaki amaçlarla kullanılır:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Siparişlerinizin hazırlanması ve teslimatı</li>
            <li>Ödeme işlemlerinin gerçekleştirilmesi</li>
            <li>Müşteri hizmetleri ve iletişim</li>
            <li>Sadakat programı yönetimi</li>
            <li>Yasal yükümlülüklerin yerine getirilmesi</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900">4. Verilerin Paylaşımı</h2>
          <p>Kişisel verileriniz yalnızca ödeme işlemleri için iyzico ile ve yasal zorunluluk halinde yetkili kamu kurum ve kuruluşları ile paylaşılır. Üçüncü taraflarla ticari amaçla paylaşılmaz.</p>

          <h2 className="text-xl font-bold text-gray-900">5. Veri Güvenliği</h2>
          <p>Kişisel verileriniz SSL şifreleme ile korunmaktadır. Ödeme bilgileri tarafımızda saklanmaz, iyzico 3D Secure altyapısı üzerinden güvenli şekilde işlenir.</p>

          <h2 className="text-xl font-bold text-gray-900">6. Haklarınız</h2>
          <p>KVKK kapsamında kişisel verilerinizle ilgili bilgi alma, düzeltme, silme ve itiraz etme haklarınız bulunmaktadır. Bu haklarınızı kullanmak için 0555 243 81 81 numarasından bize ulaşabilirsiniz.</p>

          <h2 className="text-xl font-bold text-gray-900">7. Çerezler</h2>
          <p>Web sitemizde sepet bilgilerinizi ve oturum tercihlerinizi saklamak amacıyla çerezler (localStorage) kullanılmaktadır.</p>

          <h2 className="text-xl font-bold text-gray-900">8. İletişim</h2>
          <p>High Five Pizza & Makarna<br />Cumhuriyet Mahallesi, İstanbul Caddesi No 151/1, Akçakoca, Düzce<br />Tel: 0555 243 81 81</p>
        </motion.div>
      </div>
    </main>
  )
}
