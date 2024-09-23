import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';

export const useRestaurants = (currentUserId, targetUserId, filters, sortOption, activeTab) => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchRestaurants = useCallback(async () => {
    console.log('fetchRestaurants called with:', { currentUserId, targetUserId, filters, sortOption, activeTab });
    
    if (!targetUserId) {
      console.log('No target user ID, skipping fetch');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('restaurants')
        .select('*, restaurant_types(*), cities(*)', { count: 'exact' });

      console.log('Initial query setup complete');

      if (currentUserId === targetUserId) {
        console.log('Viewing own profile');
        if (activeTab === 'myRestaurants') {
          query = query.eq('user_id', currentUserId);
          console.log('Fetching my restaurants');
        } else if (activeTab === 'likedRestaurants') {
          console.log('Fetching liked restaurants');
          const { data: likedRestaurants } = await supabase
            .from('liked_restaurants')
            .select('restaurant_id')
            .eq('user_id', currentUserId);

          console.log('Liked restaurants:', likedRestaurants);

          const likedIds = likedRestaurants.map(lr => lr.restaurant_id);
          query = query.in('id', likedIds);
        }
      } else {
        console.log('Viewing another user\'s profile');
        query = query.eq('user_id', targetUserId);
      }

      console.log('Query after user check');

      // Apply filters
      if (filters.name) query = query.ilike('name', `%${filters.name}%`);
      if (filters.type_id) query = query.eq('type_id', filters.type_id);
      if (filters.city_id) query = query.eq('city_id', filters.city_id);
      if (filters.price) query = query.eq('price', filters.price);
      if (filters.toTry === true) {
        query = query.eq('to_try', true);
      } else if (filters.toTry === false) {
        query = query.eq('to_try', false);
        if (filters.rating > 0) query = query.gte('rating', filters.rating);
      }

      // Apply sorting
      switch (sortOption) {
        case 'name':
          query = query.order('name');
          break;
        case 'rating':
          query = query.order('rating', { ascending: false });
          break;
        case 'dateAdded':
        default:
          query = query.order('created_at', { ascending: false });
      }

      console.log('Final query setup complete');

      const { data, error, count } = await query;

      if (error) throw error;

      console.log('Fetched restaurants:', data);

      const { data: likedRestaurants } = await supabase
        .from('liked_restaurants')
        .select('restaurant_id')
        .eq('user_id', currentUserId);

      console.log('Liked restaurants for current user:', likedRestaurants);

      const likedIds = new Set(likedRestaurants.map(lr => lr.restaurant_id));

      const restaurantsWithLikedStatus = data.map(restaurant => ({
        ...restaurant,
        isLiked: likedIds.has(restaurant.id)
      }));

      console.log('Restaurants with liked status:', restaurantsWithLikedStatus);

      setRestaurants(restaurantsWithLikedStatus);
      setTotalCount(count);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, targetUserId, filters, sortOption, activeTab]);

  useEffect(() => {
    console.log('useEffect triggered, calling fetchRestaurants');
    fetchRestaurants();
  }, [fetchRestaurants]);

  const loadMore = useCallback(async () => {
    console.log('Load more functionality not yet implemented');
  }, []);

  const updateLocalRestaurant = useCallback((updatedRestaurant) => {
    setRestaurants(prevRestaurants =>
      prevRestaurants.map(restaurant =>
        restaurant.id === updatedRestaurant.id ? { ...restaurant, ...updatedRestaurant } : restaurant
      )
    );
  }, []);

  const addLocalRestaurant = useCallback((newRestaurant) => {
    setRestaurants(prevRestaurants => [newRestaurant, ...prevRestaurants]);
  }, []);

  const deleteLocalRestaurant = useCallback((id) => {
    setRestaurants(prevRestaurants => prevRestaurants.filter(restaurant => restaurant.id !== id));
  }, []);

  return { 
    restaurants, 
    loading, 
    error, 
    fetchRestaurants,
    totalCount,
    loadMore,
    updateLocalRestaurant,
    addLocalRestaurant,
    deleteLocalRestaurant
  };
};