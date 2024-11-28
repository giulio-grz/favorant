import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Enhanced options for Supabase client
const supabaseOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'supabase.auth.token',
  },
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
  },
  db: {
    schema: 'public',
  },
  // Add global error handler
  global: {
    headers: { 'x-client-info': 'supabase-js' },
  }
};

// Create Supabase client with enhanced options
export const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions);

// Enhanced retry logic constants
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const REQUEST_TIMEOUT = 10000; // 10 seconds

// Helper function for delays
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Enhanced network error detection
const isNetworkError = (error) => {
  return (
    error.message?.includes('network') ||
    error.message?.includes('fetch') ||
    error.message?.includes('timeout') ||
    error.status === 503 ||
    error.status === 429 ||
    error.code === '40001' ||
    error.code === '23505' ||
    !navigator.onLine
  );
};

// Enhanced retry logic
export const executeWithRetry = async (operation, retries = MAX_RETRIES, delay = INITIAL_RETRY_DELAY) => {
  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create a timeout promise with custom timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT)
      );
      
      // Execute the operation with timeout
      const result = await Promise.race([
        operation(),
        timeoutPromise
      ]);
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Enhanced error handling with network error detection
      if (attempt < retries && (isNetworkError(error) || error.message === 'Request timeout')) {
        const jitter = Math.random() * 200;
        const backoffDelay = delay * Math.pow(2, attempt) + jitter;
        console.log(`Retry attempt ${attempt + 1}/${retries} after ${backoffDelay}ms`);
        await wait(backoffDelay);
        continue;
      }
      break;
    }
  }
  
  throw lastError;
};

// Enhanced auth functions with retry logic
export const signUp = async (email, password, username) => {
  return executeWithRetry(async () => {
    try {    
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          emailRedirectTo: window.location.origin
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
  });
};

export const signIn = async (email, password) => {
  return executeWithRetry(async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          if (profileError.code === 'PGRST116') {
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert([{
                id: data.user.id,
                email: data.user.email,
                username: data.user.email,
                is_admin: false
              }])
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
  });
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
  return executeWithRetry(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!session) return null;

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
      throw error;
    }
  });
};
// Profile and search functions with retry logic
export const getProfile = async (userId) => {
  return executeWithRetry(async () => {
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
  });
};

export const updateProfile = async (userId, updates) => {
  return executeWithRetry(async () => {
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
  });
};

export const searchUsers = async (query, currentUserId) => {
  return executeWithRetry(async () => {
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
  });
};

// Restaurant functions with retry logic
export const addRestaurant = async (restaurantData, userId) => {
  return executeWithRetry(async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .insert({ ...restaurantData, created_by: userId })
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error adding restaurant:', error);
      throw error;
    }
  });
};

export const createRestaurant = async (restaurantData, userId, isToTry = false) => {
  return executeWithRetry(async () => {
    try {
      // First get the city and country info
      const { data: cityData } = await supabase
        .from('cities')
        .select(`
          *,
          countries (
            id,
            name,
            code
          )
        `)
        .eq('id', restaurantData.city_id)
        .single();

      if (!cityData) {
        throw new Error('City not found');
      }

      // Build search query with country information
      const searchQuery = [
        restaurantData.address,
        restaurantData.postal_code,
        cityData.name,
        cityData.countries?.name || 'Italy'
      ].filter(Boolean).join(', ');

      // Add country code to geocoding if available
      const countryParam = cityData.countries?.code ? 
        `&countrycodes=${cityData.countries.code.toLowerCase()}` : 
        '';

      // Geocode the address
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}${countryParam}&limit=1`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'RestaurantApp/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const locationData = await response.json();
      let latitude = null;
      let longitude = null;

      if (locationData && locationData.length > 0) {
        latitude = parseFloat(locationData[0].lat);
        longitude = parseFloat(locationData[0].lon);
      }

      // Insert the restaurant
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .insert([{
          name: restaurantData.name,
          address: restaurantData.address,
          postal_code: restaurantData.postal_code,
          city_id: restaurantData.city_id,
          type_id: restaurantData.type_id,
          price: restaurantData.price,
          website: restaurantData.website,
          latitude: latitude,
          longitude: longitude,
          created_by: userId,
          status: 'pending'
        }])
        .select(`
          *,
          cities (
            id,
            name,
            countries (
              id,
              name,
              code
            )
          ),
          restaurant_types (
            id,
            name
          )
        `)
        .single();

      if (restaurantError) throw restaurantError;

      if (isToTry && restaurant) {
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
  });
};

export const addBookmark = async (userId, restaurantId, isToTry = false) => {
  return executeWithRetry(async () => {
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
        const { data: existingReview } = await supabase
          .from('restaurant_reviews')
          .select('id')
          .eq('user_id', userId)
          .eq('restaurant_id', restaurantId)
          .maybeSingle();

        if (existingReview) {
          return { status: 'reviewed' };
        }
      }

      // Add new bookmark
      const { data, error } = await supabase
        .from('bookmarks')
        .insert([{
          user_id: userId,
          restaurant_id: restaurantId,
          type: isToTry ? 'to_try' : 'favorite'
        }])
        .select()
        .single();

      if (error) throw error;
      return { status: 'added', bookmark: data };
    } catch (error) {
      console.error('Error in addBookmark function:', error);
      throw error;
    }
  });
};

export const addReview = async ({ user_id, restaurant_id, rating }) => {
  return executeWithRetry(async () => {
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
        result = await supabase
          .from('restaurant_reviews')
          .update({ rating })
          .eq('id', existingReview.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('restaurant_reviews')
          .insert([{ user_id, restaurant_id, rating }])
          .select()
          .single();
      }

      if (result.error) throw result.error;

      await recalculateRestaurantStats(restaurant_id);
      await wait(100); // Small delay to ensure all operations complete

      return result.data;
    } catch (error) {
      console.error("Error adding/updating review:", error);
      throw error;
    }
  });
};

export const recalculateRestaurantStats = async (restaurantId) => {
  return executeWithRetry(async () => {
    try {
      const { data: reviews, error: reviewsError } = await supabase
        .from('restaurant_reviews')
        .select('rating')
        .eq('restaurant_id', restaurantId);

      if (reviewsError) throw reviewsError;

      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : 0;

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
      throw error;
    }
  });
};
// Restaurant type and city functions with retry logic
export const getRestaurantTypes = async () => {
  return executeWithRetry(async () => {
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
  });
};

export const getCities = async () => {
  return executeWithRetry(async () => {
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
  });
};

export const createCity = async (cityData) => {
  return executeWithRetry(async () => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .insert([{
          name: cityData.name.trim(),
          country_id: cityData.country_id,
          created_by: cityData.created_by,
          status: cityData.status || 'pending'
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating city:', error);
      throw error;
    }
  });
};

export const createRestaurantType = async (typeData) => {
  return executeWithRetry(async () => {
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
  });
};

// Admin operations with retry logic
export const getAllEntities = async () => {
  return executeWithRetry(async () => {
    try {
      const [restaurantsResult, citiesResult, typesResult, countriesResult] = await Promise.all([
        supabase
          .from('restaurants')
          .select(`
            *,
            cities ( 
              id, 
              name,
              countries (
                id,
                name,
                code
              )
            ),
            restaurant_types ( id, name )
          `)
          .order('created_at', { ascending: false }),

        supabase
          .from('cities')
          .select(`
            *,
            countries (
              id,
              name,
              code
            )
          `)
          .order('name'),

        supabase
          .from('restaurant_types')
          .select('*')
          .order('name'),

        supabase
          .from('countries')
          .select('*')
          .order('name')
      ]);

      if (restaurantsResult.error) throw restaurantsResult.error;
      if (citiesResult.error) throw citiesResult.error;
      if (typesResult.error) throw typesResult.error;
      if (countriesResult.error) throw countriesResult.error;

      return {
        restaurants: restaurantsResult.data || [],
        cities: citiesResult.data || [],
        types: typesResult.data || [],
        countries: countriesResult.data || []
      };
    } catch (error) {
      console.error("Error fetching entities:", error);
      throw error;
    }
  });
};

export const approveRestaurant = async (id) => {
  return executeWithRetry(async () => {
    try {
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

      if (restaurant?.address && restaurant.cities?.name) {
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
            
            if (!res.ok) throw new Error('Geocoding failed');
            return res.json();
          });

          if (response?.[0]) {
            const { lat, lon } = response[0];
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
  });
};

export const approveCity = async (id) => {
  return executeWithRetry(async () => {
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
  });
};

export const approveType = async (id) => {
  return executeWithRetry(async () => {
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
  });
};
// Restaurant management functions with retry logic
export const updateRestaurant = async (id, updateData) => {
  return executeWithRetry(async () => {
    try {    
      const { data, error } = await supabase
        .from('restaurants')
        .update({
          name: updateData.name,
          address: updateData.address,
          postal_code: updateData.postal_code,
          city_id: updateData.city_id,
          type_id: updateData.type_id,
          price: updateData.price,
          website: updateData.website,
          latitude: updateData.latitude,
          longitude: updateData.longitude,
          updated_at: new Date().toISOString()
        })
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

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating restaurant:', error);
      throw error;
    }
  });
};

export const deleteRestaurant = async (id, userId) => {
  return executeWithRetry(async () => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      if (!profile.is_admin) {
        return { success: false, message: "Only admins can delete restaurants." };
      }

      const { error } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return { success: true, message: "Restaurant deleted successfully." };
    } catch (error) {
      console.error('Error in deleteRestaurant function:', error);
      throw error;
    }
  });
};

export const searchRestaurants = async (query) => {
  return executeWithRetry(async () => {
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
  });
};

// User actions with retry logic
export const removeRestaurantFromUserList = async (userId, restaurantId) => {
  return executeWithRetry(async () => {
    try {
      const results = await Promise.all([
        supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', userId)
          .eq('restaurant_id', restaurantId),
        
        supabase
          .from('restaurant_reviews')
          .delete()
          .eq('user_id', userId)
          .eq('restaurant_id', restaurantId),
        
        supabase
          .from('notes')
          .delete()
          .eq('user_id', userId)
          .eq('restaurant_id', restaurantId)
      ]);
      
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
  });
};

// Notes and comments with retry logic
export const addNote = async ({ user_id, restaurant_id, note }) => {
  return executeWithRetry(async () => {
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
  });
};

// Social features with retry logic
export const followUser = async (followerId, followingId) => {
  return executeWithRetry(async () => {
    try {
      const { data, error } = await supabase
        .from('followers')
        .insert({
          follower_id: followerId,
          following_id: followingId
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('You are already following this user');
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error following user:', error);
      throw error;
    }
  });
};

export const unfollowUser = async (followerId, followingId) => {
  return executeWithRetry(async () => {
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
  });
};

// Social feed with retry logic
export const getRestaurantSocialFeed = async (restaurantId, userId) => {
  return executeWithRetry(async () => {
    try {
      const { data: followingData, error: followingError } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', userId);

      if (followingError) throw followingError;
      
      if (!followingData?.length) {
        return { reviews: [], notes: [] };
      }

      const followingIds = followingData.map(f => f.following_id);

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
  });
};

// Initialize network error handling
window.addEventListener('online', () => {
  if (document.visibilityState === 'visible') {
    console.log('Network connection restored, refreshing...');
    window.location.reload();
  }
});

window.addEventListener('offline', () => {
  console.log('Network connection lost');
});

// Set up session refresh interval
setInterval(async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (!error && session) {
      await supabase.auth.refreshSession();
    }
  } catch (error) {
    console.error('Error refreshing session:', error);
  }
}, 300000); // Refresh every 5 minutes

// Missing user data functions
export const getUserRestaurantData = async (userId, restaurantId) => {
  return executeWithRetry(async () => {
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
  });
};

// Missing followers/following functions
export const getFollowers = async (userId) => {
  return executeWithRetry(async () => {
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
  });
};

export const getFollowing = async (userId) => {
  return executeWithRetry(async () => {
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
  });
};

export const isFollowing = async (followerId, followingId) => {
  return executeWithRetry(async () => {
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
  });
};

export const getUserStats = async (userId) => {
  return executeWithRetry(async () => {
    try {
      const [visitedCount, toTryCount, followers, following] = await Promise.all([
        supabase
          .from('restaurant_reviews')
          .select('id', { count: 'exact' })
          .eq('user_id', userId),
        
        supabase
          .from('bookmarks')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .eq('type', 'to_try'),
        
        supabase
          .from('followers')
          .select('id', { count: 'exact' })
          .eq('following_id', userId),
        
        supabase
          .from('followers')
          .select('id', { count: 'exact' })
          .eq('follower_id', userId)
      ]);

      return {
        visitedCount: visitedCount.count || 0,
        toTryCount: toTryCount.count || 0,
        followersCount: followers.count || 0,
        followingCount: following.count || 0
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return {
        visitedCount: 0,
        toTryCount: 0,
        followersCount: 0,
        followingCount: 0
      };
    }
  });
};

// Missing city and type management functions
export const updateCity = async (id, updates) => {
  return executeWithRetry(async () => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .update({
          name: updates.name.trim(),
          country_id: updates.country_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          countries (
            id,
            name,
            code
          )
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating city:", error);
      throw error;
    }
  });
};

export const deleteCity = async (id) => {
  return executeWithRetry(async () => {
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
  });
};

export const updateType = async (id, updates) => {
  return executeWithRetry(async () => {
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
  });
};

export const deleteType = async (id) => {
  return executeWithRetry(async () => {
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
  });
};

// Helper function for checking restaurant associations
const checkRestaurantAssociations = async (userId, restaurantId) => {
  return executeWithRetry(async () => {
    try {
      const [bookmarkResult, reviewResult] = await Promise.all([
        supabase
          .from('bookmarks')
          .select('id')
          .eq('user_id', userId)
          .eq('restaurant_id', restaurantId),
        
        supabase
          .from('restaurant_reviews')
          .select('id')
          .eq('user_id', userId)
          .eq('restaurant_id', restaurantId)
      ]);

      return (bookmarkResult.data?.length > 0 || reviewResult.data?.length > 0);
    } catch (error) {
      console.error('Error checking associations:', error);
      return false;
    }
  });
};

export const addRestaurantToUserList = async (userId, restaurantId, isToTry = true) => {
  return executeWithRetry(async () => {
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
  });
};

export const updatePassword = async (currentPassword, newPassword) => {
  return executeWithRetry(async () => {
    try {
      // First verify the current password
      const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
        email: supabase.auth.user()?.email,
        password: currentPassword
      });

      if (signInError) throw new Error('Current password is incorrect');

      // If current password is correct, update to new password
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      return { success: true, message: 'Password updated successfully' };
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  });
};

export const getActivityFeed = async (userId) => {
  return executeWithRetry(async () => {
    try {
      // First get the list of users being followed
      const { data: followingData, error: followingError } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', userId);

      if (followingError) throw followingError;
      
      if (!followingData?.length) {
        return [];
      }

      const followingIds = followingData.map(f => f.following_id);

      // Get reviews, bookmarks, and notes in parallel
      const [reviewsResponse, bookmarksResponse, notesResponse] = await Promise.all([
        supabase
          .from('restaurant_reviews')
          .select(`
            id,
            rating,
            created_at,
            user_id,
            restaurant_id,
            profiles:user_id (
              username
            ),
            restaurants (
              name,
              restaurant_types (
                name
              ),
              cities (
                name
              )
            )
          `)
          .in('user_id', followingIds)
          .order('created_at', { ascending: false }),

        supabase
          .from('bookmarks')
          .select(`
            id,
            created_at,
            user_id,
            restaurant_id,
            profiles:user_id (
              username
            ),
            restaurants (
              name,
              restaurant_types (
                name
              ),
              cities (
                name
              )
            )
          `)
          .in('user_id', followingIds)
          .eq('type', 'to_try')
          .order('created_at', { ascending: false }),

        supabase
          .from('notes')
          .select(`
            id,
            note,
            created_at,
            user_id,
            restaurant_id,
            profiles:user_id (
              username
            ),
            restaurants (
              name,
              restaurant_types (
                name
              ),
              cities (
                name
              )
            )
          `)
          .in('user_id', followingIds)
          .order('created_at', { ascending: false })
      ]);

      if (reviewsResponse.error) throw reviewsResponse.error;
      if (bookmarksResponse.error) throw bookmarksResponse.error;
      if (notesResponse.error) throw notesResponse.error;

      // Transform and combine the data
      const activities = [
        ...(reviewsResponse.data || []).map(review => ({
          id: review.id,
          type: 'review',
          created_at: review.created_at,
          user_id: review.user_id,
          username: review.profiles?.username,
          restaurant_id: review.restaurant_id,
          restaurant_name: review.restaurants?.name,
          restaurant_type: review.restaurants?.restaurant_types?.name,
          city: review.restaurants?.cities?.name,
          rating: review.rating
        })),
        ...(bookmarksResponse.data || []).map(bookmark => ({
          id: bookmark.id,
          type: 'bookmark',
          created_at: bookmark.created_at,
          user_id: bookmark.user_id,
          username: bookmark.profiles?.username,
          restaurant_id: bookmark.restaurant_id,
          restaurant_name: bookmark.restaurants?.name,
          restaurant_type: bookmark.restaurants?.restaurant_types?.name,
          city: bookmark.restaurants?.cities?.name
        })),
        ...(notesResponse.data || []).map(note => ({
          id: note.id,
          type: 'note',
          created_at: note.created_at,
          user_id: note.user_id,
          username: note.profiles?.username,
          restaurant_id: note.restaurant_id,
          restaurant_name: note.restaurants?.name,
          restaurant_type: note.restaurants?.restaurant_types?.name,
          city: note.restaurants?.cities?.name,
          note: note.note
        }))
      ];

      // Sort all activities by created_at
      return activities.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
    } catch (error) {
      console.error('Error fetching activity feed:', error);
      throw error;
    }
  });
};

export const resetPassword = async (email) => {
  return executeWithRetry(async () => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,  // Changed from /auth?reset=true
      });
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error requesting password reset:', error);
      throw error;
    }
  });
};

export const updateUserPassword = async (newPassword) => {
  return executeWithRetry(async () => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  });
};

export const getPendingCounts = async () => {
  return executeWithRetry(async () => {
    try {
      const [restaurantsCount, citiesCount, typesCount] = await Promise.all([
        supabase
          .from('restaurants')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        
        supabase
          .from('cities')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        
        supabase
          .from('restaurant_types')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
      ]);

      return {
        restaurants: restaurantsCount.count || 0,
        cities: citiesCount.count || 0,
        types: typesCount.count || 0,
        total: (restaurantsCount.count || 0) + (citiesCount.count || 0) + (typesCount.count || 0)
      };
    } catch (error) {
      console.error('Error getting pending counts:', error);
      return { restaurants: 0, cities: 0, types: 0, total: 0 };
    }
  });
};

export const subscribeToPendingChanges = (callback) => {
  const channel = supabase
    .channel('schema-db-changes')
    .on(
      'postgres_changes',
      {
        event: '*',  // This captures INSERT, UPDATE, and DELETE
        schema: 'public',
        table: 'restaurants'
      },
      () => callback()  // Call callback for ANY change
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'cities'
      },
      () => callback()
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'restaurant_types'
      },
      () => callback()
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
};

export const createCountry = async (countryData) => {
  return executeWithRetry(async () => {
    try {
      const { data, error } = await supabase
        .from('countries')
        .insert([{
          name: countryData.name.trim(),
          code: countryData.code.trim().toUpperCase(),
          created_by: countryData.created_by,
          status: countryData.status || 'pending'
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating country:', error);
      throw error;
    }
  });
};

export const updateCountry = async (id, updates) => {
  return executeWithRetry(async () => {
    try {
      const { data, error } = await supabase
        .from('countries')
        .update({
          name: updates.name.trim(),
          code: updates.code.trim().toUpperCase(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error updating country:', error);
      throw error;
    }
  });
};

export const deleteCountry = async (id) => {
  return executeWithRetry(async () => {
    try {
      const { error } = await supabase
        .from('countries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting country:', error);
      throw error;
    }
  });
};

export const getCountries = async () => {
  return executeWithRetry(async () => {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .eq('status', 'approved')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching countries:', error);
      throw error;
    }
  });
};

export default supabase;