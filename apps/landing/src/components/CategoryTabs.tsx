import { motion } from 'framer-motion'
import type { Category } from '../content/content.schema'

type CategoryTabsProps = {
  categories: Category[]
  activeCategory: string | null
  onCategoryChange: (id: string | null) => void
}

export const CategoryTabs = ({
  categories,
  activeCategory,
  onCategoryChange,
}: CategoryTabsProps) => {
  const allCategories = [
    { id: null, name: 'Tümü', icon: '🍽️' },
    ...categories,
  ]

  return (
    <div className="relative">
      {/* Scrollable container */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {allCategories.map((cat) => {
          const isActive = activeCategory === cat.id
          return (
            <motion.button
              key={cat.id ?? 'all'}
              onClick={() => onCategoryChange(cat.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                relative flex items-center gap-1.5 px-3 py-2
                font-display font-semibold text-sm whitespace-nowrap
                rounded-lg transition-all duration-200
                ${isActive
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white text-foreground border border-border hover:border-primary/30'
                }
              `}
            >
              <span className="text-base">{cat.icon}</span>
              {cat.name}
            </motion.button>
          )
        })}
      </div>

      {/* Gradient fade on right edge */}
      <div className="absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-surface to-transparent pointer-events-none" />
    </div>
  )
}
