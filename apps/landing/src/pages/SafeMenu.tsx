import { motion } from 'framer-motion'
import { useContent } from '../lib/contentStore'
import { useTheme } from '../hooks/useTheme'
import { imageUrl } from '../lib/api'

export const SafeMenu = () => {
  const { content } = useContent()
  const theme = useTheme()
  const brandName = theme?.name || content.site.name
  const brandLogo = imageUrl(theme?.logoUrl)
  return (
    <main className="min-h-screen bg-gray-950">
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          {brandLogo ? (
            <img src={brandLogo} alt={brandName} className="h-20 mx-auto mb-4 object-contain" />
          ) : (
            <span className="block text-3xl font-extrabold text-white mb-4">{brandName}</span>
          )}
          <h1 className="text-3xl font-bold text-white">Menümüz</h1>
        </motion.div>

        {/* Pizza Menu */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <img
            src="/menu-pizza.png"
            alt="Pizza Menü"
            className="w-full rounded-2xl shadow-2xl"
          />
        </motion.div>

        {/* Pasta Menu */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <img
            src="/menu-pasta.png"
            alt="Makarna Menü"
            className="w-full rounded-2xl shadow-2xl"
          />
        </motion.div>
      </div>
    </main>
  )
}
