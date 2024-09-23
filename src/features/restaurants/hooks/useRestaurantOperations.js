import { supabase } from '../../../supabaseClient';

/**
 * useRestaurantOperations Hook
 * 
 * This custom hook provides functions for performing CRUD operations on restaurants.
 * It interacts with the Supabase client to handle database operations.
 * 
 * @returns {Object} An object containing functions for adding, updating, and deleting restaurants
 */
export const useRestaurantOperations = () => {
  /**
   * Adds a new restaurant to the database
   * 
   * @param {Object} restaurantData - The data for the new restaurant
   * @returns {Promise<Object>} The newly created restaurant data
   * @throws Will throw an error if the database operation fails
   */
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

  /**
   * Updates an existing restaurant in the database
   * 
   * @param {Object} updatedRestaurant - The updated restaurant data, including the id
   * @returns {Promise<Object>} The updated restaurant data
   * @throws Will throw an error if the database operation fails
   */
  const updateRestaurant = async (updatedRestaurant) => {
    const { id, ...updateData } = updatedRestaurant;
    console.log('Attempting to update restaurant with id:', id, 'and data:', updateData);
    
    const { data, error } = await supabase
      .from('restaurants')
      .update(updateData)
      .eq('id', id)
      .select(`*, restaurant_types(id, name), cities(id, name)`)
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    console.log('Successfully updated restaurant:', data);
    return data;
  };

  /**
   * Deletes a restaurant from the database
   * 
   * @param {string|number} id - The id of the restaurant to delete
   * @throws Will throw an error if the database operation fails
   */
  const deleteRestaurant = async (id) => {
    console.log('Attempting to delete restaurant with id:', id);
    
    const { error } = await supabase
      .from('restaurants')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    console.log('Successfully deleted restaurant with id:', id);
  };

  return {
    addRestaurant,
    updateRestaurant,
    deleteRestaurant
  };
};