import { useRestaurants } from './useRestaurants';
import { supabase } from '../../../supabaseClient';

export const useRestaurantOperations = () => {
  const { fetchRestaurants } = useRestaurants();

  const addRestaurant = async (restaurantData) => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .insert([restaurantData])
        .select();
      
      if (error) throw error;

      console.log('Restaurant added successfully:', data);
      await fetchRestaurants();
      return data[0];
    } catch (error) {
      console.error('Error in addRestaurant:', error);
      throw error;
    }
  };

  const updateRestaurant = async (id, updatedRestaurant) => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .update(updatedRestaurant)
        .eq('id', id)
        .select();
      if (error) throw error;
      await fetchRestaurants();
      return data[0];
    } catch (error) {
      console.error('Error updating restaurant:', error);
      throw error;
    }
  };

  const deleteRestaurant = async (id) => {
    try {
      const { error } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchRestaurants();
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      throw error;
    }
  };

  return {
    addRestaurant,
    updateRestaurant,
    deleteRestaurant
  };
};