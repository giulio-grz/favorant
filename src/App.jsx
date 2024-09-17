import React from 'react';
import RestaurantDashboard from './features/restaurants/RestaurantDashboard';
import ErrorBoundary from './ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <RestaurantDashboard />
    </ErrorBoundary>
  );
}

export default App;