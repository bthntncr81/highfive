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
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2.5 text-sm font-body text-foreground bg-white border border-border rounded-lg transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />

      {/* Clear button */}
      {value && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center bg-foreground-subtle/20 rounded-full text-foreground-muted text-xs hover:bg-foreground-subtle/30 transition-colors"
          aria-label="Aramayı temizle"
        >
          ✕
        </motion.button>
      )}
    </div>
  )
}
