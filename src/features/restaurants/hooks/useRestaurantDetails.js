import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/supabaseClient';

export const useRestaurantDetails = (restaurantId, viewingUserId = null) => {
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
        .eq('id', restaurantId)
        .single();

      if (error) throw error;

      if (viewingUserId) {
        // If viewing another user's profile, only include their review
        data.restaurant_reviews = data.restaurant_reviews.filter(
          review => review.user_id === viewingUserId
        );
      }

      setRestaurant(data);
    } catch (error) {
      console.error('Error fetching restaurant details:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, viewingUserId]);

  useEffect(() => {
    fetchRestaurant();
  }, [fetchRestaurant]);

  return { restaurant, loading, error, refetch: fetchRestaurant };
};