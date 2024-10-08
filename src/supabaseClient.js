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
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileCheckError && profileCheckError.code !== 'PGRST116') {
        throw profileCheckError;
      }

      if (!existingProfile) {
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
      .neq('id', currentUserId)
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

export const copyRestaurant = async (userId, originalRestaurantId) => {
  const { data: originalRestaurant, error: fetchError } = await supabase
    .from('restaurants')
    .select(`
      *,
      user:profiles!restaurants_user_id_fkey(username)
    `)
    .eq('id', originalRestaurantId)
    .single();

  if (fetchError) throw fetchError;

  const newRestaurant = {
    name: originalRestaurant.name,
    type_id: originalRestaurant.type_id,
    city_id: originalRestaurant.city_id,
    rating: originalRestaurant.rating,
    price: originalRestaurant.price,
    notes: `Added from ${originalRestaurant.user.username}\n\n${originalRestaurant.notes || ''}`.trim(),
    to_try: true,
    user_id: userId,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('restaurants')
    .insert([newRestaurant])
    .select();

  if (error) throw error;
  return data[0];
};

export const getUserRestaurants = async (userId) => {
  const { data, error } = await supabase
    .from('restaurants')
    .select(`
      *,
      restaurant_types(*),
      cities(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const updatePassword = async (currentPassword, newPassword) => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });
  if (error) throw error;
};

supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event, 'Session:', session)
})