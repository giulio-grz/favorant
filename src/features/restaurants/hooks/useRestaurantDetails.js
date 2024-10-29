import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/supabaseClient';

export const useRestaurantDetails = (id, viewingUserId) => {
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userBookmark, setUserBookmark] = useState(null);
  const mountedRef = useRef(true);

  const fetchRestaurant = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;

      // First fetch the restaurant with its relations
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select(`
          *,
          cities (
            id,
            name
          ),
          restaurant_types (
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

      if (!mountedRef.current) return;

      // Then fetch associated data in parallel
      const [notesResponse, bookmarkResponse, reviewsResponse] = await Promise.all([
        supabase
          .from('notes')
          .select('*')
          .eq('restaurant_id', id),
        
        currentUserId ? supabase
          .from('bookmarks')
          .select('*')
          .eq('restaurant_id', id)
          .eq('user_id', currentUserId) : 
          Promise.resolve({ data: null }),
        
        supabase
          .from('restaurant_reviews')
          .select('*')
          .eq('restaurant_id', id)
      ]);

      if (!mountedRef.current) return;

      const notes = notesResponse.error ? [] : (notesResponse.data || []);
      const bookmarks = bookmarkResponse.error ? null : bookmarkResponse.data;
      const reviews = reviewsResponse.error ? [] : (reviewsResponse.data || []);

      const targetUserId = viewingUserId || currentUserId;
      const userReview = reviews.find(review => review.user_id === targetUserId);

      const avgRating = reviews.length 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
        : 0;

      const enrichedRestaurant = {
        ...restaurantData,
        notes,
        user_review: userReview || null,
        review_count: reviews.length,
        aggregate_rating: avgRating,
        has_user_review: !!reviews.find(review => review.user_id === currentUserId)
      };

      setRestaurant(enrichedRestaurant);
      setUserBookmark(Array.isArray(bookmarks) ? bookmarks[0] : bookmarks);
      setError(null);
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
    }
  }, [id, viewingUserId]);

  useEffect(() => {
    mountedRef.current = true;
    fetchRestaurant();
    return () => {
      mountedRef.current = false;
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