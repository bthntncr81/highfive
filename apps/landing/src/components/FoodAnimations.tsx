import { motion } from 'framer-motion'

// Pizza Animation - Spinning with toppings
export const PizzaAnimation = () => {
  return (
    <div className="relative w-full aspect-square">
      {/* Pizza base with shadow */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
        className="absolute inset-0"
      >
        <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
          {/* Pizza crust */}
          <circle cx="100" cy="100" r="95" fill="#D4A574" />
          <circle cx="100" cy="100" r="85" fill="#F5DEB3" />
          
          {/* Tomato sauce */}
          <circle cx="100" cy="100" r="78" fill="#C41E3A" />
          
          {/* Cheese base */}
          <circle cx="100" cy="100" r="75" fill="#FFD93D" opacity="0.9" />
          
          {/* Cheese bubbles */}
          <circle cx="60" cy="70" r="8" fill="#FFF8DC" opacity="0.7" />
          <circle cx="130" cy="60" r="10" fill="#FFF8DC" opacity="0.6" />
          <circle cx="90" cy="130" r="7" fill="#FFF8DC" opacity="0.7" />
          <circle cx="140" cy="120" r="9" fill="#FFF8DC" opacity="0.5" />
          
          {/* Pepperoni */}
          <circle cx="70" cy="80" r="12" fill="#8B0000" />
          <circle cx="70" cy="80" r="8" fill="#A52A2A" />
          <circle cx="120" cy="70" r="12" fill="#8B0000" />
          <circle cx="120" cy="70" r="8" fill="#A52A2A" />
          <circle cx="130" cy="120" r="12" fill="#8B0000" />
          <circle cx="130" cy="120" r="8" fill="#A52A2A" />
          <circle cx="80" cy="130" r="12" fill="#8B0000" />
          <circle cx="80" cy="130" r="8" fill="#A52A2A" />
          <circle cx="100" cy="100" r="12" fill="#8B0000" />
          <circle cx="100" cy="100" r="8" fill="#A52A2A" />
          
          {/* Basil leaves */}
          <ellipse cx="55" cy="110" rx="8" ry="5" fill="#228B22" transform="rotate(-30 55 110)" />
          <ellipse cx="145" cy="90" rx="8" ry="5" fill="#228B22" transform="rotate(20 145 90)" />
          <ellipse cx="100" cy="55" rx="8" ry="5" fill="#228B22" transform="rotate(-10 100 55)" />
        </svg>
      </motion.div>

      {/* Steam effects */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex gap-4">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              y: [-20, -40, -20],
              opacity: [0.6, 0, 0.6],
              scale: [1, 1.5, 1],
            }}
            transition={{
              repeat: Infinity,
              duration: 2,
              delay: i * 0.3,
              ease: 'easeInOut',
            }}
            className="text-3xl"
          >
            ~
          </motion.div>
        ))}
      </div>

      {/* Bouncing pepperoni */}
      <motion.div
        animate={{ y: [0, -15, 0], rotate: [0, 180, 360] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        className="absolute -top-4 right-10"
      >
        <svg viewBox="0 0 40 40" className="w-10 h-10">
          <circle cx="20" cy="20" r="18" fill="#8B0000" />
          <circle cx="20" cy="20" r="12" fill="#A52A2A" />
          <circle cx="15" cy="15" r="2" fill="#8B0000" />
          <circle cx="25" cy="18" r="2" fill="#8B0000" />
          <circle cx="18" cy="25" r="2" fill="#8B0000" />
        </svg>
      </motion.div>
    </div>
  )
}

// Pasta Animation - Swirling noodles with fork
export const PastaAnimation = () => {
  return (
    <div className="relative w-full aspect-square">
      {/* Plate */}
      <svg viewBox="0 0 150 150" className="w-full h-full">
        {/* Plate shadow */}
        <ellipse cx="75" cy="130" rx="60" ry="10" fill="rgba(0,0,0,0.1)" />
        
        {/* Plate base */}
        <ellipse cx="75" cy="100" rx="65" ry="35" fill="#F5F5F5" />
        <ellipse cx="75" cy="95" rx="55" ry="28" fill="#FFFFFF" />
        
        {/* Pasta */}
        <g>
          {/* Spaghetti noodles */}
          <motion.path
            animate={{ d: [
              "M45,85 Q55,70 65,85 T85,85 T105,85",
              "M45,88 Q55,73 65,88 T85,88 T105,88",
              "M45,85 Q55,70 65,85 T85,85 T105,85"
            ]}}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            stroke="#FFD93D"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <motion.path
            animate={{ d: [
              "M40,90 Q55,75 70,90 T100,90",
              "M40,93 Q55,78 70,93 T100,93",
              "M40,90 Q55,75 70,90 T100,90"
            ]}}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut', delay: 0.2 }}
            stroke="#F4A300"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <motion.path
            animate={{ d: [
              "M50,95 Q65,80 80,95 T110,95",
              "M50,98 Q65,83 80,98 T110,98",
              "M50,95 Q65,80 80,95 T110,95"
            ]}}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut', delay: 0.4 }}
            stroke="#FFD93D"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
        </g>
        
        {/* Tomato sauce */}
        <circle cx="65" cy="88" r="6" fill="#C41E3A" opacity="0.8" />
        <circle cx="85" cy="92" r="5" fill="#C41E3A" opacity="0.7" />
        <circle cx="75" cy="85" r="4" fill="#C41E3A" opacity="0.6" />
        
        {/* Basil */}
        <ellipse cx="80" cy="80" rx="6" ry="4" fill="#228B22" transform="rotate(-20 80 80)" />
        <ellipse cx="70" cy="82" rx="5" ry="3" fill="#228B22" transform="rotate(15 70 82)" />
        
        {/* Parmesan */}
        <circle cx="60" cy="85" r="2" fill="#FFF8DC" />
        <circle cx="90" cy="88" r="1.5" fill="#FFF8DC" />
        <circle cx="75" cy="90" r="2" fill="#FFF8DC" />
      </svg>

      {/* Fork twirling */}
      <motion.div
        animate={{ rotate: [0, 360] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        className="absolute top-0 right-0"
      >
        <svg viewBox="0 0 60 120" className="w-12 h-24">
          {/* Fork handle */}
          <rect x="27" y="50" width="6" height="70" rx="3" fill="#C0C0C0" />
          {/* Fork prongs */}
          <rect x="18" y="10" width="4" height="45" rx="2" fill="#C0C0C0" />
          <rect x="28" y="5" width="4" height="50" rx="2" fill="#C0C0C0" />
          <rect x="38" y="10" width="4" height="45" rx="2" fill="#C0C0C0" />
          {/* Noodle on fork */}
          <motion.path
            animate={{ 
              d: [
                "M20,35 Q30,25 40,35",
                "M20,38 Q30,28 40,38",
                "M20,35 Q30,25 40,35"
              ]
            }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            stroke="#FFD93D"
            strokeWidth="3"
            fill="none"
          />
        </svg>
      </motion.div>

      {/* Steam */}
      <motion.div
        animate={{ y: [-5, -20, -5], opacity: [0.5, 0, 0.5] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute top-5 left-1/2 -translate-x-1/2 text-gray-300 text-2xl"
      >
        ~~~
      </motion.div>
    </div>
  )
}

// Sandwich Animation - Layers popping in
export const SandwichAnimation = () => {
  const layerVariants = {
    initial: { y: -20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
  }

  return (
    <div className="relative w-full aspect-[4/3]">
      <svg viewBox="0 0 160 120" className="w-full h-full drop-shadow-xl">
        {/* Shadow */}
        <ellipse cx="80" cy="115" rx="70" ry="8" fill="rgba(0,0,0,0.1)" />
        
        {/* Bottom bread */}
        <motion.g
          variants={layerVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0 }}
        >
          <path
            d="M15,90 Q10,85 15,80 L145,80 Q150,85 145,90 Z"
            fill="#D4A574"
          />
          <path
            d="M20,85 L140,85"
            stroke="#C4956C"
            strokeWidth="2"
          />
        </motion.g>
        
        {/* Lettuce */}
        <motion.g
          variants={layerVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.1 }}
        >
          <motion.path
            animate={{ d: [
              "M12,78 Q30,72 50,78 T90,78 T130,78 Q148,72 148,78",
              "M12,76 Q30,70 50,76 T90,76 T130,76 Q148,70 148,76",
              "M12,78 Q30,72 50,78 T90,78 T130,78 Q148,72 148,78"
            ]}}
            transition={{ repeat: Infinity, duration: 3 }}
            fill="#90EE90"
          />
        </motion.g>
        
        {/* Tomato slices */}
        <motion.g
          variants={layerVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.2 }}
        >
          <circle cx="40" cy="72" r="12" fill="#C41E3A" />
          <circle cx="40" cy="72" r="8" fill="#E63946" />
          <circle cx="80" cy="70" r="12" fill="#C41E3A" />
          <circle cx="80" cy="70" r="8" fill="#E63946" />
          <circle cx="120" cy="72" r="12" fill="#C41E3A" />
          <circle cx="120" cy="72" r="8" fill="#E63946" />
        </motion.g>
        
        {/* Cheese */}
        <motion.g
          variants={layerVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.3 }}
        >
          <path
            d="M18,62 L142,62 L145,58 L140,55 L20,55 L15,58 Z"
            fill="#FFD93D"
          />
          {/* Cheese drip */}
          <motion.path
            animate={{ y: [0, 3, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            d="M35,62 Q33,70 35,65"
            fill="#FFD93D"
          />
        </motion.g>
        
        {/* Meat */}
        <motion.g
          variants={layerVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.4 }}
        >
          <path
            d="M20,52 L140,52 L142,48 L138,44 L22,44 L18,48 Z"
            fill="#8B4513"
          />
          <path
            d="M25,48 L135,48"
            stroke="#A0522D"
            strokeWidth="1"
          />
        </motion.g>
        
        {/* Top bread */}
        <motion.g
          variants={layerVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.5 }}
        >
          <path
            d="M15,42 Q80,15 145,42 L145,38 Q80,10 15,38 Z"
            fill="#D4A574"
          />
          {/* Sesame seeds */}
          <ellipse cx="50" cy="28" rx="3" ry="2" fill="#FFF8DC" transform="rotate(-10 50 28)" />
          <ellipse cx="80" cy="22" rx="3" ry="2" fill="#FFF8DC" transform="rotate(5 80 22)" />
          <ellipse cx="110" cy="26" rx="3" ry="2" fill="#FFF8DC" transform="rotate(-5 110 26)" />
          <ellipse cx="65" cy="32" rx="3" ry="2" fill="#FFF8DC" transform="rotate(10 65 32)" />
          <ellipse cx="95" cy="30" rx="3" ry="2" fill="#FFF8DC" transform="rotate(-8 95 30)" />
        </motion.g>
      </svg>

      {/* Toothpick flag */}
      <motion.div
        animate={{ rotate: [-5, 5, -5] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute top-0 left-1/2 -translate-x-1/2"
      >
        <svg viewBox="0 0 30 50" className="w-8 h-12">
          <line x1="15" y1="50" x2="15" y2="5" stroke="#8B4513" strokeWidth="2" />
          <path d="M15,5 L28,12 L15,19 Z" fill="#C41E3A" />
        </svg>
      </motion.div>
    </div>
  )
}

// Small decorative pizza slice
export const PizzaSlice = ({ className = '' }: { className?: string }) => (
  <motion.svg
    viewBox="0 0 60 80"
    className={`w-12 h-16 ${className}`}
    whileHover={{ rotate: 10, scale: 1.1 }}
  >
    <path d="M30,5 L55,75 L5,75 Z" fill="#F5DEB3" />
    <path d="M30,10 L50,70 L10,70 Z" fill="#C41E3A" />
    <path d="M30,12 L48,68 L12,68 Z" fill="#FFD93D" opacity="0.9" />
    <circle cx="25" cy="40" r="6" fill="#8B0000" />
    <circle cx="35" cy="55" r="6" fill="#8B0000" />
    <circle cx="30" cy="30" r="5" fill="#8B0000" />
    <ellipse cx="40" cy="45" rx="4" ry="2" fill="#228B22" transform="rotate(-20 40 45)" />
  </motion.svg>
)

// Drink illustration
export const DrinkAnimation = ({ className = '' }: { className?: string }) => (
  <motion.div
    className={className}
    animate={{ y: [0, -5, 0] }}
    transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
  >
    <svg viewBox="0 0 60 100" className="w-full h-full">
      {/* Glass */}
      <path d="M15,20 L10,90 Q10,95 20,95 L40,95 Q50,95 50,90 L45,20 Z" fill="#87CEEB" opacity="0.5" />
      <path d="M15,20 L10,90 Q10,95 20,95 L40,95 Q50,95 50,90 L45,20 Z" stroke="#ADD8E6" strokeWidth="2" fill="none" />
      
      {/* Liquid */}
      <path d="M16,25 L12,85 Q12,90 20,90 L40,90 Q48,90 48,85 L44,25 Z" fill="#FF6B6B" opacity="0.8" />
      
      {/* Ice cubes */}
      <rect x="20" y="40" width="10" height="10" rx="2" fill="white" opacity="0.6" transform="rotate(15 25 45)" />
      <rect x="32" y="50" width="8" height="8" rx="2" fill="white" opacity="0.5" transform="rotate(-10 36 54)" />
      
      {/* Straw */}
      <rect x="35" y="5" width="4" height="80" rx="2" fill="#C41E3A" />
      
      {/* Bubbles */}
      <motion.circle
        animate={{ y: [60, 30], opacity: [1, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
        cx="25" cy="60" r="2" fill="white" opacity="0.6"
      />
      <motion.circle
        animate={{ y: [70, 40], opacity: [1, 0] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeOut', delay: 0.5 }}
        cx="35" cy="70" r="1.5" fill="white" opacity="0.5"
      />
    </svg>
  </motion.div>
)
