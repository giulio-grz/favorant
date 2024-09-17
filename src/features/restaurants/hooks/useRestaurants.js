import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';

export const useRestaurants = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRestaurants = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const addRestaurantToState = (newRestaurant) => {
    setRestaurants(prev => [newRestaurant, ...prev]);
  };

  const updateRestaurantInState = (updatedRestaurant) => {
    setRestaurants(prev => prev.map(r => r.id === updatedRestaurant.id ? updatedRestaurant : r));
  };

  const removeRestaurantFromState = (id) => {
    setRestaurants(prev => prev.filter(r => r.id !== id));
  };

  return { 
    restaurants, 
    loading, 
    error, 
    fetchRestaurants, 
    addRestaurantToState, 
    updateRestaurantInState, 
    removeRestaurantFromState 
  };
};