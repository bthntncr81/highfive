import { motion } from 'framer-motion'

export const SafeMenu = () => {
  return (
    <main className="min-h-screen bg-gray-950">
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <img src="/logo-white.svg" alt="High Five" className="h-20 mx-auto mb-4" />
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
