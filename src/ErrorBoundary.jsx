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
      errorCount: 0 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Update error count
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

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
      errorInfo: null 
    });
    
    // If provided, call the reset handler
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Check if we've hit too many errors
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
                  We're having trouble loading this page. Please try refreshing or come back later.
                </p>
              </div>
              <div className="mt-5">
                <Button
                  onClick={this.handleReload}
                  className="w-full"
                >
                  Reload Page
                </Button>
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