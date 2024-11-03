import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorCount: 0,
      lastError: null,
      lastErrorTime: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const now = new Date().getTime();
    
    this.setState(prevState => {
      // Reset error count if last error was more than 5 minutes ago
      const errorCount = (prevState.lastErrorTime && (now - prevState.lastErrorTime) < 300000)
        ? prevState.errorCount + 1
        : 1;

      return {
        error,
        errorInfo,
        errorCount,
        lastError: error,
        lastErrorTime: now
      };
    });

    // Log to console and potentially to an error reporting service
    console.error('Error caught by boundary:', {
      error,
      errorInfo,
      component: this.props.name || 'Unknown'
    });
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorCount: 0,
      lastError: null,
      lastErrorTime: null
    });
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    // Clear any cached state that might be causing issues
    localStorage.removeItem('supabase.auth.token');
    sessionStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // If we've hit too many errors in a short time
      if (this.state.errorCount >= 3) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                  Something's not right
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  We're having trouble loading this page. This might be due to network issues or cached data.
                </p>
              </div>
              <div className="mt-5 space-y-2">
                <Button
                  onClick={this.handleReload}
                  className="w-full"
                >
                  Clear Cache & Reload
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  If the problem persists, try clearing your browser cache or using a private/incognito window.
                </p>
              </div>
            </div>
          </div>
        );
      }

      // First few errors, show reset option
      return (
        <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h3 className="text-sm font-medium text-red-800">
              Something went wrong
            </h3>
          </div>
          <div className="mt-4 text-sm text-red-700">
            <p>Try these steps to get back on track:</p>
            <div className="mt-3 flex space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
              >
                Try Again
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReload}
              >
                Reload Page
              </Button>
            </div>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-xs text-red-800">
              <summary className="cursor-pointer">Error details</summary>
              <pre className="mt-2 whitespace-pre-wrap">
                {this.state.error?.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;