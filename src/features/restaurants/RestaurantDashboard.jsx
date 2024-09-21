import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { getProfile, likeRestaurant, unlikeRestaurant } from '../../supabaseClient';
import { useRestaurants } from './hooks/useRestaurants';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import RestaurantList from './components/RestaurantList';
import RestaurantDetails from './components/RestaurantDetails';
import AddEditRestaurant from './components/AddEditRestaurant';
import RestaurantFilter from './components/RestaurantFilter';
import { useTypesAndCities } from './hooks/useTypesAndCities';
import { useRestaurantOperations } from './hooks/useRestaurantOperations';
import MobileMenu from './MobileMenu';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { ArrowLeft } from 'lucide-react';

/**
 * RestaurantDashboard Component
 * 
 * This is the main component for the restaurant dashboard. It handles the overall
 * state management and routing for the restaurant-related features.
 * 
 * @param {Object} props
 * @param {Object} props.user - The current user object
 * @param {Function} props.setUser - Function to update the user state
 */
const RestaurantDashboard = ({ user, setUser }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // State for managing the viewed user
  const [viewingUserId, setViewingUserId] = useState(user?.id);
  const [viewingProfile, setViewingProfile] = useState(null);

  // State for filters and sorting
  const [filters, setFilters] = useState({
    name: '',
    type_id: null,
    city_id: null,
    toTry: null,
    rating: 0,
    price: null
  });
  const [sortOption, setSortOption] = useState('dateAdded');

  // State for managing tabs
  const [activeTab, setActiveTab] = useState('myRestaurants');

  // Custom hooks for managing types, cities, and restaurant operations
  const { types, cities, addType, editType, deleteType, addCity, editCity, deleteCity } = useTypesAndCities();
  const { addRestaurant, updateRestaurant, deleteRestaurant } = useRestaurantOperations();
  
  // Custom hook for fetching and managing restaurants
  const { 
    restaurants, 
    setRestaurants,
    loading, 
    error, 
    fetchRestaurants, 
    totalCount,
    loadMore: loadMoreRestaurants
  } = useRestaurants(user.id, viewingUserId, filters, sortOption, activeTab);

  // Effect to fetch the profile when the viewing user changes
  useEffect(() => {
    if (viewingUserId) {
      const fetchProfile = async () => {
        try {
          const profile = await getProfile(viewingUserId);
          setViewingProfile(profile);
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      };
      fetchProfile();
    }
  }, [viewingUserId]);

  // Effect to fetch restaurants when relevant parameters change
  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants, activeTab, viewingUserId]);

  /**
   * Handles the selection of a user from the search results
   * @param {Object} selectedUser - The selected user object
   */
  const handleUserSelect = useCallback((selectedUser) => {
    setViewingUserId(selectedUser.id);
    setViewingProfile(selectedUser);
    setActiveTab('myRestaurants');
    navigate('/');
  }, [navigate]);

  /**
   * Handles loading more restaurants
   * @param {Event} e - The event object
   */
  const handleLoadMore = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    loadMoreRestaurants();
  }, [loadMoreRestaurants]);

  /**
   * Handles navigation back to the previous page or to the main dashboard
   */
  const handleBack = useCallback(() => {
    if (viewingUserId !== user.id) {
      setViewingUserId(user.id);
      setViewingProfile(null);
      setActiveTab('myRestaurants');
      navigate('/');
    } else {
      navigate(-1);
    }
  }, [navigate, viewingUserId, user.id]);

  /**
   * Handles liking a restaurant
   * @param {string} restaurantId - The ID of the restaurant to like
   */
  const handleLike = async (restaurantId) => {
    try {
      await likeRestaurant(user.id, restaurantId);
      setRestaurants(prevRestaurants => 
        prevRestaurants.map(r => 
          r.id === restaurantId ? { ...r, isLiked: true } : r
        )
      );
    } catch (error) {
      console.error('Failed to like restaurant:', error);
      alert('Failed to like restaurant: ' + error.message);
    }
  };

  /**
   * Handles unliking a restaurant
   * @param {string} restaurantId - The ID of the restaurant to unlike
   */
  const handleUnlike = async (restaurantId) => {
    try {
      await unlikeRestaurant(user.id, restaurantId);
      setRestaurants(prevRestaurants => 
        prevRestaurants.map(r => 
          r.id === restaurantId ? { ...r, isLiked: false } : r
        )
      );
      if (activeTab === 'likedRestaurants') {
        setRestaurants(prevRestaurants => 
          prevRestaurants.filter(r => r.id !== restaurantId)
        );
      }
    } catch (error) {
      console.error('Failed to unlike restaurant:', error);
      alert('Failed to unlike restaurant: ' + error.message);
    }
  };

  /**
   * BackButton Component
   * Renders a back button that uses the handleBack function
   */
  const BackButton = () => (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className="mb-0"
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      Back
    </Button>
  );

  // Show loading spinner when loading and no restaurants are available
  if (loading && restaurants.length === 0) return <LoadingSpinner />;
  // Show error message if there's an error
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mt-8">
        <div className="flex justify-between items-center mb-6">
          {location.pathname === '/' && viewingUserId === user.id ? (
            <h1 className="text-lg font-bold">{viewingProfile.username}'s Favorants</h1>
          ) : (
            <div className="flex items-center">
              <BackButton />
              {viewingProfile && location.pathname === '/' && (
                <h1 className="text-lg font-bold ml-4">{viewingProfile.username}'s Favorants</h1>
              )}
            </div>
          )}
          <MobileMenu 
            onAddClick={() => navigate('/add')}
            onFilterClick={() => navigate('/filter')}
            onUserSelect={handleUserSelect}
            currentUserId={user.id}
            user={user}
            setUser={setUser}
            canAdd={user.id === viewingUserId}
          />
        </div>
      </div>
      
      <Routes>
        <Route 
          path="/" 
          element={
            viewingUserId === user.id ? (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="myRestaurants">My Restaurants</TabsTrigger>
                  <TabsTrigger value="likedRestaurants">Liked Restaurants</TabsTrigger>
                </TabsList>
                <TabsContent value="myRestaurants">
                  <RestaurantList 
                    restaurants={restaurants}
                    onLoadMore={handleLoadMore}
                    totalCount={totalCount}
                    loading={loading}
                    currentUserId={user.id}
                    onLike={handleLike}
                    onUnlike={handleUnlike}
                  />
                </TabsContent>
                <TabsContent value="likedRestaurants">
                  <RestaurantList 
                    restaurants={restaurants}
                    onLoadMore={handleLoadMore}
                    totalCount={totalCount}
                    loading={loading}
                    currentUserId={user.id}
                    onLike={handleLike}
                    onUnlike={handleUnlike}
                  />
                </TabsContent>
              </Tabs>
            ) : (
              <RestaurantList 
                restaurants={restaurants}
                onLoadMore={handleLoadMore}
                totalCount={totalCount}
                loading={loading}
                currentUserId={user.id}
                onLike={handleLike}
                onUnlike={handleUnlike}
              />
            )
          } 
        />
        <Route 
          path="/restaurant/:id" 
          element={
            <RestaurantDetails 
              restaurants={restaurants}
              onEdit={(restaurant) => navigate(`/edit/${restaurant.id}`)}
              onDelete={deleteRestaurant}
              currentUserId={user.id}
            />
          } 
        />
        <Route 
          path="/add" 
          element={
            <AddEditRestaurant
              onSave={addRestaurant}
              types={types}
              cities={cities}
              addType={addType}
              editType={editType}
              deleteType={deleteType}
              addCity={addCity}
              editCity={editCity}
              deleteCity={deleteCity}
              userId={user.id}
            />
          } 
        />
        <Route 
          path="/edit/:id" 
          element={
            <AddEditRestaurant
              onSave={updateRestaurant}
              types={types}
              cities={cities}
              addType={addType}
              editType={editType}
              deleteType={deleteType}
              addCity={addCity}
              editCity={editCity}
              deleteCity={deleteCity}
              userId={user.id}
              restaurants={restaurants}
            />
          } 
        />
        <Route 
          path="/filter" 
          element={
            <RestaurantFilter
              types={types}
              cities={cities}
              filters={filters}
              setFilters={setFilters}
              sortOption={sortOption}
              setSortOption={setSortOption}
              onApply={() => navigate('/')}
            />
          } 
        />
      </Routes>
    </div>
  );
};

export default RestaurantDashboard;