import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';

export const useRestaurants = (currentUserId, viewingUserId, filters = {}, sortOption = 'dateAdded') => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const perPage = 30;

  const fetchRestaurants = useCallback(async () => {
    console.log('fetchRestaurants called', { currentUserId, viewingUserId });
    if (!viewingUserId) return;
    try {
      setLoading(true);

      // First, get all restaurant IDs that the user has liked
      const { data: likedRestaurants, error: likedError } = await supabase
        .from('liked_restaurants')
        .select('restaurant_id')
        .eq('user_id', currentUserId);

      if (likedError) throw likedError;

      const likedRestaurantIds = likedRestaurants.map(lr => lr.restaurant_id);

      let query = supabase
        .from('restaurants')
        .select(`
          *,
          restaurant_types (id, name),
          cities (id, name),
          liked_restaurants!left (user_id)
        `, { count: 'exact' });

      if (currentUserId === viewingUserId) {
        // Fetch both owned and liked restaurants
        query = query.or(
          `user_id.eq.${currentUserId},id.in.(${likedRestaurantIds.join(',')})`
        );
      } else {
        query = query.eq('user_id', viewingUserId);
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

      // Apply pagination
      query = query.range(0, perPage - 1);

      const { data: fetchedRestaurants, error, count } = await query;

      if (error) throw error;

      // Process fetched restaurants
      const processedRestaurants = fetchedRestaurants.map(restaurant => ({
        ...restaurant,
        isOwned: restaurant.user_id === currentUserId,
        isLiked: likedRestaurantIds.includes(restaurant.id)
      }));

      setRestaurants(processedRestaurants);
      setTotalCount(count);
      console.log('Fetched restaurants:', processedRestaurants.length);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, viewingUserId, filters, sortOption]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

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

      // First, get all restaurant IDs that the user has liked
      const { data: likedRestaurants, error: likedError } = await supabase
        .from('liked_restaurants')
        .select('restaurant_id')
        .eq('user_id', currentUserId);

      if (likedError) throw likedError;

      const likedRestaurantIds = likedRestaurants.map(lr => lr.restaurant_id);
      
      let query = supabase
        .from('restaurants')
        .select(`
          *,
          restaurant_types (id, name),
          cities (id, name),
          liked_restaurants!left (user_id)
        `);

      if (currentUserId === viewingUserId) {
        // Fetch both owned and liked restaurants
        query = query.or(
          `user_id.eq.${currentUserId},id.in.(${likedRestaurantIds.join(',')})`
        );
      } else {
        query = query.eq('user_id', viewingUserId);
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

      // Apply pagination
      query = query.range(currentCount, currentCount + perPage - 1);

      const { data: newRestaurants, error } = await query;

      if (error) throw error;

      const processedNewRestaurants = newRestaurants.map(restaurant => ({
        ...restaurant,
        isOwned: restaurant.user_id === currentUserId,
        isLiked: likedRestaurantIds.includes(restaurant.id)
      }));

      console.log('New restaurants fetched:', processedNewRestaurants.length);
      setRestaurants(prevRestaurants => [...prevRestaurants, ...processedNewRestaurants]);
    } catch (error) {
      console.error('Load more error:', error);
      setError(error.message);
    } finally {
      console.log('loadMore completed, setting loading to false');
      setLoading(false);
    }
  }, [loading, restaurants.length, currentUserId, viewingUserId, filters, sortOption, perPage]);

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