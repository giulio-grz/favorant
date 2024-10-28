import { useState, useEffect, useCallback, useRef } from 'react';
import { getUserRestaurants } from '../../../supabaseClient';

export const useRestaurants = (userId, isViewingOwnRestaurants, filters, sortOption, searchQuery) => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasResults, setHasResults] = useState(true);
  const mountedRef = useRef(true);
  const abortControllerRef = useRef(null);
  const fetchInProgressRef = useRef(false);

  const fetchRestaurants = useCallback(async () => {
    // If there's already a fetch in progress, skip this one
    if (fetchInProgressRef.current) {
      return;
    }

    // If no userId, exit early
    if (!userId) {
      setLoading(false);
      setRestaurants([]);
      setError(null);
      setTotalCount(0);
      setHasResults(false);
      return;
    }

    // Set fetch in progress flag
    fetchInProgressRef.current = true;

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const data = await getUserRestaurants(isViewingOwnRestaurants ? userId : userId);
      
      // Check if component is still mounted
      if (!mountedRef.current) {
        return;
      }

      let filteredData = data;
      
      // Apply search query
      if (searchQuery) {
        const lowercaseQuery = searchQuery.toLowerCase();
        filteredData = filteredData.filter(r => 
          r.name.toLowerCase().includes(lowercaseQuery) ||
          r.restaurant_types?.name?.toLowerCase().includes(lowercaseQuery) ||
          r.cities?.name?.toLowerCase().includes(lowercaseQuery)
        );
      }

      // Apply other filters
      if (filters.name) {
        filteredData = filteredData.filter(r => 
          r.name.toLowerCase().includes(filters.name.toLowerCase())
        );
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
        filteredData = filteredData.filter(r => r.is_to_try === true);
      } else if (filters.toTry === false) {
        filteredData = filteredData.filter(r => r.is_to_try === false);
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
          filteredData.sort((a, b) => (b.rating || 0) - (a.rating || 0));
          break;
        case 'dateAdded':
        default:
          filteredData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }

      // Only update state if component is still mounted
      if (mountedRef.current) {
        setRestaurants(filteredData);
        setTotalCount(filteredData.length);
        setHasResults(filteredData.length > 0);
        setError(null);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      
      console.error('Error fetching restaurants:', error);
      if (mountedRef.current) {
        setError(error.message);
        setRestaurants([]);
        setTotalCount(0);
        setHasResults(false);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      fetchInProgressRef.current = false;
    }
  }, [userId, filters, sortOption, searchQuery, isViewingOwnRestaurants]);

  useEffect(() => {
    mountedRef.current = true;
    fetchRestaurants();
    
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      fetchInProgressRef.current = false;
    };
  }, [fetchRestaurants]);

  const updateLocalRestaurant = useCallback((updatedRestaurant) => {
    if (mountedRef.current) {
      setRestaurants(prevRestaurants =>
        prevRestaurants.map(restaurant =>
          restaurant.id === updatedRestaurant.id ? { ...restaurant, ...updatedRestaurant } : restaurant
        )
      );
    }
  }, []);

  const addLocalRestaurant = useCallback((newRestaurant) => {
    if (mountedRef.current && isViewingOwnRestaurants) {
      setRestaurants(prevRestaurants => [newRestaurant, ...prevRestaurants]);
      setTotalCount(prevCount => prevCount + 1);
      setHasResults(true);
    }
  }, [isViewingOwnRestaurants]);

  const deleteLocalRestaurant = useCallback((id) => {
    if (mountedRef.current) {
      setRestaurants(prevRestaurants => {
        const updatedRestaurants = prevRestaurants.filter(restaurant => restaurant.id !== id);
        setTotalCount(updatedRestaurants.length);
        setHasResults(updatedRestaurants.length > 0);
        return updatedRestaurants;
      });
    }
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