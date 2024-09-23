import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import RestaurantList from './components/RestaurantList';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { useRestaurants } from './hooks/useRestaurants';
import { likeRestaurant, unlikeRestaurant, getProfile } from '../../supabaseClient';

/**
 * RestaurantDashboard Component
 * 
 * This component serves as the main dashboard for displaying restaurants.
 * It handles fetching restaurants, likes/unlikes, and navigation to restaurant details.
 * 
 * @param {Object} props
 * @param {Object} props.user - Current user object
 * @param {Object} props.filters - Applied filters for restaurants
 * @param {Function} props.setFilters - Function to update filters
 * @param {string} props.sortOption - Current sort option
 * @param {Function} props.setSortOption - Function to update sort option
 */
const RestaurantDashboard = ({ 
  user, 
  filters, 
  setFilters, 
  sortOption, 
  setSortOption
}) => {
  const { userId: routeUserId } = useParams();
  const navigate = useNavigate();
  const [viewingUserId, setViewingUserId] = useState(user.id);
  const [viewingUserProfile, setViewingUserProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('myRestaurants');

  useEffect(() => {
    setViewingUserId(routeUserId || user.id);
  }, [routeUserId, user.id]);

  useEffect(() => {
    const fetchViewingUserProfile = async () => {
      if (viewingUserId !== user.id) {
        try {
          const profile = await getProfile(viewingUserId);
          setViewingUserProfile(profile);
        } catch (error) {
          console.error('Error fetching viewing user profile:', error);
        }
      } else {
        setViewingUserProfile(null);
      }
    };

    fetchViewingUserProfile();
  }, [viewingUserId, user.id]);

  const { 
    restaurants, 
    loading, 
    error,
    totalCount,
    loadMore,
    updateLocalRestaurant,
    addLocalRestaurant,
    deleteLocalRestaurant,
    fetchRestaurants
  } = useRestaurants(user.id, viewingUserId, filters, sortOption, activeTab);

  const handleLike = useCallback(async (restaurantId) => {
    try {
      await likeRestaurant(user.id, restaurantId);
      updateLocalRestaurant({ id: restaurantId, isLiked: true });
    } catch (error) {
      console.error('Error liking restaurant:', error);
    }
  }, [user.id, updateLocalRestaurant]);

  const handleUnlike = useCallback(async (restaurantId) => {
    try {
      await unlikeRestaurant(user.id, restaurantId);
      updateLocalRestaurant({ id: restaurantId, isLiked: false });
    } catch (error) {
      console.error('Error unliking restaurant:', error);
    }
  }, [user.id, updateLocalRestaurant]);

  const handleRestaurantClick = useCallback((restaurantId) => {
    navigate(`/restaurant/${restaurantId}`);
  }, [navigate]);

  const isViewingOwnProfile = viewingUserId === user.id;

  if (loading && restaurants.length === 0) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="space-y-6">
      {isViewingOwnProfile ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="myRestaurants">My Restaurants</TabsTrigger>
            <TabsTrigger value="likedRestaurants">Liked Restaurants</TabsTrigger>
          </TabsList>
          <TabsContent value="myRestaurants">
            <RestaurantList 
              restaurants={restaurants}
              onLoadMore={loadMore}
              totalCount={totalCount}
              loading={loading}
              currentUserId={user.id}
              onRestaurantClick={handleRestaurantClick}
              showLikeButtons={false}
            />
          </TabsContent>
          <TabsContent value="likedRestaurants">
            <RestaurantList 
              restaurants={restaurants}
              onLoadMore={loadMore}
              totalCount={totalCount}
              loading={loading}
              currentUserId={user.id}
              onLike={handleLike}
              onUnlike={handleUnlike}
              onRestaurantClick={handleRestaurantClick}
              showLikeButtons={true}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <div>
          <h2 className="text-2xl font-bold mb-4">
            {viewingUserProfile?.username}'s Restaurants
          </h2>
          <RestaurantList 
            restaurants={restaurants}
            onLoadMore={loadMore}
            totalCount={totalCount}
            loading={loading}
            currentUserId={user.id}
            onLike={handleLike}
            onUnlike={handleUnlike}
            onRestaurantClick={handleRestaurantClick}
            showLikeButtons={true}
          />
        </div>
      )}
    </div>
  );
};

export default RestaurantDashboard;