import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getCurrentUser } from './supabaseClient';
import Auth from './components/Auth';
import RestaurantDashboard from './features/restaurants/RestaurantDashboard';
import UserSettings from './features/restaurants/UserSettings';
import ErrorBoundary from './ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';

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

  if (loading) return <LoadingSpinner />;

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route 
            path="/auth" 
            element={user ? <Navigate to="/" replace /> : <Auth setUser={setUser} />} 
          />
          <Route 
            path="/settings" 
            element={
              user ? (
                <UserSettings user={user} setUser={setUser} />
              ) : (
                <Navigate to="/auth" replace />
              )
            } 
          />
          <Route 
            path="/*" 
            element={
              user ? (
                <RestaurantDashboard user={user} setUser={setUser} />
              ) : (
                <Navigate to="/auth" replace />
              )
            } 
          />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;