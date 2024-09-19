import React, { useState, useEffect } from 'react';
import RestaurantDashboard from './features/restaurants/RestaurantDashboard';
import Auth from './components/Auth';
import { getCurrentUser } from './supabaseClient';
import ErrorBoundary from './ErrorBoundary';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <ErrorBoundary>
      {user ? (
        <RestaurantDashboard user={user} setUser={setUser} />
      ) : (
        <Auth setUser={setUser} />
      )}
    </ErrorBoundary>
  );
}

export default App;