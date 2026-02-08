import React from 'react'

type ErrorBoundaryState = {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-diner-cream flex items-center justify-center p-4">
          <div className="card max-w-md w-full text-center">
            <div className="text-6xl mb-4">😵</div>
            <h1 className="font-heading text-3xl text-diner-red mb-4">
              Bir şeyler ters gitti!
            </h1>
            <p className="font-body text-diner-chocolate-light mb-6">
              Üzgünüz, beklenmedik bir hata oluştu. Sayfayı yenilemeyi deneyin.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="btn-primary"
              >
                Sayfayı Yenile
              </button>
              <a href="/" className="btn-secondary">
                Ana Sayfa
              </a>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
