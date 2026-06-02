import { type HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

/**
 * Card base reutilizável.
 * Encapsula o visual padrão (bg-card, border, rounded-xl, shadow-sm).
 */
export function Card({ padding = 'md', className = '', children, ...props }: CardProps) {
  const classes = `bg-card border border-border rounded-xl shadow-sm ${paddingStyles[padding]} ${className}`
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-4 border-b border-border bg-muted/20 ${className}`} {...props}>
      {children}
    </div>
  )
}

interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg'
}

export function CardBody({ padding = 'md', className = '', children, ...props }: CardBodyProps) {
  const paddings = { sm: 'p-4', md: 'p-6', lg: 'p-8' }
  return (
    <div className={`${paddings[padding]} ${className}`} {...props}>
      {children}
    </div>
  )
}
