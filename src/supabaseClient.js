import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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

export const getUserRestaurants = async (userId, viewingUserId = null) => {
  const targetUserId = viewingUserId || userId;
  
  try {
    console.log("Fetching restaurants for user:", targetUserId);

    // First get all restaurants through reviews
    const { data: reviewedRestaurants, error: reviewsError } = await supabase
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
      .eq('user_id', targetUserId);

    if (reviewsError) throw reviewsError;

    // Get restaurants through bookmarks
    const { data: bookmarkedRestaurants, error: bookmarksError } = await supabase
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
      .eq('user_id', targetUserId);

    if (bookmarksError) throw bookmarksError;

    // Create a map to store unique restaurants with their properties
    const restaurantsMap = new Map();

    // Process reviewed restaurants
    reviewedRestaurants?.forEach(review => {
      if (review.restaurants) {
        restaurantsMap.set(review.restaurant_id, {
          ...review.restaurants,
          has_user_review: true,
          user_rating: review.rating,
          is_to_try: false
        });
      }
    });

    // Process bookmarked restaurants
    bookmarkedRestaurants?.forEach(bookmark => {
      if (bookmark.restaurants) {
        const existing = restaurantsMap.get(bookmark.restaurant_id);
        restaurantsMap.set(bookmark.restaurant_id, {
          ...(existing || bookmark.restaurants),
          ...bookmark.restaurants,
          is_to_try: bookmark.type === 'to_try',
          is_bookmarked: true,
          has_user_review: existing?.has_user_review || false,
          user_rating: existing?.user_rating || null
        });
      }
    });

    // Convert map to array and sort by creation date
    const restaurants = Array.from(restaurantsMap.values())
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    console.log("Processed restaurants:", restaurants);
    return restaurants;

  } catch (error) {
    console.error("Error in getUserRestaurants:", error);
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
      created_by: userId
    };

    console.log('Data to insert:', JSON.stringify(dataToInsert, null, 2));

    // First create the restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .insert(dataToInsert)
      .select()
      .single();

    if (restaurantError) {
      console.error('Supabase error:', restaurantError);
      throw restaurantError;
    }

    // Then create the bookmark if it's a "to try" restaurant
    if (isToTry) {
      await addRestaurantToUserList(userId, restaurant.id, true);
    }

    console.log('Restaurant created:', restaurant);
    return restaurant;
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
    // First remove any "to try" bookmark if it exists
    const { error: deleteError } = await supabase
      .from('bookmarks')
      .delete()
      .match({ 
        user_id, 
        restaurant_id, 
        type: 'to_try' 
      });

    if (deleteError) throw deleteError;

    // Handle the review
    const { data: existingReview, error: checkError } = await supabase
      .from('restaurant_reviews')
      .select('*')
      .eq('user_id', user_id)
      .eq('restaurant_id', restaurant_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') throw checkError;

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
    // Get bookmarks
    const { data: bookmark, error: bookmarkError } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .single();

    // Get reviews
    const { data: review, error: reviewError } = await supabase
      .from('restaurant_reviews')
      .select('*')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .single();

    // Get notes
    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId);

    // Get restaurant info
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select(`
        *,
        restaurant_types(*),
        cities(*),
        restaurant_reviews(*)
      `)
      .eq('id', restaurantId)
      .single();

    if (restaurantError) throw restaurantError;

    return {
      ...restaurant,
      user_bookmark: bookmark || null,
      user_review: review || null,
      user_notes: notes || []
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

export default supabase;