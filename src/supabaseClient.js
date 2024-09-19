import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const signUp = async (email, password, username) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username }
      }
    });
    if (error) throw error;
    
    if (data.user) {
      // Check if profile exists
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileCheckError && profileCheckError.code !== 'PGRST116') {
        throw profileCheckError;
      }

      if (!existingProfile) {
        // Only insert if profile doesn't exist
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([{ id: data.user.id, username }]);
        if (insertError) throw insertError;
      }
    }
    return data;
  } catch (error) {
    console.error("Sign up error:", error);
    throw error;
  }
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error("Error getting session:", error);
    return null;
  }
  if (!session) {
    console.log("No active session");
    return null;
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (profileError && profileError.code !== 'PGRST116') {
      console.error("Error fetching profile:", profileError);
    }
    return { ...user, profile };
  }
  return null;
};

export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
};

export const searchUsers = async (query, currentUserId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username')
      .neq('id', currentUserId)  // Exclude the current user
      .ilike('username', `%${query}%`)
      .limit(5);

    if (error) throw error;
    return { data: data || [] };
  } catch (error) {
    console.error('Error searching users:', error);
    return { data: [] };
  }
};

export const updateProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  if (error) throw error;
  return data;
};

export const likeRestaurant = async (userId, restaurantId) => {
  const { data, error } = await supabase
    .from('liked_restaurants')
    .upsert({ user_id: userId, restaurant_id: restaurantId }, { onConflict: 'user_id,restaurant_id' });
  if (error) throw error;
  return data;
};

export const unlikeRestaurant = async (userId, restaurantId) => {
  const { data, error } = await supabase
    .from('liked_restaurants')
    .delete()
    .match({ user_id: userId, restaurant_id: restaurantId });
  if (error) throw error;
  return data;
};

export const getLikedRestaurants = async (userId) => {
  const { data, error } = await supabase
    .from('liked_restaurants')
    .select(`
      restaurant_id,
      restaurants (*, restaurant_types(*), cities(*))
    `)
    .eq('user_id', userId);
  if (error) throw error;
  return data.map(item => ({ ...item.restaurants, isLiked: true }));
};

// Add this for debugging
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event, 'Session:', session)
})

export const updatePassword = async (currentPassword, newPassword) => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });
  if (error) throw error;
};