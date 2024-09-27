import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RestaurantList from './components/RestaurantList';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import { useRestaurants } from './hooks/useRestaurants';
import { copyRestaurant, getProfile } from '@/supabaseClient';
import SearchBar from './components/SearchBar';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/**
 * RestaurantDashboard Component
 * 
 * This component displays a dashboard of restaurants, either for the current user
 * or for a viewed user's profile. It includes tabs for filtering restaurants,
 * a search bar, and a list of restaurants.
 * 
 * @param {Object} props
 * @param {Object} props.user - The current logged-in user
 * @param {Object} props.filters - The current filter settings
 * @param {Function} props.setFilters - Function to update filters
 * @param {string} props.sortOption - The current sort option
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
  } = useRestaurants(viewingUserId, isViewingOwnRestaurants, filters, sortOption, searchQuery);

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
      
      return matchesTab;
    });
  }, [restaurants, activeTab]);

  // Helper function to get initials from a name
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {!isViewingOwnRestaurants && viewingUserProfile && (
          <div className="flex items-center space-x-4 mb-6 sm:mb-8">
            <Avatar className="h-10 w-10">
              <AvatarImage src={viewingUserProfile.avatar_url} alt={viewingUserProfile.username} />
              <AvatarFallback>{getInitials(viewingUserProfile.username)}</AvatarFallback>
            </Avatar>
            <h2 className="text-lg font-semibold text-slate-600">
              {viewingUserProfile.username}
            </h2>
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="order-2 sm:order-1 w-full sm:w-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
              <TabsList className="w-full sm:w-auto justify-start">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="visited">Visited</TabsTrigger>
                <TabsTrigger value="toTry">To Try</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="order-1 sm:order-2 w-full sm:w-64">
            <SearchBar onSearch={handleSearch} />
          </div>
        </div>
      </div>

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