import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import RestaurantList from './components/RestaurantList';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { useRestaurants } from './hooks/useRestaurants';
import { copyRestaurant, getProfile } from '../../supabaseClient';

const RestaurantDashboard = ({ 
  user, 
  filters, 
  setFilters, 
  sortOption, 
  setSortOption
}) => {
  const { userId: routeUserId } = useParams();
  const navigate = useNavigate();
  const [viewingUserId, setViewingUserId] = useState(routeUserId || user.id);
  const [viewingUserProfile, setViewingUserProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  const isViewingOwnRestaurants = viewingUserId === user.id;

  const { 
    restaurants, 
    loading, 
    error,
    totalCount,
    fetchRestaurants,
    addLocalRestaurant,
  } = useRestaurants(viewingUserId, isViewingOwnRestaurants, filters, sortOption);

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
    fetchRestaurants();
  }, [viewingUserId, user.id, fetchRestaurants]);

  const handleCopy = useCallback(async (restaurantId) => {
    try {
      const copiedRestaurant = await copyRestaurant(user.id, restaurantId);
      addLocalRestaurant(copiedRestaurant);
      alert('Restaurant copied to your list!');
    } catch (error) {
      console.error('Error copying restaurant:', error);
      alert('Failed to copy restaurant: ' + error.message);
    }
  }, [user.id, addLocalRestaurant]);

  const handleRestaurantClick = useCallback((restaurantId) => {
    navigate(`/restaurant/${restaurantId}`);
  }, [navigate]);

  const filteredRestaurants = restaurants.filter(restaurant => {
    if (activeTab === 'visited') return !restaurant.to_try;
    if (activeTab === 'toTry') return restaurant.to_try;
    return true;
  });

  if (loading && restaurants.length === 0) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="space-y-6">
      {!isViewingOwnRestaurants && viewingUserProfile && (
        <h2 className="text-xl font-bold mb-4">
          {viewingUserProfile.username}'s Restaurants
        </h2>
      )}
      {isViewingOwnRestaurants && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="visited">Visited</TabsTrigger>
            <TabsTrigger value="toTry">To Try</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <RestaurantList 
              restaurants={filteredRestaurants}
              totalCount={totalCount}
              loading={loading}
              currentUserId={user.id}
              onCopy={handleCopy}
              onRestaurantClick={handleRestaurantClick}
              showCopyButton={!isViewingOwnRestaurants}
            />
          </TabsContent>
          <TabsContent value="visited">
            <RestaurantList 
              restaurants={filteredRestaurants}
              totalCount={totalCount}
              loading={loading}
              currentUserId={user.id}
              onCopy={handleCopy}
              onRestaurantClick={handleRestaurantClick}
              showCopyButton={!isViewingOwnRestaurants}
            />
          </TabsContent>
          <TabsContent value="toTry">
            <RestaurantList 
              restaurants={filteredRestaurants}
              totalCount={totalCount}
              loading={loading}
              currentUserId={user.id}
              onCopy={handleCopy}
              onRestaurantClick={handleRestaurantClick}
              showCopyButton={!isViewingOwnRestaurants}
            />
          </TabsContent>
        </Tabs>
      )}
      {!isViewingOwnRestaurants && (
        <RestaurantList 
          restaurants={restaurants}
          totalCount={totalCount}
          loading={loading}
          currentUserId={user.id}
          onCopy={handleCopy}
          onRestaurantClick={handleRestaurantClick}
          showCopyButton={true}
        />
      )}
    </div>
  );
};

export default RestaurantDashboard;