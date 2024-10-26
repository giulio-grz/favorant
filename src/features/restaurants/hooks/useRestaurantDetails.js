import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/supabaseClient';

export const useRestaurantDetails = (restaurantId, viewingUserId = null) => {
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userBookmark, setUserBookmark] = useState(null);

  const fetchRestaurant = useCallback(async () => {
    if (!restaurantId) {
      setError('No restaurant ID provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Get current user's session
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;

      // Fetch restaurant base data
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select(`
          *,
          restaurant_types (*),
          cities (*),
          profiles!restaurants_created_by_fkey (username)
        `)
        .eq('id', restaurantId)
        .single();

      if (restaurantError) throw restaurantError;

      // Fetch all reviews for this restaurant
      const { data: allReviews, error: reviewsError } = await supabase
        .from('restaurant_reviews')
        .select('*')
        .eq('restaurant_id', restaurantId);

      if (reviewsError) throw reviewsError;

      // Fetch all notes for this restaurant
      const { data: allNotes, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .eq('restaurant_id', restaurantId);

      if (notesError) throw notesError;

      // Fetch bookmark status for current user
      const { data: bookmarkData } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('user_id', currentUserId)
        .single();

      setUserBookmark(bookmarkData);

      // Determine which user's data to show (viewing user or current user)
      const contextUserId = viewingUserId || currentUserId;
      
      // Get the relevant user's review and note
      const userReview = allReviews.find(review => review.user_id === contextUserId);
      const userNote = allNotes.find(note => note.user_id === contextUserId);

      // Calculate actual review count and aggregate rating
      const uniqueReviewers = new Set(allReviews.map(review => review.user_id));
      const actualReviewCount = uniqueReviewers.size;
      
      const actualAggregateRating = actualReviewCount > 0 
        ? allReviews.reduce((sum, review) => sum + review.rating, 0) / actualReviewCount 
        : 0;

      setRestaurant({
        ...restaurantData,
        user_review: userReview || null,
        user_notes: viewingUserId 
          ? allNotes.filter(note => note.user_id === viewingUserId)
          : allNotes.filter(note => note.user_id === currentUserId),
        owner_username: restaurantData.profiles?.username,
        review_count: actualReviewCount,
        aggregate_rating: actualAggregateRating,
        all_reviews: allReviews,
        current_user_id: currentUserId,
        viewing_user_id: viewingUserId
      });
      
    } catch (error) {
      console.error('Error fetching restaurant details:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, viewingUserId]);

  useEffect(() => {
    fetchRestaurant();
  }, [fetchRestaurant]);

  return { restaurant, loading, error, refetch: fetchRestaurant, userBookmark };
};