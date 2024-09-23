import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';

export const useRestaurantDetails = (id) => {
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRestaurant = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select(`*, restaurant_types(*), cities(*)`)
          .eq('id', id)
          .single();

        if (error) throw error;
        setRestaurant(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [id]);

  return { restaurant, loading, error };
};