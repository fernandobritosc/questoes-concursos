import { Component } from 'react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Erro capturado:', error)
    console.error('[ErrorBoundary] Stack:', info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <p className="text-red-500 font-bold">Erro ao renderizar página</p>
          <pre className="text-xs mt-4 text-left bg-muted p-4 rounded overflow-auto max-h-96">
            {this.state.error?.message}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
