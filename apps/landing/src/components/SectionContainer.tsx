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
}: SectionContainerProps) => {
  const variantStyles = {
    cream: 'bg-background',
    paper: 'bg-surface',
    kraft: 'bg-white',
    red: 'bg-primary text-white',
    chocolate: 'bg-foreground text-white',
  }

  return (
    <section
      id={id}
      className={`relative py-16 md:py-24 overflow-hidden ${variantStyles[variant]} ${className}`}
    >
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
      <h2 className="font-heading font-bold text-4xl md:text-5xl text-foreground mb-4">
        {title}
      </h2>
      {subtitle && (
        <p className="font-body text-xl text-foreground-muted max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}
      {/* Decorative underline */}
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className={`mt-4 h-1 w-16 bg-primary rounded-full ${
          align === 'center' ? 'mx-auto' : ''
        }`}
      />
    </motion.div>
  )
}
