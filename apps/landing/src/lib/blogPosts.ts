// Blog yazıları — SEO için Google'da bulunmaya yönelik içerik.
// Akçakoca, Düzce, Bolu, Sakarya, Zonguldak, Ankara, İstanbul lokal arama hedefli.

export type BlogPost = {
  slug: string
  title: string
  metaDescription: string // SEO meta description
  excerpt: string // Card preview
  publishedAt: string // ISO date
  readMinutes: number
  category: string
  coverImage: string // Unsplash photo URL
  coverEmoji: string // small accent (kategoride)
  coverGradient: string // Tailwind class (overlay/fallback)
  tags: string[]
  content: string // HTML content
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'akcakoca-kalesi-rehberi-gezi-sonrasi-yemek',
    title: 'Akçakoca Kalesi Ziyaret Rehberi: Gezi Sonrası Nerede Yemek Yenir?',
    metaDescription:
      'Akçakoca Kalesi nasıl gezilir, ne zaman gidilir, çevresinde ne var? Gezi sonrası en lezzetli pizza ve makarna nerede yenir? Tam rehber ve mekan önerisi.',
    excerpt:
      'Karadeniz kıyısının saklı incisi Akçakoca Kalesi’ni gezdikten sonra mide tatmin edecek lezzet noktası nerede? Tarihten lezzete tam rehber.',
    publishedAt: '2026-05-10',
    readMinutes: 6,
    category: 'Şehir Rehberi',
    coverImage: '/blog/kale.jpg',
    coverEmoji: '🏰',
    coverGradient: 'from-stone-600 to-amber-700',
    tags: ['Akçakoca', 'Düzce', 'Tarihi Yerler', 'Yemek Rehberi', 'Karadeniz'],
    content: `
<p class="lead">Akçakoca, Düzce'nin Karadeniz'e açılan en güzel ilçesi. Tertemiz havası, sakin koyları ve şaşırtıcı tarihi dokusuyla yıllardır hafta sonu kaçamağı için tercih ediliyor. Şehrin merkezine birkaç dakika mesafedeki <strong>Akçakoca Kalesi</strong> ise pek çok ziyaretçinin haberi olmadığı bir hazine.</p>

<h2>Akçakoca Kalesi'nin Tarihi</h2>
<p>Bizans döneminden kalma kale, Karadeniz kıyı şeridinin korunması için inşa edilmiş. Yüzyıllar boyunca Cenevizliler, Osmanlılar tarafından kullanılmış. Bugün geriye kalan duvarlar ve burç kalıntıları, denizi tepeden kucaklayan eşsiz bir manzara sunuyor.</p>

<h2>Ne Zaman Gitmeli?</h2>
<p>İlkbahar (Nisan-Haziran) ve sonbahar (Eylül-Kasım) en ideal zamanlar. Hava ne çok sıcak ne de soğuk, Karadeniz'in karakteristik sisli atmosferi de bu dönemlerde fotojenik bir hâl alıyor. Yaz ayları biraz kalabalık olabiliyor ama deniz keyfi de cabası.</p>

<h2>Nasıl Gidilir?</h2>
<ul>
  <li><strong>İstanbul'dan:</strong> ~3 saat (TEM Otoyolu üzerinden Düzce çıkışı)</li>
  <li><strong>Ankara'dan:</strong> ~3.5 saat (D100 üzerinden)</li>
  <li><strong>Bolu'dan:</strong> ~1 saat</li>
  <li><strong>Düzce merkezden:</strong> 35 km, 40 dakika</li>
  <li><strong>Sakarya'dan:</strong> ~1 saat</li>
  <li><strong>Zonguldak'tan:</strong> ~1.5 saat</li>
</ul>
<p>Akçakoca girişine vardığında "Kale Mahallesi" tabelalarını takip edebilirsin. Kale, ilçe merkezinin doğusundaki tepede.</p>

<h2>Çevresinde Neler Var?</h2>
<p>Kaleyi gezdikten sonra <strong>Ceneviz Kalesi mevkii</strong>nde minik bir kahvaltı durağı ya da panoramik fotoğraf çekimi yapabilirsin. Edilli Köyü'nün şelaleleri, Aktaş Şelalesi ve eşsiz fındık bahçeleri de bölge turuna mutlaka eklenmeli.</p>

<h2>Gezi Sonrası: Karnını Doyurma Vakti 🍕</h2>
<p>Tarihi kale gezisi ve sahil yürüyüşünden sonra acıkmamak imkânsız. İşte tam burada devreye <strong>HighFive Pizza & Makarna</strong> giriyor.</p>

<p>Akçakoca'nın kalbinde, ilçe merkezindeki HighFive'da:</p>
<ul>
  <li>İtalyan usulü <strong>taş fırın pizza</strong> (klasik İnce, Klasik veya Kalın hamur seçenekli)</li>
  <li>El yapımı taze <strong>makarna çeşitleri</strong></li>
  <li>Premium malzemelerle hazırlanan <strong>İtalyan sandviçler</strong> (Panouzzo ekmeği, suda mozzarella, trüflü dana...)</li>
  <li>Dilersen yepyeni <strong>"Kendi Pizzanı / Sandviçini Tasarla"</strong> servisi — hamurdan başlayıp 5 adımda tam senin gibi bir lezzet yaratırsın</li>
</ul>

<p>Kale ziyareti planını yaparken yemek molasını HighFive'da koymanı şiddetle öneririz. Tarihsel atmosferin yorgunluğunu, gerçek İtalyan lezzetiyle dengelemek ne kadar tatlı, bir bilsen.</p>

<h2>Pratik Bilgiler</h2>
<ul>
  <li><strong>Kale ziyareti:</strong> Ücretsiz, açık alan</li>
  <li><strong>Süre:</strong> 1-2 saat (manzara fotoğrafları için 2 saat öner)</li>
  <li><strong>Park:</strong> Sahil yolundaki ücretsiz parka bırakıp yürüyebilirsin (~10 dk)</li>
  <li><strong>Yemek için:</strong> HighFive Pizza & Makarna — Akçakoca merkez, telefonla rezervasyon ya da uygulamadan paket sipariş</li>
</ul>

<p class="cta-paragraph">Akçakoca'ya bir sonraki kaçamak planlıyorsan, HighFive uygulamasını şimdiden indir — gezdiğin gün bir tıkla sıcak pizzan kapına ya da masana gelsin.</p>
    `,
  },

  {
    slug: 'hafta-sonu-kacamak-noktalari-yemek-rehberi',
    title: 'İstanbul, Ankara, Bolu, Sakarya, Zonguldak Yakınında Hafta Sonu Kaçamak: Akçakoca',
    metaDescription:
      'İstanbul, Ankara, Bolu, Sakarya, Zonguldak\'a yakın hafta sonu kaçamak noktası: Akçakoca. Doğa, deniz, tarih ve en iyi yemek noktaları — komple rehber.',
    excerpt:
      'Şehrin gürültüsünden kaçmak istiyorsan, en yakın "kaçtım kurtuldum" noktan Akçakoca olabilir. İşte mesafeler, görülecek yerler ve nerede ne yenir, tam rehber.',
    publishedAt: '2026-05-08',
    readMinutes: 7,
    category: 'Hafta Sonu Kaçamağı',
    coverImage: '/blog/akcakoca.jpg',
    coverEmoji: '🌊',
    coverGradient: 'from-blue-600 to-emerald-500',
    tags: [
      'İstanbul',
      'Ankara',
      'Bolu',
      'Sakarya',
      'Zonguldak',
      'Akçakoca',
      'Hafta Sonu',
      'Kaçamak',
    ],
    content: `
<p class="lead">İş haftan bitti, Cuma akşamı evdesin, "ya bu hafta sonu nereye gitsek?" Düşünüyorsun. Cevap aslında çok yakın: <strong>Akçakoca</strong>. Düzce'nin Karadeniz kıyısındaki bu küçük ama dopdolu ilçesi, büyük şehirlerin hepsinden 1-3 saat uzaklıkta. Ne çok kalabalık ne de ulaşılmaz — tam kaçamak boyutunda.</p>

<h2>Mesafeler — Sana En Yakın Hangi Şehir?</h2>
<table class="info-table">
  <thead><tr><th>Çıkış Noktası</th><th>Mesafe</th><th>Süre</th><th>Rota</th></tr></thead>
  <tbody>
    <tr><td>İstanbul (Anadolu)</td><td>~250 km</td><td>3 saat</td><td>TEM → Düzce çıkışı → D655</td></tr>
    <tr><td>Ankara</td><td>~340 km</td><td>3.5-4 saat</td><td>D100/Bolu üzerinden</td></tr>
    <tr><td>Bolu</td><td>~80 km</td><td>1-1.5 saat</td><td>Düzce üzerinden D655</td></tr>
    <tr><td>Sakarya (Adapazarı)</td><td>~130 km</td><td>1.5-2 saat</td><td>Düzce → D655</td></tr>
    <tr><td>Zonguldak</td><td>~90 km</td><td>1.5 saat</td><td>D010 sahil yolu</td></tr>
    <tr><td>Düzce merkez</td><td>35 km</td><td>40 dk</td><td>D655 doğrudan</td></tr>
  </tbody>
</table>

<h2>Akçakoca'da Görülecek Yerler</h2>
<h3>1. Akçakoca Kalesi</h3>
<p>Bizans dönemine ait kale kalıntıları, denizi yukarıdan görme keyfi. Ücretsiz, 1-2 saat yeter.</p>

<h3>2. Sahil ve Plajlar</h3>
<p>Akçakoca'nın temizliği iyi tutulan plajları yaz aylarında çok talep görüyor. Mavi bayraklı plajlar mevcut.</p>

<h3>3. Edilli Köyü Şelaleleri</h3>
<p>Otoyoldan içeri sapmaya değer. Doğal su şelalesi, fotoğraf cenneti.</p>

<h3>4. Fındık Tarlaları</h3>
<p>Akçakoca, Türkiye'nin en kaliteli fındığının yetiştiği bölge. Köyleri gezerken yol boyunca fındık tarlalarını izleyebilirsin.</p>

<h3>5. Aktaş Şelalesi</h3>
<p>Kısa bir trekking yürüyüşü ile ulaşılan, sakin ve ferahlatıcı şelale.</p>

<h2>Konaklama Önerileri</h2>
<p>Akçakoca'da küçük butik oteller, sahil pansiyonları ve dağ evleri mevcut. Hafta sonu erken rezervasyon yapmanı şiddetle öneririz, özellikle Mayıs-Eylül arası dolu dolu.</p>

<h2>Yemek — Asıl Mesele</h2>
<p>Karadeniz tarafına gittiğinde balıkçılar elbette başka bir tat. Ama bazen <strong>"İtalyan bir şey istiyorum"</strong> dediğin anlar olur. İşte tam o noktada Akçakoca merkezindeki <strong>HighFive Pizza & Makarna</strong> imdadına yetişiyor.</p>

<p>Sahil gezisinden, kale yürüyüşünden, fındık bahçesi turlarından sonra HighFive'a uğra:</p>
<ul>
  <li><strong>Margherita</strong> klasiği veya <strong>HighFive Cheddar Pizza</strong></li>
  <li>Akçakoca merkezindeki yegane <strong>İtalyan sandviç</strong> deneyimi (Panouzzo ekmeği — taş fırında, içi mozzarella, dana füme)</li>
  <li>Yepyeni <strong>"Kendi Pizzanı Tasarla"</strong> aracıyla 5 adımda kişisel pizzanı oluştur</li>
  <li>Üye olursan her sipariş otomatik puan getirir, sürpriz kuponlar açabilirsin</li>
</ul>

<h2>Pratik Hafta Sonu Programı</h2>
<h3>Cumartesi</h3>
<ul>
  <li><strong>09:00:</strong> Yola çık — yolda kahvaltı molası, ardından Akçakoca'ya doğru</li>
  <li><strong>11:30:</strong> Akçakoca'ya varış, otele yerleş</li>
  <li><strong>13:00:</strong> Sahilde yürüyüş, denize gir — yorgunluk başladığında öğle yemeği için en yakın HighFive (taş fırın pizza ya da İtalyan sandviç)</li>
  <li><strong>15:00:</strong> Denizden yorgun çıkıp pizza ile karnını doyurduktan sonra Akçakoca Kalesi gezisi</li>
  <li><strong>18:00:</strong> Sahil günbatımı</li>
  <li><strong>20:00:</strong> Akşam yemeği (taze pizza, masada veya paket olarak otele)</li>
</ul>

<h3>Pazar</h3>
<ul>
  <li><strong>09:30:</strong> Köyleri gezme, fındık bahçeleri</li>
  <li><strong>12:30:</strong> Edilli/Aktaş şelaleleri</li>
  <li><strong>15:00:</strong> Geri dönüş öncesi son durak: HighFive'da hızlı bir ev yapımı makarna</li>
  <li><strong>16:00:</strong> Yola çıkış</li>
</ul>

<p class="cta-paragraph">Hafta sonunu net planla — uygulamayı şimdi indir, geldiğin gün siparişin masada hazır olsun. <a href="/app">📱 Uygulamayı İndir</a></p>
    `,
  },

  {
    slug: 'napoli-pizzasinin-farki-mutfak-felsefemiz',
    title: 'Napoli Pizzasının Farkı Nedir? HighFive\'ın Mutfak Felsefesi',
    metaDescription:
      'Gerçek İtalyan Napoli pizzası nasıl yapılır? Hamur, taş fırın, San Marzano domates ve mozzarella di bufala — HighFive\'ın taş fırından gelen lezzet sırrı.',
    excerpt:
      'Pizza dünyanın en bilinen yemeği — ama "gerçek pizza" deyince ne kastediliyor? Napoli\'den Akçakoca\'ya uzanan lezzet yolculuğu.',
    publishedAt: '2026-05-05',
    readMinutes: 8,
    category: 'Mutfak Felsefesi',
    coverImage: '/blog/margarita.jpg',
    coverEmoji: '🍕',
    coverGradient: 'from-red-600 to-orange-500',
    tags: [
      'Napoli Pizza',
      'İtalyan Mutfağı',
      'Taş Fırın',
      'Mutfak Felsefesi',
      'San Marzano',
      'Mozzarella',
    ],
    content: `
<p class="lead">"Pizza" denince herkesin aklında farklı bir şey canlanıyor. Yıllardır zincir restoranların üzerine peynir bombardımanı yaptığı kalın hamurlu, derin kalıplarda pişen versiyonu mu? Yoksa İtalya'nın güneyinden, Napoli sokaklarından gelen, ince hamurlu, taş fırında 60-90 saniyede pişen, sadece üç dört temel malzeme barındıran o gerçek versiyon mu?</p>

<p>HighFive'da biz <strong>ikinci ekol</strong>e inanıyoruz — Napoli geleneği. Bu yazıda neden ve nasıl olduğunu anlatalım.</p>

<h2>Napoli Pizzasının Beş Temel Kuralı</h2>
<p>UNESCO bile Napoli pizza yapımını "İnsanlığın Somut Olmayan Kültürel Mirası" listesine aldı. Çünkü bu sadece yemek değil, bir gelenek. Resmi <strong>Associazione Verace Pizza Napoletana (AVPN)</strong> tarafından korunan beş kural var:</p>

<h3>1. Hamur — En az 72 saat dinlendirilir</h3>
<p>Tip "00" un, deniz tuzu, taze maya ve su. Sadece bu dört malzeme. Karıştırılır, yoğrulur, ardından 72 saat soğukta dinlendirilir. Bu uzun fermantasyon hamuru sindirimi kolay, hafif ve gerçek bir aroma sahibi yapar.</p>

<h3>2. Elle açılır — Asla oklava ile değil</h3>
<p>Hamur top haline getirildikten sonra parmaklarla ortadan dışa doğru bastırılır. Kenarlar ("cornicione") elle dokunulmadan kalır, fırında şişer. Oklava kullanmak hamurun gözeneklerini bozar.</p>

<h3>3. Taş fırın, 450-485°C</h3>
<p>Geleneksel odun fırını 450°C'nin üzerinde olmalı. Pişme süresi sadece <strong>60-90 saniye</strong>. Bu hızlı ve şiddetli ısı, hamurun dışını çıtırlatırken içini yumuşak ve havadar bırakır.</p>

<h3>4. San Marzano Domatesi</h3>
<p>Vezüv'ün eteklerinden yetişen, asit dengesi ve tatlılığı eşsiz olan San Marzano domatesi gerçek Napoli pizzasının olmazsa olmazı. Pelati halinde (bütün, soyulmuş, kendi suyunda) kullanılır, hiç pişirilmeden el ile ezilerek hamura sürülür.</p>

<h3>5. Mozzarella di Bufala (Manda Mozzarellası)</h3>
<p>Sığır sütünden değil, manda sütünden yapılan, suda saklanan, hafifçe ekşimsi tatlı bu peynir Margherita'nın ruhudur. Pişerken eridiğinde özel bir kremalı doku verir.</p>

<h2>HighFive'ın Mutfak Felsefesi</h2>
<p>Akçakoca gibi sakin bir Karadeniz ilçesinde "neden gerçek İtalyan pizzası?" diye sorabilirsin. Bizim cevabımız basit: <strong>çünkü hak ediyorsun</strong>.</p>

<p>Standart fast food zincirinin endüstriyel hamuruna, dondurulmuş malzemesine alıştırıldık. HighFive'ın tüm felsefesi bunun tam tersini sunmak:</p>

<h3>Hamur</h3>
<p>Her gün taze yoğrulan, en az 72 saat soğuk fermantasyona bırakılan İtalyan stili hamur. Üç hamur seçeneği sunuyoruz: <strong>İnce</strong> (Napoli klasik), <strong>Klasik</strong> (orta kalınlık) ve <strong>Kalın</strong> (yumuşak iç dokulu sevenler için).</p>

<h3>Taş Fırın</h3>
<p>Geleneksel taş fırınımızda pizzalar yüksek ısıda dakikalar içinde pişer. Hamurun çıtır kabuğu, üstündeki malzemelerin tazeliği — bütün bunu evde mikrodalgada ısıtılan endüstriyel pizzayla karıştırmak yazıktır.</p>

<h3>Malzemeler</h3>
<ul>
  <li><strong>San Marzano domatesi</strong> tabanlı sosumuz</li>
  <li><strong>Mozzarella</strong> ve <strong>Suda Mozzarella</strong> (premium) seçenekleri</li>
  <li>Tek bir gramma yapay aroma veya konservan kullanmıyoruz</li>
  <li>Et ve sebzeler bölgeden, taze tedarikten</li>
</ul>

<h3>Kendi Pizzanı Tasarla</h3>
<p>İtalya'da bir Napoletano pizzaiolo'nun karşısına geçip "şunu, şunu, şunu istiyorum" diyebileceğin gibi, HighFive'da da artık kendi pizzanı 5 adımda inşa edebiliyorsun:</p>
<ol>
  <li><strong>Hamur seç:</strong> İnce, Klasik ya da Kalın</li>
  <li><strong>Taban sosu:</strong> Domates ya da San Marzano</li>
  <li><strong>Peynir:</strong> Mozzarella, Cheddar, Parmesan, Gorgonzola, Suda Mozzarella</li>
  <li><strong>İçerik:</strong> Sucuk, Salam, Füme antrikot, Mantar, Çeri domates, Jalapeno...</li>
  <li><strong>Üst sos:</strong> Pesto, BBQ, Sweet Chili, Trüflü mayonez...</li>
</ol>

<p>Anlık 2D önizleme ile ne yapacağını adım adım görüyorsun, fiyatı da otomatik hesaplanıyor.</p>

<h2>Sandviç Felsefemiz</h2>
<p>Pizza dışında <strong>İtalyan sandviçleri</strong>nde de aynı kalite anlayışını sürdürüyoruz. <strong>Panouzzo</strong> — Floransa'nın geleneksel taş fırın ekmeği — bizim taş fırınımızda her gün taze pişer. İçine taze peynir, dana füme, fıstıklı pesto, közlenmiş kapya biber, suda mozzarella koyuyoruz. Bu bir hızlı yemek değil — bir <em>panino italiano</em>.</p>

<h2>Sonuç</h2>
<p>Gerçek pizza ve sandviç deneyimi tamamen malzeme kalitesi, hamurun zamanı, fırının ısısı ve ustanın elinin sıcaklığıyla ilgilidir. HighFive olarak Akçakoca'da bu felsefeyi, herkesin erişebileceği bir lezzete dönüştürmek için varız. Bir gün uğra, fark hemen anlaşılıyor.</p>

<p class="cta-paragraph">İtalyan lezzetini taş fırından kapına getirmek için <a href="/app">📱 HighFive uygulamasını indir</a>, ya da <a href="/menu">menüyü incele</a>.</p>
    `,
  },
]

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug)
}
