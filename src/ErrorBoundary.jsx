import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error('Caught an error:', error, errorInfo);
    // You could also log this error to an error reporting service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <details className="whitespace-pre-wrap">
            <summary className="cursor-pointer mb-2">Error details</summary>
            <p className="mb-2">{this.state.error && this.state.error.toString()}</p>
            <p className="text-sm">
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </p>
          </details>
          <button 
            className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;