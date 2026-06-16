import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  icon?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  children: React.ReactNode
  footer?: React.ReactNode
}

const SIZE_MAP = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
  full: 'max-w-6xl',
}

export function Modal({ isOpen, onClose, title, subtitle, icon, size = 'md', children, footer }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className={`bg-card rounded-2xl border border-border shadow-2xl w-full ${SIZE_MAP[size]} overflow-hidden transform transition-all duration-300 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]`}>
        <div className="px-6 py-4 bg-muted border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            {icon && (
              <div className="p-2 bg-primary/20 rounded-lg text-primary">
                {icon}
              </div>
            )}
            <div>
              <h3 className="text-sm font-black text-foreground">{title}</h3>
              {subtitle && (
                <p className="text-[10px] text-muted-foreground font-bold mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1.5 hover:bg-muted rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 bg-muted border-t border-border flex items-center justify-end gap-3 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
