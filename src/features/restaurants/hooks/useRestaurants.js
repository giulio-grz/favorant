import { useState, useEffect, useCallback } from 'react';
import { getUserRestaurants } from '../../../supabaseClient';

export const useRestaurants = (userId, isViewingOwnRestaurants, filters, sortOption, searchQuery) => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasResults, setHasResults] = useState(true);

  const fetchRestaurants = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getUserRestaurants(userId);

      let filteredData = data;
      
      // Apply search query
      if (searchQuery) {
        const lowercaseQuery = searchQuery.toLowerCase();
        filteredData = filteredData.filter(r => 
          r.name.toLowerCase().includes(lowercaseQuery) ||
          r.restaurant_types?.name.toLowerCase().includes(lowercaseQuery) ||
          r.cities?.name.toLowerCase().includes(lowercaseQuery)
        );
      }

      // Apply other filters
      if (filters.name) {
        filteredData = filteredData.filter(r => r.name.toLowerCase().includes(filters.name.toLowerCase()));
      }
      if (filters.type_id) {
        filteredData = filteredData.filter(r => r.type_id === filters.type_id);
      }
      if (filters.city_id) {
        filteredData = filteredData.filter(r => r.city_id === filters.city_id);
      }
      if (filters.price) {
        filteredData = filteredData.filter(r => r.price === filters.price);
      }
      if (filters.toTry === true) {
        filteredData = filteredData.filter(r => r.to_try === true);
      } else if (filters.toTry === false) {
        filteredData = filteredData.filter(r => r.to_try === false);
        if (filters.rating > 0) {
          filteredData = filteredData.filter(r => r.rating >= filters.rating);
        }
      }

      // Apply sorting
      switch (sortOption) {
        case 'name':
          filteredData.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'rating':
          filteredData.sort((a, b) => b.rating - a.rating);
          break;
        case 'dateAdded':
        default:
          filteredData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }

      setRestaurants(filteredData);
      setTotalCount(filteredData.length);
      setHasResults(filteredData.length > 0);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [userId, filters, sortOption, searchQuery]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const updateLocalRestaurant = useCallback((updatedRestaurant) => {
    setRestaurants(prevRestaurants =>
      prevRestaurants.map(restaurant =>
        restaurant.id === updatedRestaurant.id ? { ...restaurant, ...updatedRestaurant } : restaurant
      )
    );
  }, []);

  const addLocalRestaurant = useCallback((newRestaurant) => {
    if (isViewingOwnRestaurants) {
      setRestaurants(prevRestaurants => [newRestaurant, ...prevRestaurants]);
      setTotalCount(prevCount => prevCount + 1);
      setHasResults(true);
    }
  }, [isViewingOwnRestaurants]);

  const deleteLocalRestaurant = useCallback((id) => {
    setRestaurants(prevRestaurants => {
      const updatedRestaurants = prevRestaurants.filter(restaurant => restaurant.id !== id);
      setTotalCount(updatedRestaurants.length);
      setHasResults(updatedRestaurants.length > 0);
      return updatedRestaurants;
    });
  }, []);

  return { 
    restaurants, 
    loading, 
    error, 
    totalCount,
    hasResults,
    fetchRestaurants,
    updateLocalRestaurant,
    addLocalRestaurant,
    deleteLocalRestaurant,
  };
};