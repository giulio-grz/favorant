import { supabase } from '../../../supabaseClient';

export const useRestaurantOperations = () => {
  const addRestaurant = async (restaurantData) => {
    const { id, ...dataWithoutId } = restaurantData;
    console.log('Attempting to add restaurant with data:', dataWithoutId);
    
    const { data, error } = await supabase
      .from('restaurants')
      .insert([dataWithoutId])
      .select(`*, restaurant_types(id, name), cities(id, name)`)
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    console.log('Successfully added restaurant:', data);
    return data;
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