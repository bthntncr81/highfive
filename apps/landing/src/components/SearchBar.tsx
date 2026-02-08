import { motion } from 'framer-motion'

type SearchBarProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export const SearchBar = ({
  value,
  onChange,
  placeholder = 'Ara...',
}: SearchBarProps) => {
  return (
    <div className="relative w-full">
      {/* Search icon */}
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg pointer-events-none">
        🔍
      </span>
      
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2.5 text-sm font-body text-foreground bg-white border-2 border-diner-kraft rounded-lg transition-all duration-200 focus:border-diner-mustard focus:outline-none focus:ring-2 focus:ring-diner-mustard/20"
      />

      {/* Clear button */}
      {value && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center bg-diner-kraft/50 rounded-full text-diner-chocolate text-xs hover:bg-diner-kraft transition-colors"
          aria-label="Aramayı temizle"
        >
          ✕
        </motion.button>
      )}
    </div>
  )
}
