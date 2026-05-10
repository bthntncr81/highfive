import { motion } from 'framer-motion'

export const TermsOfUse = () => {
  return (
    <main className="min-h-screen bg-white">
      <div className="bg-primary py-12 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white">Üyelik Sözleşmesi & Kullanım Şartları</h1>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="prose prose-lg text-gray-700 space-y-6">

          <p><strong>Son Güncelleme:</strong> 10 Mayıs 2026</p>

          <h2 className="text-xl font-bold text-gray-900">1. Taraflar</h2>
          <p>İşbu Üyelik Sözleşmesi ("Sözleşme"), <strong>High Five Pizza & Makarna</strong> ("Şirket" veya "HighFive") ile HighFive web sitesi (highfivepps.com) ya da HighFive mobil uygulamalarını ("Platform") kullanarak üye olan kişi ("Üye" veya "Kullanıcı") arasında elektronik ortamda kurulmuştur.</p>

          <h2 className="text-xl font-bold text-gray-900">2. Sözleşmenin Konusu</h2>
          <p>Sözleşme, Üye'nin Platform üzerinden yararlanacağı hizmetleri ve hizmetlere ilişkin tarafların hak ve yükümlülüklerini düzenler. Üye, Platform'a üye olduğu anda bu sözleşmeyi kabul etmiş sayılır.</p>

          <h2 className="text-xl font-bold text-gray-900">3. Üyelik Koşulları</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Üyelik için 18 yaşını doldurmuş olmak gerekir. 18 yaş altı kullanıcılar yasal temsilcilerinin izni ile üye olabilirler.</li>
            <li>Üye, kayıt sırasında verdiği bilgilerin doğruluğundan ve güncelliğinden sorumludur.</li>
            <li>Bir kişi yalnızca bir aktif üyelik hesabı oluşturabilir.</li>
            <li>Üyelik, e-posta doğrulaması ile aktive olur.</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900">4. Hesap Güvenliği</h2>
          <p>Üye, hesabına erişim için kullanılan e-posta, doğrulama kodu ve diğer kimlik bilgilerinin gizliliğini korumakla yükümlüdür. Bu bilgilerin üçüncü kişilerle paylaşılmasından doğacak sonuçlardan Üye sorumludur. Hesabında olağandışı bir aktivite gözlemleyen Üye, derhal Şirket'e bildirmelidir.</p>

          <h2 className="text-xl font-bold text-gray-900">5. Hizmet Kullanımı</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Platform üzerinden yemek siparişi, ödeme, teslimat takibi, sadakat programı ve kampanya hizmetlerinden yararlanılabilir.</li>
            <li>Üye, hizmetleri yalnızca yasal amaçlarla kullanmayı kabul eder.</li>
            <li>Sahte sipariş, ödeme dolandırıcılığı, sistemi kötüye kullanım veya başka bir Üye'nin kimliği ile işlem yapma kesinlikle yasaktır.</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900">6. Sipariş ve Ödeme</h2>
          <p>Sipariş verilen ürünlerin fiyatları, sipariş anında Platform üzerinde gösterilen fiyatlardır. Ödemeler iyzico 3D Secure altyapısı üzerinden güvenli şekilde alınır. Sipariş onaylandıktan sonra hazırlık süreci başlar; hazırlığa başlanmış siparişler iptal edilemez.</p>

          <h2 className="text-xl font-bold text-gray-900">7. Sadakat Programı (HighFive Puan)</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Sadakat puanları yalnızca tamamlanan siparişlerden kazanılır.</li>
            <li>Puanlar, Şirket tarafından belirlenen kurallar çerçevesinde indirim veya hediye ürün olarak kullanılabilir.</li>
            <li>İptal edilen siparişlerde verilen puanlar geri alınır.</li>
            <li>Şirket, sadakat programı kurallarını değiştirme hakkını saklı tutar; değişiklikler Platform üzerinden duyurulur.</li>
            <li>Davet (referral) kodu sahte hesap oluşturma amaçlı kullanılamaz; tespiti halinde puanlar iptal edilir ve hesap kapatılabilir.</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900">8. Kişisel Verilerin Korunması</h2>
          <p>Üye'nin kişisel verileri, ayrı bir <a href="/privacy" className="text-primary underline">Gizlilik Politikası</a> ve <strong>KVKK Aydınlatma Metni</strong> kapsamında işlenir. Üye, bu metinleri okuyup anladığını ve kabul ettiğini beyan eder.</p>

          <h2 className="text-xl font-bold text-gray-900">9. İletişim ve Bildirimler</h2>
          <p>Şirket, sipariş bildirimlerini, doğrulama kodlarını ve hizmet güncellemelerini Üye'nin kayıt sırasında verdiği e-posta adresine gönderir. Pazarlama amaçlı e-posta, SMS ve push bildirimler için Üye'nin <strong>açık rızası</strong> aranır; Üye dilediği zaman uygulama içi tercihler ekranından bu rızasını geri çekebilir.</p>

          <h2 className="text-xl font-bold text-gray-900">10. Fikri Mülkiyet Hakları</h2>
          <p>Platform üzerinde yer alan tüm tasarımlar, logolar, görseller, yazılım ve içerikler Şirket'in fikri mülkiyetidir. Üye, bu içerikleri kopyalayamaz, çoğaltamaz, dağıtamaz veya ticari amaçla kullanamaz.</p>

          <h2 className="text-xl font-bold text-gray-900">11. Hesabın Askıya Alınması veya Sonlandırılması</h2>
          <p>Şirket, Üye'nin işbu sözleşmeyi veya yasal düzenlemeleri ihlal etmesi durumunda, hesabı askıya alma veya tamamen kapatma hakkını saklı tutar. Bu durumda kazanılmış puanlar iptal edilebilir.</p>
          <p>Üye, dilediği zaman uygulama içinden veya 0555 243 81 81 numarasından bize ulaşarak hesabını silmesini talep edebilir.</p>

          <h2 className="text-xl font-bold text-gray-900">12. Sözleşme Değişiklikleri</h2>
          <p>Şirket, işbu sözleşmeyi değiştirme hakkını saklı tutar. Önemli değişiklikler Üye'ye e-posta veya uygulama içi bildirimle iletilir. Üye, değişiklik sonrası Platform'u kullanmaya devam ettiği takdirde yeni sözleşmeyi kabul etmiş sayılır.</p>

          <h2 className="text-xl font-bold text-gray-900">13. Sorumluluk Sınırlandırması</h2>
          <p>Şirket, Platform'da kesintisiz hizmet sunmaya çalışır ancak teknik arıza, mücbir sebep veya üçüncü taraf hizmet kesintilerinden kaynaklanan kesintilerden sorumlu tutulamaz. Şirket'in toplam sorumluluğu, Üye'nin son 12 ay içinde Platform üzerinden yaptığı toplam harcama ile sınırlıdır.</p>

          <h2 className="text-xl font-bold text-gray-900">14. Uyuşmazlık Çözümü ve Yetkili Mahkeme</h2>
          <p>İşbu sözleşmeden doğan uyuşmazlıklarda Türkiye Cumhuriyeti yasaları uygulanır. Tüketici uyuşmazlıkları için T.C. Ticaret Bakanlığı tarafından her yıl belirlenen parasal limit dahilinde Tüketici Hakem Heyetleri, üzerindeki uyuşmazlıklarda Düzce Tüketici Mahkemeleri yetkilidir.</p>

          <h2 className="text-xl font-bold text-gray-900">15. İletişim</h2>
          <p>High Five Pizza & Makarna<br />Cumhuriyet Mahallesi, İstanbul Caddesi No 151/1, Akçakoca, Düzce<br />Tel: 0555 243 81 81<br />E-posta: info@highfivepps.com</p>
        </motion.div>
      </div>
    </main>
  )
}
