import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getCurrentUser, supabase } from './supabaseClient';
import { useTypesAndCities } from './features/restaurants/hooks/useTypesAndCities';
import ErrorBoundary from './ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import Header from './components/Header';

// Lazy load components
const Auth = lazy(() => import('./components/Auth'));
const RestaurantDashboard = lazy(() => import('./features/restaurants/RestaurantDashboard'));
const RestaurantDetails = lazy(() => import('./features/restaurants/components/RestaurantDetails'));
const AddEditRestaurant = lazy(() => import('./features/restaurants/components/AddEditRestaurant'));
const UserSettings = lazy(() => import('./features/restaurants/UserSettings'));
const RestaurantFilter = lazy(() => import('./features/restaurants/components/RestaurantFilter'));
const AdminDashboard = lazy(() => import('./features/admin/AdminDashboard'));

function App() {
  const [user, setUser] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [filters, setFilters] = useState({
    name: '',
    type_id: null,
    city_id: null,
    status: null,
    rating: 0,
    price: null
  });
  const [sortOption, setSortOption] = useState('dateAdded');

  const { types, cities } = useTypesAndCities();

  // Handle auth state changes
  useEffect(() => {
    let mounted = true;
  
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (!mounted) return;
  
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        try {
          const { user } = session;
          
          // Check if profile exists
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
  
          if (!existingProfile) {
            // Create profile if it doesn't exist
            const profile = await createProfile(
              user.id, 
              user.email, 
              user.user_metadata?.username || user.email
            );
            setUser({ ...user, profile });
          } else {
            setUser({ ...user, profile: existingProfile });
          }
          
          setVerificationMessage('');
        } catch (error) {
          console.error('Error handling sign in:', error);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
      setLoading(false);
    });
  
    // Check for direct sign-in after email verification
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session) {
          const { user } = session;
          // Check if profile exists
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
  
          if (!existingProfile) {
            // Create profile if it doesn't exist
            const profile = await createProfile(
              user.id, 
              user.email, 
              user.user_metadata?.username || user.email
            );
            setUser({ ...user, profile });
          } else {
            setUser({ ...user, profile: existingProfile });
          }
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
  
    initializeAuth();
  
    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const addLocalRestaurant = useCallback((newRestaurant) => {
    setRestaurants(prevRestaurants => [newRestaurant, ...prevRestaurants]);
  }, []);

  const updateLocalRestaurant = useCallback((updatedRestaurant) => {
    setRestaurants(prevRestaurants =>
      prevRestaurants.map(restaurant =>
        restaurant.id === updatedRestaurant.id ? updatedRestaurant : restaurant
      )
    );
  }, []);

  const deleteLocalRestaurant = useCallback((id) => {
    setRestaurants(prevRestaurants => prevRestaurants.filter(restaurant => restaurant.id !== id));
  }, []);

  const handleApplyFilters = useCallback((newFilters, newSortOption) => {
    setFilters(newFilters);
    setSortOption(newSortOption);
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <ErrorBoundary>
      <Router>
        {user && <Header user={user} setUser={setUser} />}
        <main className="max-w-full px-[5vw] sm:px-[10vw] lg:px-[16vw]">
          <Suspense fallback={<LoadingSpinner />}>
            {verificationMessage && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mt-4 mb-4">
                {verificationMessage}
              </div>
            )}
            <Routes>
              <Route 
                path="/auth" 
                element={
                  user ? (
                    <Navigate to="/" replace /> 
                  ) : (
                    <Auth 
                      setUser={setUser} 
                      setVerificationMessage={setVerificationMessage}
                    />
                  )
                } 
              />
              <Route 
                path="/" 
                element={
                  user ? (
                    <RestaurantDashboard 
                      user={user}
                      filters={filters}
                      setFilters={setFilters}
                      sortOption={sortOption}
                      setSortOption={setSortOption}
                    />
                  ) : (
                    <Navigate to="/auth" replace />
                  )
                } 
              />
              <Route 
                path="/user/:id" 
                element={
                  user ? (
                    <RestaurantDashboard 
                      user={user}
                      filters={filters}
                      setFilters={setFilters}
                      sortOption={sortOption}
                      setSortOption={setSortOption}
                    />
                  ) : (
                    <Navigate to="/auth" replace />
                  )
                } 
              />
              <Route 
                path="/user/:userId/restaurant/:id" 
                element={
                  user ? (
                    <RestaurantDetails 
                      user={user}
                      updateLocalRestaurant={updateLocalRestaurant}
                      deleteLocalRestaurant={deleteLocalRestaurant}
                      addLocalRestaurant={addLocalRestaurant}
                    />
                  ) : (
                    <Navigate to="/auth" replace />
                  )
                } 
              />
              <Route 
                path="/restaurant/:id" 
                element={
                  user ? (
                    <RestaurantDetails 
                      user={user}
                      updateLocalRestaurant={updateLocalRestaurant}
                      deleteLocalRestaurant={deleteLocalRestaurant}
                      addLocalRestaurant={addLocalRestaurant}
                    />
                  ) : (
                    <Navigate to="/auth" replace />
                  )
                } 
              />
              <Route 
                path="/add" 
                element={
                  user ? (
                    <AddEditRestaurant 
                      user={user}
                      types={types}
                      cities={cities}
                      addLocalRestaurant={addLocalRestaurant}
                      updateLocalRestaurant={updateLocalRestaurant}
                      restaurants={restaurants}
                    />
                  ) : (
                    <Navigate to="/auth" replace />
                  )
                } 
              />
              <Route 
                path="/edit/:id" 
                element={
                  user ? (
                    <AddEditRestaurant 
                      user={user}
                      types={types}
                      cities={cities}
                      addLocalRestaurant={addLocalRestaurant}
                      updateLocalRestaurant={updateLocalRestaurant}
                      restaurants={restaurants}
                    />
                  ) : (
                    <Navigate to="/auth" replace />
                  )
                } 
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
                path="/filter" 
                element={
                  user ? (
                    <RestaurantFilter 
                      filters={filters}
                      setFilters={setFilters}
                      sortOption={sortOption}
                      setSortOption={setSortOption}
                      types={types}
                      cities={cities}
                      onApplyFilters={handleApplyFilters}
                    />
                  ) : (
                    <Navigate to="/auth" replace />
                  )
                } 
              />
              <Route 
                path="/admin" 
                element={
                  user && user.profile?.is_admin ? (
                    <AdminDashboard />
                  ) : (
                    <Navigate to="/" replace />
                  )
                } 
              />
            </Routes>
          </Suspense>
        </main>
      </Router>
    </ErrorBoundary>
  );
}

export default App;