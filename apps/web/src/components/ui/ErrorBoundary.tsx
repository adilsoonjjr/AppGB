'use client'

import { Component, type ReactNode } from 'react'
import { RefreshCw, AlertCircle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="min-h-[200px] flex flex-col items-center justify-center p-8 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
            <AlertCircle size={24} className="text-red-500" />
          </div>
          <p className="font-semibold text-gray-800 mb-1">Algo deu errado</p>
          <p className="text-sm text-gray-400 mb-4">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="flex items-center gap-2 text-sm font-semibold text-amber-600 hover:text-amber-700 transition"
          >
            <RefreshCw size={14} />
            Tentar novamente
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
