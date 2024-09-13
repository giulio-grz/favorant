import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { Star, PlusCircle, X, Trash2, Edit, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import { Label } from './components/ui/label';

const DynamicInput = ({ options, selectedOption, onSelect, onAdd, onEdit, onDelete, placeholder, title, isFilter = false }) => {
  const [inputValue, setInputValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleAddNew = async () => {
    if (inputValue && !options.find(opt => opt.name.toLowerCase() === inputValue.toLowerCase())) {
      const newItem = await onAdd(inputValue);
      if (newItem) {
        onSelect(newItem);
        setInputValue('');
        setIsAdding(false);
      }
    }
  };

  const handleEdit = async (id) => {
    if (inputValue && inputValue !== options.find(opt => opt.id === id).name) {
      await onEdit(id, inputValue);
      setEditingId(null);
      setInputValue('');
    }
  };

  return (
    <div className="mb-4">
      <Label className="mb-2 block font-bold text-sm">{title}</Label>
      <div className="flex overflow-x-auto pb-2 mb-2 -mx-4 px-4">
        <div className="flex space-x-2">
          {options.map((option) => (
            <div key={option.id} className="flex-shrink-0">
              {editingId === option.id ? (
                <div className="flex">
                  <Input
                    value={inputValue}
                    onChange={handleInputChange}
                    className="w-24 text-sm"
                  />
                  <Button onClick={() => handleEdit(option.id)} size="sm" className="ml-1">Save</Button>
                  <Button onClick={() => {setEditingId(null); setInputValue('');}} size="sm" className="ml-1">Cancel</Button>
                </div>
              ) : (
                <Button
                  variant={selectedOption && selectedOption.id === option.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSelect(option)}
                  className="text-sm"
                >
                  {option.name} {getEmoji(option.name)}
                  {!isFilter && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(option.id);
                        setInputValue(option.name);
                      }}
                      className="ml-1 p-1"
                    >
                      <Edit size={12} />
                    </Button>
                  )}
                </Button>
              )}
            </div>
          ))}
          {!isFilter && !isAdding && (
            <Button onClick={() => setIsAdding(true)} size="sm" variant="outline" className="flex-shrink-0 text-sm">
              <PlusCircle size={16} className="mr-2" /> Add New
            </Button>
          )}
        </div>
      </div>
      {!isFilter && isAdding && (
        <div className="flex mt-2">
          <Input
            placeholder={placeholder}
            value={inputValue}
            onChange={handleInputChange}
            className="w-full text-sm"
          />
          <Button onClick={handleAddNew} size="sm" className="ml-2 whitespace-nowrap text-sm">Add</Button>
          <Button onClick={() => {setIsAdding(false); setInputValue('');}} size="sm" className="ml-2 whitespace-nowrap text-sm">Cancel</Button>
        </div>
      )}
    </div>
  );
};

const RestaurantCard = ({ restaurant, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedRestaurant, setEditedRestaurant] = useState(restaurant);

  const handleSave = () => {
    onUpdate(editedRestaurant);
    setIsEditing(false);
  };

  return (
    <Card className="mb-4 border-l-4" style={{ borderLeftColor: getColorForType(restaurant.type) }}>
      <CardContent className="pt-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-base">{restaurant.name} {getEmoji(restaurant.type)}</h3>
            <p className="text-xs text-gray-500">{restaurant.type} • {restaurant.city}</p>
          </div>
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={14}
                className={i < restaurant.rating ? "text-yellow-400" : "text-gray-300"}
                fill={i < restaurant.rating ? "currentColor" : "none"}
              />
            ))}
          </div>
        </div>
        {isEditing && (
          <div className="space-y-2 mt-2">
            <Input
              placeholder="Restaurant name"
              value={editedRestaurant.name}
              onChange={(e) => setEditedRestaurant({ ...editedRestaurant, name: e.target.value })}
              className="text-sm"
            />
            <Input
              placeholder="Restaurant type"
              value={editedRestaurant.type}
              onChange={(e) => setEditedRestaurant({ ...editedRestaurant, type: e.target.value })}
              className="text-sm"
            />
            <Input
              placeholder="City"
              value={editedRestaurant.city}
              onChange={(e) => setEditedRestaurant({ ...editedRestaurant, city: e.target.value })}
              className="text-sm"
            />
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <Button
                  key={value}
                  variant={editedRestaurant.rating === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditedRestaurant({ ...editedRestaurant, rating: value })}
                  className="text-xs px-2 py-1"
                >
                  {value}
                </Button>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-end space-x-2 mt-2">
          {isEditing ? (
            <Button onClick={handleSave} size="sm" className="text-xs">
              <Save size={14} className="mr-1" /> Save
            </Button>
          ) : (
            <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" className="text-xs">
              <Edit size={14} className="mr-1" /> Edit
            </Button>
          )}
          <Button onClick={() => onDelete(restaurant.id)} variant="destructive" size="sm" className="text-xs">
            <Trash2 size={14} className="mr-1" /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const RestaurantDashboard = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState(null);
  const [city, setCity] = useState(null);
  const [rating, setRating] = useState(0);
  const [types, setTypes] = useState([]);
  const [cities, setCities] = useState([]);
  const [filters, setFilters] = useState({ type: null, city: null, rating: 0 });

  useEffect(() => {
    fetchRestaurants();
    fetchTypes();
    fetchCities();
  }, []);

  const fetchRestaurants = async () => {
    const { data, error } = await supabase
      .from('restaurants')
      .select(`
        *,
        restaurant_types(id, name),
        cities(id, name)
      `);
    if (error) console.error('Error fetching restaurants:', error);
    else setRestaurants(data);
  };

  const fetchTypes = async () => {
    const { data, error } = await supabase.from('restaurant_types').select('*');
    if (error) console.error('Error fetching types:', error);
    else setTypes(data);
  };

  const fetchCities = async () => {
    const { data, error } = await supabase.from('cities').select('*');
    if (error) console.error('Error fetching cities:', error);
    else setCities(data);
  };

  const addRestaurant = async () => {
    if (name && type && city && rating) {
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .insert([{ name, type_id: type.id, city_id: city.id, rating }])
          .select();
        
        if (error) throw error;

        console.log('Restaurant added successfully:', data);
        
        await fetchRestaurants();
        setName('');
        setType(null);
        setCity(null);
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

  const deleteRestaurant = async (id) => {
    try {
      const { error } = await supabase.from('restaurants').delete().eq('id', id);
      if (error) throw error;
      await fetchRestaurants();
    } catch (error) {
      console.error('Error deleting restaurant:', error.message);
    }
  };

  const updateRestaurant = async (updatedRestaurant) => {
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({
          name: updatedRestaurant.name,
          type_id: updatedRestaurant.type_id,
          city_id: updatedRestaurant.city_id,
          rating: updatedRestaurant.rating
        })
        .eq('id', updatedRestaurant.id);
      if (error) throw error;
      await fetchRestaurants();
    } catch (error) {
      console.error('Error updating restaurant:', error.message);
    }
  };

  const addType = async (newType) => {
    try {
      const { data, error } = await supabase
        .from('restaurant_types')
        .insert({ name: newType })
        .select();
      if (error) throw error;
      await fetchTypes();
      return data[0];
    } catch (error) {
      console.error('Error adding type:', error);
      alert('Failed to add type: ' + error.message);
    }
  };

  const addCity = async (newCity) => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .insert({ name: newCity })
        .select();
      if (error) throw error;
      await fetchCities();
      return data[0];
    } catch (error) {
      console.error('Error adding city:', error);
      alert('Failed to add city: ' + error.message);
    }
  };

  const editType = async (id, newName) => {
    try {
      const { error } = await supabase
        .from('restaurant_types')
        .update({ name: newName })
        .eq('id', id);
      if (error) throw error;
      await fetchTypes();
    } catch (error) {
      console.error('Error editing type:', error);
      alert('Failed to edit type: ' + error.message);
    }
  };

  const editCity = async (id, newName) => {
    try {
      const { error } = await supabase
        .from('cities')
        .update({ name: newName })
        .eq('id', id);
      if (error) throw error;
      await fetchCities();
    } catch (error) {
      console.error('Error editing city:', error);
      alert('Failed to edit city: ' + error.message);
    }
  };

  const deleteType = async (id) => {
    try {
      const { error } = await supabase
        .from('restaurant_types')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchTypes();
    } catch (error) {
      console.error('Error deleting type:', error);
      alert('Failed to delete type: ' + error.message);
    }
  };

  const deleteCity = async (id) => {
    try {
      const { error } = await supabase
        .from('cities')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchCities();
    } catch (error) {
      console.error('Error deleting city:', error);
      alert('Failed to delete city: ' + error.message);
    }
  };

  const resetFilters = useCallback(() => {
    setFilters({ type: null, city: null, rating: 0 });
  }, []);

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(restaurant => 
      (!filters.type || restaurant.type_id === filters.type.id) &&
      (!filters.city || restaurant.city_id === filters.city.id) &&
      (!filters.rating || restaurant.rating >= filters.rating)
    );
  }, [restaurants, filters]);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
        <h1 className="text-xl font-bold mb-2 sm:mb-0">My Restaurants</h1>
        {restaurants.length > 0 && (
          <div className="flex space-x-2 w-full sm:w-auto">
            <Button 
              onClick={() => setShowFilters(!showFilters)} 
              className="flex-1 sm:flex-initial text-sm"
            >
              {showFilters ? <ChevronUp className="mr-1" size={14} /> : <ChevronDown className="mr-1" size={14} />}
              Filters
            </Button>
            <Button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex-1 sm:flex-initial text-sm"
            >
              <PlusCircle className="mr-1" size={14} /> Add Restaurant
            </Button>
          </div>
        )}
      </div>

      {restaurants.length === 0 ? (
        <Card className="mb-4">
          <CardContent className="text-center py-8">
            <p className="text-gray-500 mb-4 text-sm">No restaurants added yet.</p>
            <Button onClick={() => setShowAddForm(true)} className="text-sm">
              <PlusCircle className="mr-2" size={14} /> Add Your First Restaurant
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {showFilters && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg">Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <DynamicInput
                    options={types}
                    selectedOption={filters.type}
                    onSelect={(value) => setFilters({...filters, type: value})}
                    onAdd={addType}
                    onEdit={editType}
                    onDelete={deleteType}
                    placeholder="Filter by type"
                    title="Restaurant Type"
                    isFilter={true}
                  />
                  <DynamicInput
                    options={cities}
                    selectedOption={filters.city}
                    onSelect={(value) => setFilters({...filters, city: value})}
                    onAdd={addCity}
                    onEdit={editCity}
                    onDelete={deleteCity}
                    placeholder="Filter by city"
                    title="City"
                    isFilter={true}
                  />
                  <div>
                    <Label className="mb-2 block font-bold text-sm">Minimum Rating</Label>
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4, 5].map((value) => (
                        <Button
                          key={value}
                          variant={filters.rating === value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFilters({...filters, rating: value})}
                          className="text-xs px-2 py-1"
                        >
                          {value === 0 ? 'Any' : `${value}+`} <Star size={12} className="ml-1" fill={filters.rating >= value ? "currentColor" : "none"} />
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
                <Button className="w-full mt-4 text-sm" onClick={resetFilters}>
                  Reset Filters
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {filteredRestaurants.map((restaurant) => (
              <RestaurantCard 
                key={restaurant.id} 
                restaurant={{
                  ...restaurant,
                  type: restaurant.restaurant_types.name,
                  city: restaurant.cities.name
                }}
                onDelete={deleteRestaurant}
                onUpdate={updateRestaurant}
              />
            ))}
          </div>
        </>
      )}

      {showAddForm && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">Add New Restaurant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block font-bold text-sm">Restaurant Name</Label>
                <Input
                  placeholder="Enter restaurant name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-sm"
                />
              </div>
              <DynamicInput
                options={types}
                selectedOption={type}
                onSelect={setType}
                onAdd={addType}
                onEdit={editType}
                onDelete={deleteType}
                placeholder="Enter new type"
                title="Restaurant Type"
              />
              <DynamicInput
                options={cities}
                selectedOption={city}
                onSelect={setCity}
                onAdd={addCity}
                onEdit={editCity}
                onDelete={deleteCity}
                placeholder="Enter new city"
                title="City"
              />
              <div>
                <Label className="mb-2 block font-bold text-sm">Rating</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Button
                      key={value}
                      variant={rating === value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRating(value)}
                      className="text-xs px-2 py-1"
                    >
                      {value} <Star size={12} className="ml-1" fill={rating >= value ? "currentColor" : "none"} />
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <Button className="w-full mt-4 text-sm" onClick={addRestaurant}>
              <PlusCircle className="mr-2" size={14} /> Add Restaurant
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const getEmoji = (type) => {
  const emojiMap = {
    'Italian': '🍕',
    'Japanese': '🍣',
    'Mexican': '🌮',
    'Chinese': '🥡',
    'Indian': '🍛',
    'American': '🍔',
    'French': '🥐',
    'Thai': '🍜',
    'Greek': '🥙',
    'Spanish': '🥘',
  };
  return emojiMap[type] || '🍴';
};

const getColorForType = (type) => {
  const colorMap = {
    'Italian': '#C41E3A',
    'Japanese': '#BC002D',
    'Mexican': '#006341',
    'Chinese': '#DE2910',
    'Indian': '#FF9933',
    'American': '#3C3B6E',
    'French': '#0055A4',
    'Thai': '#FF0000',
    'Greek': '#0D5EAF',
    'Spanish': '#AA151B',
  };
  return colorMap[type] || '#6B7280';
};

export default RestaurantDashboard;