import { supabase } from '../../../supabaseClient';

export const useRestaurantOperations = () => {
  const addRestaurant = async (restaurantData) => {
    const { data, error } = await supabase
      .from('restaurants')
      .insert([restaurantData])
      .select(`*, restaurant_types(id, name), cities(id, name)`);
    
    if (error) throw error;
    return data[0];
  };

  const updateRestaurant = async (id, updatedRestaurant) => {
    const { data, error } = await supabase
      .from('restaurants')
      .update(updatedRestaurant)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0];
  };

  const deleteRestaurant = async (id) => {
    const { error } = await supabase
      .from('restaurants')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  };

  return {
    addRestaurant,
    updateRestaurant,
    deleteRestaurant
  };
};