import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';

export const useTypesAndCities = () => {
  const [types, setTypes] = useState([]);
  const [cities, setCities] = useState([]);

  const fetchTypes = async () => {
    try {
      const { data, error } = await supabase.from('restaurant_types').select('*');
      if (error) throw error;
      setTypes(data);
    } catch (error) {
      console.error('Error fetching types:', error);
      alert('Error fetching types: ' + error.message);
    }
  };

  const fetchCities = async () => {
    try {
      const { data, error } = await supabase.from('cities').select('*');
      if (error) throw error;
      setCities(data);
    } catch (error) {
      console.error('Error fetching cities:', error);
      alert('Error fetching cities: ' + error.message);
    }
  };

  const addType = async (newType) => {
    try {
      const { data, error } = await supabase
        .from('restaurant_types')
        .insert({ name: newType })
        .select();
      if (error) throw error;
      await fetchTypes();
      return data[0];
    } catch (error) {
      console.error('Error adding type:', error);
      alert('Failed to add type: ' + error.message);
    }
  };

  const addCity = async (newCity) => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .insert({ name: newCity })
        .select();
      if (error) throw error;
      await fetchCities();
      return data[0];
    } catch (error) {
      console.error('Error adding city:', error);
      alert('Failed to add city: ' + error.message);
    }
  };

  const editType = async (id, newName) => {
    try {
      const { error } = await supabase
        .from('restaurant_types')
        .update({ name: newName })
        .eq('id', id);
      if (error) throw error;
      await fetchTypes();
    } catch (error) {
      console.error('Error editing type:', error);
      alert('Failed to edit type: ' + error.message);
    }
  };

  const editCity = async (id, newName) => {
    try {
      const { error } = await supabase
        .from('cities')
        .update({ name: newName })
        .eq('id', id);
      if (error) throw error;
      await fetchCities();
    } catch (error) {
      console.error('Error editing city:', error);
      alert('Failed to edit city: ' + error.message);
    }
  };

  const deleteType = async (id) => {
    try {
      const { error } = await supabase
        .from('restaurant_types')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchTypes();
    } catch (error) {
      console.error('Error deleting type:', error);
      alert('Failed to delete type: ' + error.message);
    }
  };

  const deleteCity = async (id) => {
    try {
      const { error } = await supabase
        .from('cities')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchCities();
    } catch (error) {
      console.error('Error deleting city:', error);
      alert('Failed to delete city: ' + error.message);
    }
  };

  useEffect(() => {
    fetchTypes();
    fetchCities();
  }, []);

  return {
    types,
    cities,
    addType,
    addCity,
    editType,
    editCity,
    deleteType,
    deleteCity,
    fetchTypes,
    fetchCities
  };
};