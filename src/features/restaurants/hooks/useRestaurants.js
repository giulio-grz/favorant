import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';

export const useRestaurants = (userId, page = 1, filters = {}, sortOption = 'dateAdded') => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const perPage = 10;

  const fetchRestaurants = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      let query = supabase
        .from('restaurants')
        .select(`
          *,
          restaurant_types(id, name),
          cities(id, name)
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
      query = query.range((page - 1) * perPage, page * perPage - 1);

      const { data, error, count } = await query;

      if (error) throw error;
      setRestaurants(data);
      setTotalCount(count);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [userId, page, filters, sortOption]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const loadMore = async () => {
    const nextPage = Math.floor(restaurants.length / perPage) + 1;
    try {
      let query = supabase
        .from('restaurants')
        .select(`
          *,
          restaurant_types(id, name),
          cities(id, name)
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
      query = query.range(nextPage * perPage, (nextPage + 1) * perPage - 1);

      const { data, error } = await query;

      if (error) throw error;
      setRestaurants(prevRestaurants => [...prevRestaurants, ...data]);
    } catch (error) {
      setError(error.message);
    }
  };

  return { 
    restaurants, 
    loading, 
    error, 
    fetchRestaurants,
    totalCount,
    loadMore
  };
};