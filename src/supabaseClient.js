import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const signUp = async (email, password, username) => {
  try {
    console.log("Starting sign-up process");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username }
      }
    });
    if (error) {
      console.error("Sign-up error:", error);
      throw error;
    }
    console.log("Sign-up successful, data:", data);
    return data;
  } catch (error) {
    console.error("Caught error during sign-up:", error);
    throw error;
  }
};

export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
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
      console.log("No active session");
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

export const getUserRestaurants = async (userId) => {
  try {
    console.log("Fetching restaurants for user:", userId);

    const { data: bookmarkedRestaurants, error: bookmarksError } = await supabase
      .from('bookmarks')
      .select(`
        type,
        restaurant:restaurants(
          *,
          restaurant_types(*),
          cities(*),
          restaurant_reviews(*)
        )
      `)
      .eq('user_id', userId);

    if (bookmarksError) throw bookmarksError;
    console.log("Fetched bookmarked restaurants:", bookmarkedRestaurants);

    const { data: createdRestaurants, error: createdError } = await supabase
      .from('restaurants')
      .select(`
        *,
        restaurant_types(*),
        cities(*),
        restaurant_reviews(*)
      `)
      .eq('created_by', userId);

    if (createdError) throw createdError;
    console.log("Fetched created restaurants:", createdRestaurants);

    const { data: reviewedRestaurants, error: reviewedError } = await supabase
      .from('restaurant_reviews')
      .select(`
        restaurant:restaurants(
          *,
          restaurant_types(*),
          cities(*),
          restaurant_reviews(*)
        )
      `)
      .eq('user_id', userId);

    if (reviewedError) throw reviewedError;
    console.log("Fetched reviewed restaurants:", reviewedRestaurants);

    const restaurants = [
      ...bookmarkedRestaurants.map(b => ({
        ...b.restaurant,
        is_bookmarked: true,
        bookmark_type: b.type
      })),
      ...createdRestaurants.map(r => ({ 
        ...r, 
        is_created: true
      })),
      ...reviewedRestaurants.map(r => ({
        ...r.restaurant,
        is_reviewed: true
      }))
    ];

    // Remove duplicates and calculate correct aggregate ratings and review counts
    const uniqueRestaurants = Array.from(new Set(restaurants.map(r => r.id)))
      .map(id => {
        const restaurant = restaurants.find(r => r.id === id);
        const reviews = restaurant.restaurant_reviews || [];
        const reviewCount = reviews.length;
        const aggregateRating = reviewCount > 0
          ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
          : null;

        const isToTry = restaurant.is_bookmarked && 
                        restaurant.bookmark_type === 'to_try' && 
                        !reviews.some(review => review.user_id === userId);

        console.log(`Restaurant ${restaurant.name} (ID: ${restaurant.id}) - Is To Try: ${isToTry}, Review Count: ${reviewCount}`);

        return {
          ...restaurant,
          review_count: reviewCount,
          aggregate_rating: aggregateRating,
          is_to_try: isToTry
        };
      });

    console.log("Processed restaurants:", uniqueRestaurants);
    return uniqueRestaurants;
  } catch (error) {
    console.error("Error in getUserRestaurants:", error);
    throw error;
  }
};

export const searchRestaurants = async (query) => {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name, address, cities(name), restaurant_types(name)')
      .or(`name.ilike.%${query}%, address.ilike.%${query}%`)
      .order('name')
      .limit(5);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error searching restaurants:', error);
    throw error;
  }
};

export const addRestaurant = async (restaurantData, userId) => {
  try {
    console.log("Adding restaurant with data:", { ...restaurantData, created_by: userId });
    const { data, error } = await supabase
      .from('restaurants')
      .insert({ ...restaurantData, created_by: userId })
      .select();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    console.log("Restaurant added successfully. Response data:", data);
    return data[0];
  } catch (error) {
    console.error('Error adding restaurant:', error);
    throw error;
  }
};

export const createRestaurant = async (restaurantData, userId, isToTry = false) => {
  try {
    console.log('Creating restaurant with data:', JSON.stringify(restaurantData, null, 2));
    console.log('User ID:', userId);
    console.log('Is To Try:', isToTry);

    const dataToInsert = {
      name: restaurantData.name,
      type_id: restaurantData.type_id,
      city_id: restaurantData.city_id,
      price: restaurantData.price,
      address: restaurantData.address,
      created_by: userId  // Make sure this is explicitly set
    };

    console.log('Data to insert:', JSON.stringify(dataToInsert, null, 2));

    const { data, error } = await supabase
      .from('restaurants')
      .insert(dataToInsert)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Restaurant created:', data);
    return data;
  } catch (error) {
    console.error('Error creating restaurant:', error);
    throw error;
  }
};

export const addBookmark = async (userId, restaurantId, type = 'favorite') => {
  try {
    console.log(`Attempting to add bookmark for restaurant ${restaurantId} by user ${userId}`);

    // Check if a review exists
    const { data: existingReview, error: reviewError } = await supabase
      .from('restaurant_reviews')
      .select('id')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (reviewError && reviewError.code !== 'PGRST116') {
      console.error('Error checking for existing review:', reviewError);
      throw reviewError;
    }

    if (existingReview) {
      console.log("Restaurant has been reviewed. Not adding a bookmark.");
      return { status: 'reviewed' };
    }

    // Check if a bookmark already exists
    const { data: existingBookmark, error: bookmarkError } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (bookmarkError && bookmarkError.code !== 'PGRST116') {
      console.error('Error checking for existing bookmark:', bookmarkError);
      throw bookmarkError;
    }

    if (existingBookmark) {
      console.log("Bookmark already exists. Not adding a new one.");
      return { status: 'exists' };
    }

    console.log("Adding new bookmark");
    const { data, error } = await supabase
      .from('bookmarks')
      .insert({ user_id: userId, restaurant_id: restaurantId, type })
      .select();

    if (error) {
      if (error.code === '406') {
        console.log("406 error encountered. This might be due to a Row Level Security policy.");
        // Check if the restaurant exists in the user's list
        const { data: userRestaurant, error: userRestaurantError } = await supabase
          .from('restaurants')
          .select('id')
          .eq('id', restaurantId)
          .single();

        if (userRestaurantError) {
          console.error('Error checking if restaurant exists in user\'s list:', userRestaurantError);
          throw userRestaurantError;
        }

        if (userRestaurant) {
          console.log("Restaurant already exists in user's list.");
          return { status: 'exists' };
        } else {
          console.log("Restaurant does not exist in user's list. This is unexpected.");
          throw new Error('Unexpected state: Restaurant not in user\'s list but cannot be added');
        }
      }
      console.error('Error adding bookmark:', error);
      throw error;
    }

    console.log('Bookmark added successfully:', data[0]);
    return { status: 'added', bookmark: data[0] };
  } catch (error) {
    console.error('Error in addBookmark function:', error);
    throw error;
  }
};

export const addReview = async ({ user_id, restaurant_id, rating }) => {
  try {
    // First, remove the 'to_try' bookmark if it exists
    const { error: bookmarkError } = await supabase
      .from('bookmarks')
      .delete()
      .match({ user_id, restaurant_id, type: 'to_try' });

    if (bookmarkError) throw bookmarkError;

    // Check if a review already exists
    const { data: existingReview, error: checkError } = await supabase
      .from('restaurant_reviews')
      .select('*')
      .eq('user_id', user_id)
      .eq('restaurant_id', restaurant_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    let reviewData;
    if (existingReview) {
      // Update existing review
      const { data, error } = await supabase
        .from('restaurant_reviews')
        .update({ rating })
        .eq('id', existingReview.id)
        .select();

      if (error) throw error;
      reviewData = data[0];
    } else {
      // Add new review
      const { data, error } = await supabase
        .from('restaurant_reviews')
        .insert({ user_id, restaurant_id, rating })
        .select();

      if (error) throw error;
      reviewData = data[0];
    }

    return reviewData;
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
      .insert({
        name: cityData.name,
        created_by: cityData.created_by,
        status: cityData.status || 'pending' // Use provided status or default to 'pending'
      })
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Error creating city:", error);
    throw error;
  }
};

export const createRestaurantType = async (typeData) => {
  try {
    const { data, error } = await supabase
      .from('restaurant_types')
      .insert({
        name: typeData.name,
        created_by: typeData.created_by,
        status: typeData.status || 'pending' // Use provided status or default to 'pending'
      })
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Error creating restaurant type:", error);
    throw error;
  }
};

export const getAllEntities = async () => {
  try {
    const { data: restaurants, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: cities, error: cityError } = await supabase
      .from('cities')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: types, error: typeError } = await supabase
      .from('restaurant_types')
      .select('*')
      .order('created_at', { ascending: false });

    if (restaurantError) throw restaurantError;
    if (cityError) throw cityError;
    if (typeError) throw typeError;

    return { restaurants, cities, types };
  } catch (error) {
    console.error("Error fetching entities:", error);
    throw error;
  }
};

export const approveRestaurant = async (id) => {
  try {
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
    const { data, error } = await supabase
      .from('restaurants')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    return data[0];
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
      console.log('User is not an admin. Cannot delete restaurant.');
      return { success: false, message: "Only admins can delete restaurants." };
    }

    // Proceed with deletion for admin
    const { data, error } = await supabase
      .from('restaurants')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;

    console.log('Restaurant deleted by admin:', data);
    return { success: true, message: "Restaurant deleted successfully." };
  } catch (error) {
    console.error('Error in deleteRestaurant function:', error);
    throw error;
  }
};

export const removeRestaurantFromUserList = async (userId, restaurantId) => {
  try {
    // Remove the bookmark
    const { error: bookmarkError } = await supabase
      .from('bookmarks')
      .delete()
      .match({ user_id: userId, restaurant_id: restaurantId });

    if (bookmarkError) throw bookmarkError;

    // Remove the review if it exists
    const { error: reviewError } = await supabase
      .from('restaurant_reviews')
      .delete()
      .match({ user_id: userId, restaurant_id: restaurantId });

    if (reviewError) throw reviewError;

    return { success: true, message: "Restaurant removed from your list successfully." };
  } catch (error) {
    console.error('Error in removeRestaurantFromUserList function:', error);
    throw error;
  }
};

export const getUserRestaurantData = async (userId, restaurantId) => {
  try {
    const { data, error } = await supabase
      .from('user_restaurants')
      .select(`
        *,
        restaurant_reviews (rating, review),
        bookmarks (type)
      `)
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return data;
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
    console.log("Restaurant added to user's list:", data);
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

export default supabase;