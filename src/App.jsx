import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
  useNavigate,
  useLocation
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
const UserProfilePage = lazy(() => import('@/features/restaurants/UserProfilePage'));
const ActivityFeed = lazy(() => import('@/features/restaurants/components/ActivityFeed'));
const UserSearch = lazy(() => import('./features/users/UserSearch'));

// Wrap the RestaurantDashboard route in a component that can use hooks
const DashboardWrapper = ({ user, filters, setFilters, sortOption, setSortOption }) => {
  const location = useLocation();
  return (
    <RestaurantDashboard 
      user={user}
      filters={filters}
      setFilters={setFilters}
      sortOption={sortOption}
      setSortOption={setSortOption}
      initialTab={location.state?.tab || 'all'}
    />
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  const { 
    types, 
    cities, 
    setTypes,
    setCities,
    loading: entitiesLoading, 
    error: entitiesError 
  } = useTypesAndCities();

  // Initialize auth and handle session changes
  useEffect(() => {
    let mounted = true;
    let authTimeout;
    let sessionTimeout;

    const initializeAuth = async () => {
      try {
        setLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (session?.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            throw profileError;
          }

          if (mounted) {
            setUser({ ...session.user, profile: profile || null });
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setError(error.message);
        }
      } finally {
        if (mounted) {
          setAuthInitialized(true);
          setLoading(false);
        }
      }
    };

    // Set up auth state change subscription with debounce
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      clearTimeout(authTimeout);
      
      authTimeout = setTimeout(async () => {
        if (!mounted) return;

        try {
          if (session?.user) {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profileError && profileError.code !== 'PGRST116') {
              throw profileError;
            }

            setUser({ ...session.user, profile: profile || null });
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error('Auth state change error:', error);
          setError(error.message);
        }
      }, 100);
    });

    // Set up session refresh interval
    sessionTimeout = setInterval(async () => {
      if (!mounted) return;
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!error && session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (mounted) {
            setUser(prev => ({ ...prev, ...session.user, profile }));
          }
        }
      } catch (error) {
        console.error('Session refresh error:', error);
      }
    }, 300000); // 5 minutes

    // Initialize auth
    initializeAuth();

    // Cleanup
    return () => {
      mounted = false;
      clearTimeout(authTimeout);
      clearInterval(sessionTimeout);
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
    setRestaurants(prevRestaurants => 
      prevRestaurants.filter(restaurant => restaurant.id !== id)
    );
  }, []);

  const handleApplyFilters = useCallback((newFilters, newSortOption) => {
    setFilters(newFilters);
    setSortOption(newSortOption);
  }, []);

  // Handle loading states
  if (!authInitialized || loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg max-w-md">
          <h2 className="font-semibold mb-2">Error Initializing App</h2>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => {
              localStorage.removeItem('supabase.auth.token');
              window.location.reload();
            }}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
          >
            Clear Cache & Retry
          </button>
        </div>
      </div>
    );
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
                    <DashboardWrapper 
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
                path="/profile/:id" 
                element={
                  user ? (
                    <UserProfilePage 
                      currentUser={user}
                    />
                  ) : (
                    <Navigate to="/auth" replace />
                  )
                } 
              />
              <Route 
                path="/feed" 
                element={
                  user ? (
                    <ActivityFeed user={user} />
                  ) : (
                    <Navigate to="/auth" replace />
                  )
                } 
              />
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
                path="/add" 
                element={
                  user ? (
                    <AddEditRestaurant 
                      user={user}
                      types={types}
                      cities={cities}
                      restaurants={restaurants}
                      addLocalRestaurant={addLocalRestaurant}
                      updateLocalRestaurant={updateLocalRestaurant}
                      setTypes={setTypes}
                      setCities={setCities}
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
              <Route 
                path="/search" 
                element={
                  user ? (
                    <UserSearch user={user} />
                  ) : (
                    <Navigate to="/auth" replace />
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