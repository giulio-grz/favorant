import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getCurrentUser } from './supabaseClient';
import { useRestaurants } from './features/restaurants/hooks/useRestaurants';
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

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    name: '',
    type_id: null,
    city_id: null,
    toTry: null,
    rating: 0,
    price: null
  });
  const [sortOption, setSortOption] = useState('dateAdded');

  const { types, cities, addType, editType, deleteType, addCity, editCity, deleteCity } = useTypesAndCities();

  const { 
    restaurants, 
    loading: restaurantsLoading, 
    error: restaurantsError,
    fetchRestaurants,
    totalCount,
    loadMore,
    updateLocalRestaurant,
    addLocalRestaurant,
    deleteLocalRestaurant
  } = useRestaurants(user?.id, true, filters, sortOption);

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

  useEffect(() => {
    if (user) {
      fetchRestaurants();
    }
  }, [user, fetchRestaurants, filters, sortOption]);

  const handleApplyFilters = useCallback((newFilters, newSortOption) => {
    setFilters(newFilters);
    setSortOption(newSortOption);
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <ErrorBoundary>
      <Router>
        {user && <Header user={user} setUser={setUser} />}
        <main className="max-w-full px-[5vw] sm:px-[10vw] lg:px-[16vw]">
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route 
                path="/auth" 
                element={user ? <Navigate to="/" replace /> : <Auth setUser={setUser} />} 
              />
              <Route 
                path="/" 
                element={
                  user ? (
                    <RestaurantDashboard 
                      user={user} 
                      restaurants={restaurants}
                      loading={restaurantsLoading}
                      error={restaurantsError}
                      totalCount={totalCount}
                      loadMore={loadMore}
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
                path="/user/:userId" 
                element={
                  user ? (
                    <RestaurantDashboard 
                      user={user} 
                      restaurants={restaurants}
                      loading={restaurantsLoading}
                      error={restaurantsError}
                      totalCount={totalCount}
                      loadMore={loadMore}
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
                      addType={addType}
                      editType={editType}
                      deleteType={deleteType}
                      addCity={addCity}
                      editCity={editCity}
                      deleteCity={deleteCity}
                      addLocalRestaurant={addLocalRestaurant}
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
                      addType={addType}
                      editType={editType}
                      deleteType={deleteType}
                      addCity={addCity}
                      editCity={editCity}
                      deleteCity={deleteCity}
                      updateLocalRestaurant={updateLocalRestaurant}
                    />
                  ) : (
                    <Navigate to="/auth" replace />
                  )
                } 
              />
              <Route 
                path="/settings" 
                element={user ? <UserSettings user={user} setUser={setUser} /> : <Navigate to="/auth" replace />} 
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
            </Routes>
          </Suspense>
        </main>
      </Router>
    </ErrorBoundary>
  );
}

export default App;