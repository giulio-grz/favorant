import { useState, useEffect, useCallback } from 'react';
import { supabase, getLikedRestaurants } from '../../../supabaseClient';

export const useRestaurants = (userId, filters = {}, sortOption = 'dateAdded') => {
  // State variables
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const perPage = 30;

  // Fetch restaurants based on current filters and sort option
  const fetchRestaurants = useCallback(async () => {
    console.log('fetchRestaurants called');
    if (!userId) return;
    try {
      setLoading(true);
      let query = supabase
        .from('restaurants')
        .select(`
          *,
          restaurant_types (id, name),
          cities (id, name)
        `, { count: 'exact' })
        .eq('user_id', userId);

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

      // Apply pagination
      query = query.range(0, perPage - 1);

      const { data: ownedRestaurants, error: ownedError, count } = await query;

      if (ownedError) throw ownedError;

      // Fetch liked restaurants
      const likedRestaurants = await getLikedRestaurants(userId);

      // Combine owned and liked restaurants, marking owned ones
      const allRestaurants = [
        ...ownedRestaurants.map(r => ({ ...r, isOwned: true })),
        ...likedRestaurants.filter(lr => !ownedRestaurants.some(or => or.id === lr.id))
      ].slice(0, perPage);

      setRestaurants(allRestaurants);
      setTotalCount(count + likedRestaurants.length);
      console.log('Fetched restaurants:', allRestaurants.length);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [userId, filters, sortOption]);

  // Effect to fetch restaurants when dependencies change
  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  // Load more restaurants
  const loadMore = useCallback(async () => {
    console.log('loadMore function called');
    if (loading) {
      console.log('Loading is true, returning early');
      return;
    }
    
    setLoading(true);
    try {
      const currentCount = restaurants.length;
      console.log('Current restaurant count:', currentCount);
      
      let query = supabase
        .from('restaurants')
        .select(`
          *,
          restaurant_types (id, name),
          cities (id, name)
        `)
        .eq('user_id', userId);

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

      // Apply pagination
      query = query.range(currentCount, currentCount + perPage - 1);

      const { data, error } = await query;

      if (error) throw error;

      // Fetch liked status for new restaurants
      const newRestaurantsWithLikedStatus = await Promise.all(
        data.map(async (restaurant) => {
          const { data: likedData, error: likedError } = await supabase
            .from('liked_restaurants')
            .select('*')
            .eq('user_id', userId)
            .eq('restaurant_id', restaurant.id)
            .maybeSingle();

          if (likedError && likedError.code !== 'PGRST116') {
            console.error('Error fetching liked status:', likedError);
            return { ...restaurant, isLiked: false, isOwned: true };
          }

          return { ...restaurant, isLiked: !!likedData, isOwned: true };
        })
      );

      console.log('New restaurants fetched:', newRestaurantsWithLikedStatus.length);
      setRestaurants(prevRestaurants => [...prevRestaurants, ...newRestaurantsWithLikedStatus]);
    } catch (error) {
      console.error('Load more error:', error);
      setError(error.message);
    } finally {
      console.log('loadMore completed, setting loading to false');
      setLoading(false);
    }
  }, [loading, restaurants.length, userId, filters, sortOption, perPage]);

  // Return the state and functions
  return { 
    restaurants, 
    setRestaurants,
    loading, 
    error, 
    fetchRestaurants,
    totalCount,
    setTotalCount,
    loadMore
  };
};