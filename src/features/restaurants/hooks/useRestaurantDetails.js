import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';

export const useRestaurantDetails = (id) => {
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRestaurant = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select(`
          *,
          restaurant_types(*),
          cities(*),
          restaurant_reviews(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setRestaurant(data);
      return data;
    } catch (error) {
      console.error("Error fetching restaurant details:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRestaurant();
  }, [fetchRestaurant]);

  const refetch = useCallback(async () => {
    const updatedRestaurant = await fetchRestaurant();
    return updatedRestaurant;
  }, [fetchRestaurant]);

  return { restaurant, loading, error, refetch };
};