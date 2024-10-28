import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/supabaseClient';

export const useRestaurantDetails = (id, viewingUserId) => {
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userBookmark, setUserBookmark] = useState(null);
  const mountedRef = useRef(true);
  const fetchInProgressRef = useRef(false);

  const fetchRestaurant = useCallback(async () => {
    // Prevent concurrent fetches
    if (fetchInProgressRef.current || !id) {
      return;
    }

    fetchInProgressRef.current = true;

    try {
      setLoading(true);
      setError(null);

      // Get current user's session
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;

      // First fetch the main restaurant data
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select(`
          *,
          restaurant_types (
            id,
            name
          ),
          cities (
            id,
            name
          ),
          profiles!restaurants_created_by_fkey (
            username
          )
        `)
        .eq('id', id)
        .single();

      if (restaurantError) throw restaurantError;

      // Fetch all related data in parallel with proper error handling
      const [notesResponse, bookmarkResponse, reviewsResponse] = await Promise.allSettled([
        supabase
          .from('notes')
          .select('*')
          .eq('restaurant_id', id),
        
        currentUserId ? supabase
          .from('bookmarks')
          .select('*')
          .eq('restaurant_id', id)
          .eq('user_id', currentUserId) : Promise.resolve({ data: null }),
        
        supabase
          .from('restaurant_reviews')
          .select('*')
          .eq('restaurant_id', id)
      ]);

      if (!mountedRef.current) return;

      // Safely handle responses
      const notes = notesResponse.status === 'fulfilled' ? notesResponse.value.data || [] : [];
      const bookmarks = bookmarkResponse.status === 'fulfilled' ? bookmarkResponse.value.data : null;
      const reviews = reviewsResponse.status === 'fulfilled' ? reviewsResponse.value.data || [] : [];

      // Get the owner's review (either viewing user's or the owner's review)
      const targetUserId = viewingUserId || currentUserId;
      const userReview = reviews.find(review => review.user_id === targetUserId);

      // Calculate aggregate rating
      const uniqueReviewers = new Set(reviews.map(review => review.user_id));
      const avgRating = reviews.length 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
        : 0;

      const enrichedRestaurant = {
        ...restaurantData,
        notes,
        user_review: userReview || null,
        review_count: uniqueReviewers.size,
        aggregate_rating: avgRating,
        has_user_review: !!reviews.find(review => review.user_id === currentUserId)
      };

      if (mountedRef.current) {
        setRestaurant(enrichedRestaurant);
        setUserBookmark(Array.isArray(bookmarks) ? bookmarks[0] : bookmarks);
        setError(null);
      }
    } catch (error) {
      console.error('Error fetching restaurant details:', error);
      if (mountedRef.current) {
        setError(error.message);
        setRestaurant(null);
        setUserBookmark(null);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      fetchInProgressRef.current = false;
    }
  }, [id, viewingUserId]);

  useEffect(() => {
    mountedRef.current = true;
    fetchRestaurant();
    
    return () => {
      mountedRef.current = false;
      fetchInProgressRef.current = false;
    };
  }, [fetchRestaurant]);

  return { 
    restaurant, 
    loading, 
    error, 
    refetch: fetchRestaurant,
    userBookmark
  };
};