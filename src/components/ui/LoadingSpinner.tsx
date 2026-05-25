import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
}

const sizeMap = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
}

/**
 * Spinner de carregamento reutilizável.
 * Quando usado standalone (sem `text`), centra-se dentro do pai.
 */
export function LoadingSpinner({ size = 'lg', text, className = '' }: LoadingSpinnerProps) {
  if (text) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <Loader2 className={`${sizeMap[size]} animate-spin text-primary`} />
        <span className="text-muted-foreground text-sm">{text}</span>
      </div>
    )
  }

  return (
    <div className={`flex h-full items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full border-b-2 border-primary ${sizeMap[size]}`} />
    </div>
  )
}
