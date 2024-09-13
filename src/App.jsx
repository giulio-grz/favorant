import React from 'react';
import RestaurantDashboard from './RestaurantDashboard';
import ErrorBoundary from './ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <RestaurantDashboard />
    </ErrorBoundary>
  );
}

export default App;