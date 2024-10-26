import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
  useNavigate
} from 'react-router-dom';
import { getCurrentUser, supabase } from './supabaseClient';
import { useTypesAndCities } from './features/restaurants/hooks/useTypesAndCities';
import ErrorBoundary from './ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import Header from './components/Header';

// Add this at the top, after imports
const createProfile = async (userId, email, username) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          username: username,
          email: email,
          is_admin: false
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating profile:', error);
    throw error;
  }
};

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

  const initializeAuth = async () => {
    try {
      setLoading(true);
      // Get initial session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
  
      if (session?.user) {
        // Get profile in the same try block to ensure atomicity
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profileError) throw profileError;
        
        setUser({ ...session.user, profile });
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      // Clear any partial state on error
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Replace your existing auth useEffect with this
  useEffect(() => {
    // Initialize auth on mount
    initializeAuth();

    // Set up auth state change subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user);

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        try {
          if (!session?.user) {
            console.error('No user in session');
            return;
          }

          // Get profile data
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          setUser({ ...session.user, profile });
          
        } catch (error) {
          console.error('Error handling auth state change:', error);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'TOKEN_REFRESHED') {
        // Re-fetch user data on token refresh
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          setUser({ ...session.user, profile });
        }
      }
    });

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Add this to handle session refresh
  useEffect(() => {
    const refreshSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error refreshing session:', error);
        return;
      }
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        setUser({ ...session.user, profile });
      }
    };

    // Refresh session every 10 minutes
    const intervalId = setInterval(refreshSession, 600000);

    return () => clearInterval(intervalId);
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
              {/* Redirect /restaurant/:id to /user/:userId/restaurant/:id */}
              <Route 
                path="/restaurant/:id" 
                element={
                  user ? (
                    <Navigate 
                      to={`/user/${user.id}/restaurant${window.location.pathname.split('/restaurant')[1]}`} 
                      replace 
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