import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';

/**
 * Custom hook for managing restaurant data
 * 
 * @param {string} userId - The ID of the current user
 * @param {string} viewingUserId - The ID of the user whose restaurants are being viewed
 * @param {Object} filters - The filters to apply to the restaurant query
 * @param {string} sortOption - The sorting option for the restaurants
 * @param {string} activeTab - The currently active tab ('myRestaurants' or 'likedRestaurants')
 * @returns {Object} An object containing restaurant data and functions to manage it
 */
export const useRestaurants = (userId, viewingUserId, filters, sortOption, activeTab) => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  /**
   * Fetches restaurants based on the current filters, sorting, and active tab
   */
  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('restaurants')
        .select('*, restaurant_types(*), cities(*)', { count: 'exact' });

      // Adjust query based on active tab
      if (activeTab === 'myRestaurants') {
        query = query.eq('user_id', viewingUserId);
      } else if (activeTab === 'likedRestaurants') {
        const { data: likedRestaurants } = await supabase
          .from('liked_restaurants')
          .select('restaurant_id')
          .eq('user_id', userId);

        const likedIds = likedRestaurants.map(lr => lr.restaurant_id);
        query = query.in('id', likedIds);
      }

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

      const { data, error, count } = await query;

      if (error) throw error;

      // Fetch liked status for each restaurant
      const { data: likedRestaurants } = await supabase
        .from('liked_restaurants')
        .select('restaurant_id')
        .eq('user_id', userId);

      const likedIds = new Set(likedRestaurants.map(lr => lr.restaurant_id));

      // Add isLiked property to each restaurant
      const restaurantsWithLikedStatus = data.map(restaurant => ({
        ...restaurant,
        isLiked: likedIds.has(restaurant.id)
      }));

      setRestaurants(restaurantsWithLikedStatus);
      setTotalCount(count);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [userId, viewingUserId, filters, sortOption, activeTab]);
/**
   * Loads more restaurants when scrolling
   */
const loadMore = useCallback(async () => {
  if (loading || restaurants.length >= totalCount) return;

  setLoading(true);
  try {
    let query = supabase
      .from('restaurants')
      .select('*, restaurant_types(*), cities(*)')
      .range(restaurants.length, restaurants.length + 9); // Load 10 more restaurants

    // Apply the same filters and sorting as in fetchRestaurants
    // ... (apply filters and sorting logic here, similar to fetchRestaurants)

    const { data, error } = await query;

    if (error) throw error;

    // Fetch liked status for new restaurants
    const { data: likedRestaurants } = await supabase
      .from('liked_restaurants')
      .select('restaurant_id')
      .eq('user_id', userId);

    const likedIds = new Set(likedRestaurants.map(lr => lr.restaurant_id));

    // Add isLiked property to each new restaurant
    const newRestaurantsWithLikedStatus = data.map(restaurant => ({
      ...restaurant,
      isLiked: likedIds.has(restaurant.id)
    }));

    setRestaurants(prevRestaurants => [...prevRestaurants, ...newRestaurantsWithLikedStatus]);
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
}, [loading, restaurants, totalCount, userId]);

return { 
  restaurants, 
  setRestaurants,
  loading, 
  error, 
  fetchRestaurants,
  totalCount,
  loadMore
};
};