import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/supabaseClient';

export const useRestaurantDetails = (id, viewingUserId) => {
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userBookmark, setUserBookmark] = useState(null);

  const fetchRestaurant = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
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

      // Fetch notes separately
      const { data: notes } = await supabase
        .from('notes')
        .select('*')
        .eq('restaurant_id', id);

      // Fetch current user's bookmark
      let bookmark = null;
      if (currentUserId) {
        const { data: bookmarkData } = await supabase
          .from('bookmarks')
          .select('*')
          .eq('restaurant_id', id)
          .eq('user_id', currentUserId);
        
        if (bookmarkData?.length > 0) {
          bookmark = bookmarkData[0];
        }
      }
      setUserBookmark(bookmark);

      // Fetch reviews
      const { data: reviews } = await supabase
        .from('restaurant_reviews')
        .select('*')
        .eq('restaurant_id', id);

      // Get the owner's review (either viewing user's or the owner's review)
      const targetUserId = viewingUserId || currentUserId;
      const userReview = reviews?.find(review => review.user_id === targetUserId);

      // Calculate aggregate rating
      const uniqueReviewers = new Set(reviews?.map(review => review.user_id) || []);
      const avgRating = reviews?.length 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
        : 0;

      const enrichedRestaurant = {
        ...restaurantData,
        notes: notes || [],
        user_review: userReview || null,
        review_count: uniqueReviewers.size,
        aggregate_rating: avgRating,
        has_user_review: !!reviews?.find(review => review.user_id === currentUserId)
      };

      setRestaurant(enrichedRestaurant);
      setError(null);

    } catch (error) {
      console.error('Error fetching restaurant details:', error);
      setError(error.message);
      setRestaurant(null);
    } finally {
      setLoading(false);
    }
  }, [id, viewingUserId]);

  useEffect(() => {
    fetchRestaurant();
  }, [fetchRestaurant]);

  return { 
    restaurant, 
    loading, 
    error, 
    refetch: fetchRestaurant, 
    userBookmark 
  };
};