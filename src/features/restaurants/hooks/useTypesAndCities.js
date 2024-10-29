import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';

export const useTypesAndCities = () => {
  const [types, setTypes] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTypes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_types')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setTypes(data || []);
    } catch (error) {
      console.error('Error fetching types:', error);
      setError(error.message);
    }
  }, []);

  const fetchCities = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setCities(data || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
      setError(error.message);
    }
  }, []);

  const addType = async (newType) => {
    try {
      const { data, error } = await supabase
        .from('restaurant_types')
        .insert([{
          name: newType.name.trim(),
          created_by: newType.created_by,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;
      
      setTypes(prevTypes => [...prevTypes, data]);
      return data;
    } catch (error) {
      console.error('Error adding type:', error);
      throw error;
    }
  };

  const addCity = async (newCity) => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .insert([{
          name: newCity.name.trim(),
          created_by: newCity.created_by,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;
      
      setCities(prevCities => [...prevCities, data]);
      return data;
    } catch (error) {
      console.error('Error adding city:', error);
      throw error;
    }
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchTypes(), fetchCities()]);
    } finally {
      setLoading(false);
    }
  }, [fetchTypes, fetchCities]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    types,
    cities,
    setTypes, 
    setCities,
    addType,
    addCity,
    refresh,
    loading,
    error
  };
};