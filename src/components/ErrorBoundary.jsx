import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface flex items-center justify-center px-4">
          <div className="bg-surface-card border border-border rounded-xl p-8 max-w-md text-center">
            <h2 className="text-xl font-semibold text-cream mb-2">Something went wrong</h2>
            <p className="text-sm text-muted mb-6">An unexpected error occurred. Please refresh the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="py-2 px-6 rounded-lg bg-caramel text-surface font-semibold text-sm hover:bg-caramel-light transition"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
