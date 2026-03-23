import { motion } from 'framer-motion'

export const About = () => {
  return (
    <main className="min-h-screen bg-white">
      <div className="bg-primary py-16 text-center">
        <motion.img
          src="/logo-white.svg"
          alt="High Five"
          className="h-24 mx-auto mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        />
        <h1 className="text-4xl md:text-5xl font-bold text-white">Hakkımızda</h1>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="prose prose-lg">
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            <strong>High Five Pizza & Makarna</strong>, Orhan Geçtim ve Ömer Batuhan Tunçer tarafından
            Düzce Akçakoca'da kurulan bir pizza dükkanıdır.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            Taze malzemeler ve el yapımı hamurlarla hazırladığımız pizza, makarna ve sandviçlerimizle
            Akçakoca'nın lezzet durağı olmayı hedefliyoruz. Her lokmada kalite, lezzet ve sevgi var.
          </p>
          <div className="bg-gray-50 rounded-2xl p-6 mt-8">
            <h3 className="text-xl font-bold text-gray-900 mb-3">İletişim Bilgileri</h3>
            <p className="text-gray-700">Cumhuriyet Mahallesi, İstanbul Caddesi No 151/1</p>
            <p className="text-gray-700">Akçakoca, Düzce</p>
            <p className="text-gray-700 mt-2">Tel: 0555 243 81 81</p>
          </div>
        </div>
      </div>
    </main>
  )
}
