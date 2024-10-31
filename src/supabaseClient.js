import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create a single supabase instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Add retry logic for database operations
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const executeWithRetry = async (operation, retries = MAX_RETRIES, delay = INITIAL_RETRY_DELAY) => {
  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      // Execute the operation with timeout
      const result = await Promise.race([
        operation(),
        timeoutPromise
      ]);
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Only retry on specific errors and if we have retries left
      if (attempt < retries && (
        error.status === 429 || // Rate limit
        error.status === 503 || // Service unavailable
        error.message === 'Request timeout' ||
        error.code === '40001' || // Serialization failure
        error.code === '23505' // Unique violation (may need retry)
      )) {
        // Add some jitter to the delay
        const jitter = Math.random() * 200;
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
        // Exponential backoff
        delay *= 2;
      } else {
        // Don't retry on other errors
        break;
      }
    }
  }
  
  // If we got here, we ran out of retries
  throw lastError;
};

const checkRestaurantAssociations = async (userId, restaurantId) => {
  try {
    // Check bookmarks
    const { data: bookmarks } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId);

    // Check reviews
    const { data: reviews } = await supabase
      .from('restaurant_reviews')
      .select('id')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId);

    return (bookmarks?.length > 0 || reviews?.length > 0);
  } catch (error) {
    console.error('Error checking associations:', error);
    return false;
  }
};

// Refresh ratings
export const refreshRestaurantRatings = async (restaurantId) => {
  try {
    const { data, error } = await supabase.rpc(
      'recalculate_restaurant_ratings',
      { restaurant_id: restaurantId }
    );
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error refreshing restaurant ratings:', error);
    throw error;
  }
};

export const signUp = async (email, password, username) => {
  try {    
    // Sign up the user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: window.location.origin // Redirect to main page after verification
      }
    });

    if (signUpError) throw signUpError;
    
    if (authData.user) {
      return {
        user: authData.user,
        session: authData.session,
        message: "Please check your email to verify your account."
      };
    }

    throw new Error('No user data returned from sign-up');
  } catch (error) {
    console.error("Caught error during sign-up:", error);
    throw error;
  }
};

export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Fetch profile immediately after successful sign in
    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        // Create profile if it doesn't exist
        if (profileError.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([
              {
                id: data.user.id,
                email: data.user.email,
                username: data.user.email,
                is_admin: false
              }
            ])
            .select()
            .single();

          if (createError) {
            console.error("Error creating profile:", createError);
          } else {
            return { ...data, user: { ...data.user, profile: newProfile }};
          }
        }
      } else {
        return { ...data, user: { ...data.user, profile }};
      }
    }

    return data;
  } catch (error) {
    console.error("Sign in error:", error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error("Sign out error:", error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!session) {
      return null;
    }
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error("Error fetching profile:", profileError);
      }
      
      return { ...user, profile: profile || null };
    }
    return null;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

export const getProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching profile:", error);
    throw error;
  }
};

export const updateProfile = async (userId, updates) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select();
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
};

export const searchUsers = async (query, currentUserId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, email')
      .neq('id', currentUserId)
      .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(5);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error searching users:', error);
    return { data: [], error };
  }
};

export const getUserRestaurants = async (userId, viewingUserId = null) => {
  const targetUserId = viewingUserId || userId;
  
  return executeWithRetry(async () => {
    try {
      // First get user's restaurants (both reviewed and bookmarked)
      const [reviewsResponse, bookmarksResponse] = await Promise.all([
        supabase
          .from('restaurant_reviews')
          .select(`
            restaurant_id,
            rating,
            restaurants (
              *,
              restaurant_types (*),
              cities (*)
            )
          `)
          .eq('user_id', targetUserId),
        
        supabase
          .from('bookmarks')
          .select(`
            restaurant_id,
            type,
            restaurants (
              *,
              restaurant_types (*),
              cities (*)
            )
          `)
          .eq('user_id', targetUserId)
      ]);

      if (reviewsResponse.error) throw reviewsResponse.error;
      if (bookmarksResponse.error) throw bookmarksResponse.error;

      const reviewedRestaurants = reviewsResponse.data || [];
      const bookmarkedRestaurants = bookmarksResponse.data || [];

      // Get all unique restaurant IDs
      const restaurantIds = [...new Set([
        ...reviewedRestaurants.map(r => r.restaurant_id),
        ...bookmarkedRestaurants.map(b => b.restaurant_id)
      ])];

      // Fetch ALL reviews for these restaurants
      const { data: allReviews, error: allReviewsError } = await supabase
        .from('restaurant_reviews')
        .select('*')
        .in('restaurant_id', restaurantIds);

      if (allReviewsError) throw allReviewsError;

      // Create a map to store unique restaurants with their properties
      const restaurantsMap = new Map();

      // Helper function to calculate average rating
      const calculateRating = (restaurantId) => {
        const reviews = allReviews.filter(r => r.restaurant_id === restaurantId);
        if (reviews.length === 0) return { avg: 0, count: 0 };
        const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        return { avg, count: reviews.length };
      };

      // Process reviewed restaurants
      reviewedRestaurants.forEach(review => {
        if (review.restaurants) {
          const { avg, count } = calculateRating(review.restaurant_id);
          restaurantsMap.set(review.restaurant_id, {
            ...review.restaurants,
            has_user_review: true,
            user_rating: review.rating,
            is_to_try: false,
            aggregate_rating: avg,
            review_count: count
          });
        }
      });

      // Process bookmarked restaurants
      bookmarkedRestaurants.forEach(bookmark => {
        if (bookmark.restaurants) {
          const existing = restaurantsMap.get(bookmark.restaurant_id);
          
          if (!existing) {
            const { avg, count } = calculateRating(bookmark.restaurant_id);
            restaurantsMap.set(bookmark.restaurant_id, {
              ...bookmark.restaurants,
              is_to_try: bookmark.type === 'to_try',
              is_bookmarked: true,
              has_user_review: false,
              user_rating: null,
              aggregate_rating: avg,
              review_count: count
            });
          }
        }
      });

      // Convert map to array and sort by creation date
      const restaurants = Array.from(restaurantsMap.values())
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return restaurants;
    } catch (error) {
      console.error("Error in getUserRestaurants:", error);
      throw error;
    }
  });
};

export const addRestaurant = async (restaurantData, userId) => {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .insert({ ...restaurantData, created_by: userId })
      .select();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    return data[0];
  } catch (error) {
    console.error('Error adding restaurant:', error);
    throw error;
  }
};

export const createRestaurant = async (restaurantData, userId, isToTry = false) => {
  try {
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .insert([{
        name: restaurantData.name,
        address: restaurantData.address,
        postal_code: restaurantData.postal_code,
        city_id: restaurantData.city_id,
        type_id: restaurantData.type_id,
        price: restaurantData.price,
        website: restaurantData.website, // Add this line
        created_by: userId,
        status: 'pending'
      }])
      .select(`
        *,
        cities (
          id,
          name
        ),
        restaurant_types (
          id,
          name
        )
      `)
      .single();

    if (restaurantError) throw restaurantError;

    if (isToTry) {
      const { error: bookmarkError } = await supabase
        .from('bookmarks')
        .insert({
          user_id: userId,
          restaurant_id: restaurant.id,
          type: 'to_try'
        });

      if (bookmarkError) throw bookmarkError;
    }

    return restaurant;
  } catch (error) {
    console.error('Error creating restaurant:', error);
    throw error;
  }
};

export const addBookmark = async (userId, restaurantId, isToTry = false) => {
  try {
    if (!userId || !restaurantId) {
      throw new Error('Missing required parameters');
    }

    // First check if the restaurant exists
    const { data: restaurantExists, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('id', restaurantId)
      .maybeSingle();

    if (restaurantError) {
      throw new Error('Failed to verify restaurant');
    }

    if (!restaurantExists) {
      throw new Error('Restaurant not found');
    }

    // Check if a bookmark already exists
    const { data: existingBookmarks, error: bookmarkError } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (bookmarkError) {
      throw new Error('Failed to check existing bookmarks');
    }

    if (existingBookmarks) {
      return { status: 'exists', bookmark: existingBookmarks };
    }

    // Check for existing review only if not adding as to_try
    if (!isToTry) {
      const { data: existingReview, error: reviewError } = await supabase
        .from('restaurant_reviews')
        .select('id')
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      if (!reviewError && existingReview) {
        return { status: 'reviewed' };
      }
    }

    // Add new bookmark with explicit headers
    const { data, error } = await supabase
      .from('bookmarks')
      .insert([{
        user_id: userId,
        restaurant_id: restaurantId,
        type: isToTry ? 'to_try' : 'favorite'
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { status: 'added', bookmark: data };
  } catch (error) {
    console.error('Error in addBookmark function:', error);
    throw error;
  }
};

export const recalculateRestaurantStats = async (restaurantId) => {
  try {
    // Get all reviews for the restaurant
    const { data: reviews, error: reviewsError } = await supabase
      .from('restaurant_reviews')
      .select('rating')
      .eq('restaurant_id', restaurantId);

    if (reviewsError) throw reviewsError;

    // Calculate new stats
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

    // Update restaurant
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({
        aggregate_rating: Number(avgRating.toFixed(2)),
        review_count: reviews.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', restaurantId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error) {
    console.error('Error recalculating restaurant stats:', error);
    return { success: false, error };
  }
};

export const addReview = async ({ user_id, restaurant_id, rating }) => {
  try {
    // First check if a review already exists
    const { data: existingReview } = await supabase
      .from('restaurant_reviews')
      .select('*')
      .eq('user_id', user_id)
      .eq('restaurant_id', restaurant_id)
      .single();

    let result;
    if (existingReview) {
      // Update existing review
      result = await supabase
        .from('restaurant_reviews')
        .update({ rating })
        .eq('id', existingReview.id)
        .select()
        .single();
    } else {
      // Add new review
      result = await supabase
        .from('restaurant_reviews')
        .insert([
          { user_id, restaurant_id, rating }
        ])
        .select()
        .single();
    }

    if (result.error) throw result.error;
    
    // Force a recalculation of the stats
    await recalculateRestaurantStats(restaurant_id);

    // Add a small delay to ensure all operations complete
    await new Promise(resolve => setTimeout(resolve, 100));

    return result.data;
  } catch (error) {
    console.error("Error adding/updating review:", error);
    throw error;
  }
};

export const updatePassword = async (newPassword) => {
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  } catch (error) {
    console.error("Error updating password:", error);
    throw error;
  }
};

export const getRestaurantTypes = async () => {
  try {
    const { data, error } = await supabase
      .from('restaurant_types')
      .select('*')
      .eq('status', 'approved');
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching restaurant types:", error);
    throw error;
  }
};

export const getCities = async () => {
  try {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('status', 'approved');
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching cities:", error);
    throw error;
  }
};

export const createCity = async (cityData) => {
  try {
    const { data, error } = await supabase
      .from('cities')
      .insert([{
        name: cityData.name.trim(),
        created_by: cityData.created_by,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating city:', error);
    throw error;
  }
};

export const createRestaurantType = async (typeData) => {
  try {
    const { data, error } = await supabase
      .from('restaurant_types')
      .insert([{
        name: typeData.name.trim(),
        created_by: typeData.created_by,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating restaurant type:', error);
    throw error;
  }
};

export const getAllEntities = async () => {
  try {
    // Run queries in parallel
    const [restaurantsResult, citiesResult, typesResult] = await Promise.all([
      supabase
        .from('restaurants')
        .select(`
          *,
          cities ( id, name ),
          restaurant_types ( id, name )
        `)
        .order('created_at', { ascending: false }),

      supabase
        .from('cities')
        .select('*')
        .order('name'),

      supabase
        .from('restaurant_types')
        .select('*')
        .order('name')
    ]);

    // Check for errors
    if (restaurantsResult.error) throw restaurantsResult.error;
    if (citiesResult.error) throw citiesResult.error;
    if (typesResult.error) throw typesResult.error;

    return {
      restaurants: restaurantsResult.data || [],
      cities: citiesResult.data || [],
      types: typesResult.data || []
    };
  } catch (error) {
    console.error("Error fetching entities:", error);
    throw error;
  }
};

export const approveRestaurant = async (id) => {
  try {
    // Get restaurant details first
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select(`
        id,
        address,
        postal_code,
        cities (
          name
        )
      `)
      .eq('id', id)
      .single();

    if (restaurant && restaurant.address && restaurant.cities?.name) {
      // Geocode the address
      const searchQuery = [
        restaurant.address,
        restaurant.postal_code,
        restaurant.cities.name,
        'Italy'
      ].filter(Boolean).join(', ');
      
      try {
        const response = await executeWithRetry(async () => {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&countrycodes=it`,
            {
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'RestaurantApp/1.0'
              }
            }
          );
          
          if (!res.ok) {
            throw new Error('Geocoding failed');
          }
          
          return res.json();
        });

        if (response && response.length > 0) {
          const { lat, lon } = response[0];
          
          // Update restaurant with coordinates and status
          const { data, error } = await supabase
            .from('restaurants')
            .update({
              latitude: parseFloat(lat),
              longitude: parseFloat(lon),
              status: 'approved'
            })
            .eq('id', id)
            .select();

          if (error) throw error;
          return data[0];
        }
      } catch (error) {
        console.error('Geocoding error:', error);
      }
    }
    
    // If geocoding fails or address is incomplete, just approve without coordinates
    const { data, error } = await supabase
      .from('restaurants')
      .update({ status: 'approved' })
      .eq('id', id)
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Error approving restaurant:", error);
    throw error;
  }
};

export const approveCity = async (id) => {
  try {
    const { data, error } = await supabase
      .from('cities')
      .update({ status: 'approved' })
      .eq('id', id)
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Error approving city:", error);
    throw error;
  }
};

export const approveType = async (id) => {
  try {
    const { data, error } = await supabase
      .from('restaurant_types')
      .update({ status: 'approved' })
      .eq('id', id)
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Error approving type:", error);
    throw error;
  }
};

export const updateRestaurant = async (id, updates) => {
  try {    
    // First validate the input
    if (!id || !updates) {
      throw new Error('Invalid update parameters');
    }

    // Create the update object with only the fields we want to update
    const updateFields = {
      name: updates.name,
      address: updates.address,
      postal_code: updates.postal_code,
      city_id: updates.city_id,
      type_id: updates.type_id,
      price: updates.price,
      website: updates.website, // Add this line
      latitude: updates.latitude,
      longitude: updates.longitude,
      updated_at: new Date().toISOString()
    };

    // Perform the update
    const { data, error } = await supabase
      .from('restaurants')
      .update(updateFields)
      .eq('id', id)
      .select(`
        *,
        cities (
          id,
          name
        ),
        restaurant_types (
          id,
          name
        )
      `)
      .single();

    if (error) {
      console.error('Error in updateRestaurant:', error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error("Error updating restaurant:", error);
    throw error;
  }
};

export const deleteRestaurant = async (id, userId) => {
  try {
    // Check if the user is an admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    if (!profile.is_admin) {
      return { success: false, message: "Only admins can delete restaurants." };
    }

    // Proceed with deletion for admin
    const { data, error } = await supabase
      .from('restaurants')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;

    return { success: true, message: "Restaurant deleted successfully." };
  } catch (error) {
    console.error('Error in deleteRestaurant function:', error);
    throw error;
  }
};

export const searchRestaurants = async (query) => {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select(`
        id,
        name,
        address,
        type_id,
        city_id,
        price,
        restaurant_types (
          id,
          name
        ),
        cities (
          id,
          name
        )
      `)
      .or(`name.ilike.%${query}%,address.ilike.%${query}%`)
      .order('name')
      .limit(5);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error searching restaurants:', error);
    throw error;
  }
};

export const removeRestaurantFromUserList = async (userId, restaurantId) => {
  try {
    // Delete all associations in parallel
    const promises = [
      // Delete bookmarks
      supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId),
      
      // Delete reviews - make sure this executes
      supabase
        .from('restaurant_reviews')
        .delete()
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId),
      
      // Delete notes
      supabase
        .from('notes')
        .delete()
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId)
    ];

    const results = await Promise.all(promises);
    
    // Check for errors in any of the delete operations
    results.forEach((result, index) => {
      if (result.error) {
        console.error(`Error in deletion operation ${index}:`, result.error);
        throw result.error;
      }
    });

    return {
      success: true,
      message: 'Restaurant removed from list successfully'
    };

  } catch (error) {
    console.error('Error removing restaurant from list:', error);
    throw error;
  }
};

export const getUserRestaurantData = async (userId, restaurantId) => {
  try {
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select(`
        *,
        restaurant_types(*),
        cities(*)
      `)
      .eq('id', restaurantId)
      .single();

    if (restaurantError) throw restaurantError;

    // Use Promise.allSettled to handle partial failures
    const [bookmarkResult, reviewResult, notesResult] = await Promise.allSettled([
      supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId)
        .maybeSingle(),
      
      supabase
        .from('restaurant_reviews')
        .select('*')
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId)
        .maybeSingle(),
      
      supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId)
    ]);

    return {
      ...restaurant,
      user_bookmark: bookmarkResult.status === 'fulfilled' ? bookmarkResult.value.data : null,
      user_review: reviewResult.status === 'fulfilled' ? reviewResult.value.data : null,
      user_notes: notesResult.status === 'fulfilled' ? notesResult.value.data || [] : []
    };
  } catch (error) {
    console.error("Error fetching user restaurant data:", error);
    throw error;
  }
};

export const addRestaurantToUserList = async (userId, restaurantId, isToTry = true) => {
  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .insert({ 
        user_id: userId, 
        restaurant_id: restaurantId, 
        type: isToTry ? 'to_try' : 'favorite'
      })
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Error adding restaurant to user list:', error);
    throw error;
  }
};

export const updateCity = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('cities')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Error updating city:", error);
    throw error;
  }
};

export const deleteCity = async (id) => {
  try {
    const { error } = await supabase
      .from('cities')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true, message: "City deleted successfully." };
  } catch (error) {
    console.error("Error deleting city:", error);
    throw error;
  }
};

export const updateType = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('restaurant_types')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Error updating type:", error);
    throw error;
  }
};

export const deleteType = async (id) => {
  try {
    const { error } = await supabase
      .from('restaurant_types')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true, message: "Restaurant type deleted successfully." };
  } catch (error) {
    console.error("Error deleting type:", error);
    throw error;
  }
};

export const addNote = async ({ user_id, restaurant_id, note }) => {
  try {
    const { data, error } = await supabase
      .from('notes')
      .insert([{
        user_id,
        restaurant_id,
        note
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding note:', error);
    throw error;
  }
};

// Social features - Add these new functions at the end of the file, before the export default statement

export const followUser = async (followerId, followingId) => {
  try {
    const { data, error } = await supabase
      .from('followers')
      .insert({
        follower_id: followerId,
        following_id: followingId
      })
      .select('*, profiles!followers_following_id_fkey(username)')
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('You are already following this user');
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error following user:', error);
    throw error;
  }
};

export const unfollowUser = async (followerId, followingId) => {
  try {
    const { error } = await supabase
      .from('followers')
      .delete()
      .match({
        follower_id: followerId,
        following_id: followingId
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error unfollowing user:', error);
    throw error;
  }
};

export const getFollowers = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('followers')
      .select(`
        follower_id,
        profiles!followers_follower_id_fkey(
          id,
          username,
          email
        )
      `)
      .eq('following_id', userId);

    if (error) throw error;
    return data.map(f => f.profiles);
  } catch (error) {
    console.error('Error getting followers:', error);
    throw error;
  }
};

export const getFollowing = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('followers')
      .select(`
        following_id,
        profiles!followers_following_id_fkey(
          id,
          username,
          email
        )
      `)
      .eq('follower_id', userId);

    if (error) throw error;
    return data.map(f => f.profiles);
  } catch (error) {
    console.error('Error getting following:', error);
    throw error;
  }
};

export const isFollowing = async (followerId, followingId) => {
  try {
    const { data, error } = await supabase
      .from('followers')
      .select('id')
      .match({
        follower_id: followerId,
        following_id: followingId
      })
      .maybeSingle();

    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error('Error checking follow status:', error);
    throw error;
  }
};

export const getRestaurantSocialFeed = async (restaurantId, userId) => {
  try {
    // Get the list of users being followed by the viewed user (not current user)
    const { data: followingData, error: followingError } = await supabase
      .from('followers')
      .select('following_id')
      .eq('follower_id', userId); // This will use the viewed user's ID

    if (followingError) throw followingError;

    if (!followingData?.length) return { reviews: [], notes: [] };

    const followingIds = followingData.map(f => f.following_id);

    // Get reviews and notes in parallel
    const [reviewsResponse, notesResponse] = await Promise.all([
      supabase
        .from('restaurant_reviews')
        .select(`
          *,
          profiles:user_id (
            id,
            username
          )
        `)
        .eq('restaurant_id', restaurantId)
        .in('user_id', followingIds)
        .order('created_at', { ascending: false }),

      supabase
        .from('notes')
        .select(`
          *,
          profiles:user_id (
            id,
            username
          )
        `)
        .eq('restaurant_id', restaurantId)
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
    ]);

    if (reviewsResponse.error) throw reviewsResponse.error;
    if (notesResponse.error) throw notesResponse.error;

    return {
      reviews: reviewsResponse.data || [],
      notes: notesResponse.data || []
    };
  } catch (error) {
    console.error('Error fetching social feed:', error);
    throw error;
  }
};

export default supabase;