import { useState, useEffect, useCallback } from 'react';
import { supabase, executeWithRetry } from '@/supabaseClient';

export const useTypesAndCities = () => {
  const [types, setTypes] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const MAX_RETRIES = 3;

  const fetchTypes = useCallback(async () => {
    try {
      return await executeWithRetry(async () => {
        const { data, error } = await supabase
          .from('restaurant_types')
          .select('*')
          .eq('status', 'approved')
          .order('name');
        
        if (error) throw error;
        return data || [];
      });
    } catch (error) {
      console.error('Error fetching types:', error);
      throw error;
    }
  }, []);

  const fetchCities = useCallback(async () => {
    try {
      return await executeWithRetry(async () => {
        const { data, error } = await supabase
          .from('cities')
          .select('*')
          .eq('status', 'approved')
          .order('name');
        
        if (error) throw error;
        return data || [];
      });
    } catch (error) {
      console.error('Error fetching cities:', error);
      throw error;
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [newTypes, newCities] = await Promise.all([
        fetchTypes(),
        fetchCities()
      ]);
      
      if (!newTypes || !newCities) throw new Error('Failed to fetch data');
      
      setTypes(newTypes);
      setCities(newCities);
      setRetryAttempt(0); // Reset retry counter on success
    } catch (error) {
      console.error('Error refreshing data:', error);
      setError(error);
      
      // If we haven't exceeded max retries and we're online, try again
      if (retryAttempt < MAX_RETRIES && navigator.onLine) {
        setRetryAttempt(prev => prev + 1);
        const delay = Math.pow(2, retryAttempt) * 1000; // Exponential backoff
        setTimeout(refresh, delay);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchTypes, fetchCities, retryAttempt]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('Connection restored, refreshing data...');
      setRetryAttempt(0); // Reset retry counter
      refresh();
    };

    const handleOffline = () => {
      console.log('Connection lost, waiting for reconnection...');
      setError(new Error('The internet connection appears to be offline'));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial connection state
    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refresh]);

  // Return cached data even if there's an error
  return {
    types,
    cities,
    setTypes,
    setCities,
    loading,
    error,
    refresh
  };
};