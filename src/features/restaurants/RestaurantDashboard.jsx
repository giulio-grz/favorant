import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import RestaurantList from './components/RestaurantList';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { useRestaurants } from './hooks/useRestaurants';
import { copyRestaurant, getProfile } from '../../supabaseClient';
import SearchDialog from './components/SearchDialog';

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
  const [searchQuery, setSearchQuery] = useState('');

  const isViewingOwnRestaurants = viewingUserId === user.id;

  const { 
    restaurants, 
    loading, 
    error,
    totalCount,
    hasResults,
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

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(restaurant => {
      const matchesTab = 
        (activeTab === 'all') || 
        (activeTab === 'visited' && !restaurant.to_try) || 
        (activeTab === 'toTry' && restaurant.to_try);
      
      const matchesSearch = searchQuery === '' || 
        restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        restaurant.restaurant_types?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        restaurant.cities?.name.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesTab && matchesSearch;
    });
  }, [restaurants, activeTab, searchQuery]);

  return (
    <div className="space-y-6">
      {isViewingOwnRestaurants ? (
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="visited">Visited</TabsTrigger>
                <TabsTrigger value="toTry">To Try</TabsTrigger>
              </TabsList>
              <SearchDialog onSearch={handleSearch} searchQuery={searchQuery} />
            </div>
          </Tabs>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <h2 className="text-xl font-bold">
            {viewingUserProfile?.username}
          </h2>
          <SearchDialog onSearch={handleSearch} searchQuery={searchQuery} />
        </div>
      )}
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}
      {!loading && !error && (
        <>
          {filteredRestaurants.length > 0 ? (
            <RestaurantList 
              restaurants={filteredRestaurants}
              totalCount={filteredRestaurants.length}
              currentUserId={user.id}
              onCopy={handleCopy}
              onRestaurantClick={handleRestaurantClick}
              showCopyButton={!isViewingOwnRestaurants}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No restaurants found matching your search.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RestaurantDashboard;