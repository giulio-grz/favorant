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
          .select(`
            *,
            profiles:user_id (
              username
            )
          `)
          .eq('restaurant_id', id)
      ]);

      if (!mountedRef.current) return;

      const notes = notesResponse.error ? [] : (notesResponse.data || []);
      const bookmarks = bookmarkResponse.error ? null : bookmarkResponse.data;
      const reviews = reviewsResponse.error ? [] : (reviewsResponse.data || []);

      const targetUserId = viewingUserId || currentUserId;
      const userReview = reviews.find(review => review.user_id === targetUserId);

      // Calculate aggregate rating
      const avgRating = reviews.length 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
        : 0;

      // Get notes specific to the viewing context
      const relevantNotes = notes.filter(note => {
        if (viewingUserId && viewingUserId !== currentUserId) {
          return note.user_id === viewingUserId;
        }
        return note.user_id === currentUserId;
      });

      const enrichedRestaurant = {
        ...restaurantData,
        notes: relevantNotes,
        user_review: userReview || null,
        review_count: reviews.length,
        aggregate_rating: Number(avgRating.toFixed(2)),
        has_user_review: !!userReview,
        owner_username: restaurantData.profiles?.username,
        reviews: reviews.map(review => ({
          ...review,
          username: review.profiles?.username
        })),
        is_to_try: bookmarks?.some(b => b.type === 'to_try') || false
      };

      // Update the DB with calculated values
      const { data: updateData, error: updateError } = await supabase
        .from('restaurants')
        .update({ 
          review_count: reviews.length,
          aggregate_rating: Number(avgRating.toFixed(2)),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

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