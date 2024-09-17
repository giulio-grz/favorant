import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';

export const useRestaurants = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('restaurants')
        .select(`
          *,
          restaurant_types(id, name),
          cities(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRestaurants(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  return { restaurants, loading, error, fetchRestaurants, setRestaurants };
};