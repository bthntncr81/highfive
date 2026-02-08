import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

type SectionContainerProps = {
  children: ReactNode
  className?: string
  id?: string
  variant?: 'cream' | 'paper' | 'kraft' | 'red' | 'chocolate'
  withPattern?: boolean
}

export const SectionContainer = ({
  children,
  className = '',
  id,
  variant = 'cream',
  withPattern = false,
}: SectionContainerProps) => {
  const variantStyles = {
    cream: 'bg-diner-cream',
    paper: 'bg-surface',
    kraft: 'bg-gradient-to-b from-diner-cream-dark to-diner-kraft/30',
    red: 'bg-diner-red text-white',
    chocolate: 'bg-diner-chocolate text-diner-cream',
  }

  return (
    <section
      id={id}
      className={`relative py-16 md:py-24 overflow-hidden ${variantStyles[variant]} ${className}`}
    >
      {/* Optional checkered pattern overlay */}
      {withPattern && (
        <div className="absolute inset-0 checkered-red pointer-events-none" />
      )}
      
      <div className="container-diner relative z-10">
        {children}
      </div>
    </section>
  )
}

// Section heading component
type SectionHeadingProps = {
  title: string
  subtitle?: string
  align?: 'left' | 'center'
  className?: string
}

export const SectionHeading = ({
  title,
  subtitle,
  align = 'center',
  className = '',
}: SectionHeadingProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`mb-12 ${align === 'center' ? 'text-center' : ''} ${className}`}
    >
      <h2 className="font-heading text-4xl md:text-5xl text-diner-chocolate mb-4">
        {title}
      </h2>
      {subtitle && (
        <p className="font-body text-xl text-diner-chocolate-light max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}
      {/* Decorative underline */}
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className={`mt-4 h-2 w-24 bg-diner-mustard rounded-full ${
          align === 'center' ? 'mx-auto' : ''
        }`}
      />
    </motion.div>
  )
}
