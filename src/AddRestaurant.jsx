const addRestaurant = async () => {
  if (name && type && city && rating) {
    try {
      // Check if the type exists, if not add it
      const { data: existingType } = await supabase
        .from('restaurant_types')
        .select('name')
        .eq('name', type)
        .single();

      if (!existingType) {
        await supabase.from('restaurant_types').insert({ name: type });
      }

      // Check if the city exists, if not add it
      const { data: existingCity } = await supabase
        .from('cities')
        .select('name')
        .eq('name', city)
        .single();

      if (!existingCity) {
        await supabase.from('cities').insert({ name: city });
      }

      // Add the restaurant
      const { data, error } = await supabase
        .from('restaurants')
        .insert([{ name, type, city, rating }]);
      
      if (error) throw error;

      console.log('Restaurant added successfully:', data);
      
      await fetchRestaurants();
      await fetchTypes();
      await fetchCities();
      setName('');
      setType('');
      setCity('');
      setRating(0);
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding restaurant:', error.message);
      alert('Failed to add restaurant: ' + error.message);
    }
  } else {
    alert('Please fill in all fields');
  }
};