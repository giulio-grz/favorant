import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './components/ui/card';
import { PlusCircle, Edit, Trash2, Star, ChevronDown, ChevronUp, X } from 'lucide-react';

const SimpleDialog = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const DynamicInput = ({ options, selectedOption, onSelect, onAdd, onEdit, onDelete, placeholder, title, isFilter = false }) => {
  const [inputValue, setInputValue] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleAddNew = async () => {
    if (inputValue && !options.find(opt => opt.name.toLowerCase() === inputValue.toLowerCase())) {
      const newItem = await onAdd(inputValue);
      if (newItem) {
        onSelect(newItem);
        setInputValue('');
        setIsDialogOpen(false);
      }
    }
  };

  const handleEdit = async () => {
    if (inputValue && inputValue !== options.find(opt => opt.id === editingId).name) {
      await onEdit(editingId, inputValue);
      setEditingId(null);
      setInputValue('');
      setIsDialogOpen(false);
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    await onDelete(editingId);
    setEditingId(null);
    setInputValue('');
    setIsDialogOpen(false);
    setIsEditing(false);
  };

  const openEditDialog = (option) => {
    setEditingId(option.id);
    setInputValue(option.name);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  return (
    <div className="mb-4">
      <Label className="mb-2 block font-bold text-sm">{title}</Label>
      <div className="flex overflow-x-auto pb-2 mb-2 -mx-4 px-4">
        <div className="flex space-x-2">
          {options.map((option) => (
            <div key={option.id} className="flex-shrink-0">
              <Button
                variant={selectedOption && selectedOption.id === option.id ? "default" : "outline"}
                size="sm"
                onClick={() => onSelect(option)}
                className="text-sm"
              >
                {option.name}
                {!isFilter && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDialog(option);
                    }}
                    className="ml-1 p-1"
                  >
                    <Edit size={12} />
                  </Button>
                )}
              </Button>
            </div>
          ))}
          {!isFilter && (
            <Button onClick={() => {setIsDialogOpen(true); setIsEditing(false);}} size="sm" variant="outline" className="flex-shrink-0 text-sm">
              <PlusCircle size={16} className="mr-2" /> Add New
            </Button>
          )}
        </div>
      </div>
      <SimpleDialog
        isOpen={isDialogOpen}
        onClose={() => {setIsDialogOpen(false); setIsEditing(false);}}
        title={isEditing ? `Edit ${title}` : `Add New ${title}`}
      >
        <Input
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          className="w-full text-sm mb-4"
        />
        <div className="flex justify-between">
          {isEditing ? (
            <>
              <Button onClick={handleDelete} variant="destructive" size="sm" className="w-[32%]">
                <Trash2 size={14} className="mr-1" /> Delete
              </Button>
              <Button onClick={() => {setIsDialogOpen(false); setIsEditing(false);}} variant="outline" size="sm" className="w-[32%]">
                Cancel
              </Button>
              <Button onClick={handleEdit} size="sm" className="w-[32%]">
                Save
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => {setInputValue(''); setIsDialogOpen(false);}} variant="outline" size="sm" className="w-[48%]">
                Cancel
              </Button>
              <Button onClick={handleAddNew} size="sm" className="w-[48%]">
                Save
              </Button>
            </>
          )}
        </div>
      </SimpleDialog>
    </div>
  );
};

const RestaurantDashboard = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState(null);
  const [city, setCity] = useState(null);
  const [rating, setRating] = useState(0);
  const [types, setTypes] = useState([]);
  const [cities, setCities] = useState([]);
  const [editingRestaurant, setEditingRestaurant] = useState(null);

  useEffect(() => {
    fetchRestaurants();
    fetchTypes();
    fetchCities();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select(`
          *,
          restaurant_types(id, name),
          cities(id, name)
        `);
      if (error) throw error;
      console.log('Fetched restaurants:', data);
      setRestaurants(data);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      alert('Error fetching restaurants: ' + error.message);
    }
  };

  const fetchTypes = async () => {
    try {
      const { data, error } = await supabase.from('restaurant_types').select('*');
      if (error) throw error;
      setTypes(data);
    } catch (error) {
      console.error('Error fetching types:', error);
      alert('Error fetching types: ' + error.message);
    }
  };

  const fetchCities = async () => {
    try {
      const { data, error } = await supabase.from('cities').select('*');
      if (error) throw error;
      setCities(data);
    } catch (error) {
      console.error('Error fetching cities:', error);
      alert('Error fetching cities: ' + error.message);
    }
  };

  const addRestaurant = async () => {
    if (name && type && city && rating) {
      try {
        console.log('Adding restaurant with:', { name, type, city, rating });

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
        setIsAddDialogOpen(false);
      } catch (error) {
        console.error('Error in addRestaurant:', error);
        alert('Failed to add restaurant: ' + error.message);
      }
    } else {
      alert('Please fill in all fields');
    }
  };

  const deleteRestaurant = async (id) => {
    try {
      const { error } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchRestaurants();
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      alert('Failed to delete restaurant: ' + error.message);
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
      setEditingRestaurant(null);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating restaurant:', error);
      alert('Failed to update restaurant: ' + error.message);
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

  const handleEditRestaurant = (restaurant) => {
    setEditingRestaurant({
      id: restaurant.id,
      name: restaurant.name,
      type_id: restaurant.restaurant_types.id,
      city_id: restaurant.cities.id,
      rating: restaurant.rating
    });
    setIsEditDialogOpen(true);
  };

  const RestaurantCard = ({ restaurant, handleEditRestaurant, deleteRestaurant }) => {
    const getEmoji = (type) => {
      const emojiMap = {
        'Italian': '🍕', 'Japanese': '🍣', 'Mexican': '🌮', 'Chinese': '🥡',
        'Indian': '🍛', 'American': '🍔', 'French': '🥐', 'Thai': '🍜',
        'Greek': '🥙', 'Spanish': '🥘',
      };
      return emojiMap[type] || '🍴';
    };
  
    const getCityEmoji = (city) => {
      const cityEmojiMap = {
        'New York': '🗽', 'Los Angeles': '🌴', 'Chicago': '🌭', 'Houston': '🤠',
        'Phoenix': '🏜️', 'Philadelphia': '🔔', 'San Antonio': '🌵', 'San Diego': '🏖️',
        'Dallas': '🐎', 'San Jose': '💻',
      };
      return cityEmojiMap[city] || '🏙️';
    };
  
    return (
      <Card className="mb-4 overflow-hidden hover:shadow-md transition-shadow duration-300">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">{restaurant.name}</h3>
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={i < restaurant.rating ? 'text-yellow-400' : 'text-gray-200'}
                  size={16}
                  fill={i < restaurant.rating ? 'currentColor' : 'none'}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center text-sm text-gray-600 mb-4">
            <span className="mr-2">{getEmoji(restaurant.restaurant_types.name)}</span>
            <span className="mr-4">{restaurant.restaurant_types.name}</span>
            <span className="mr-2">{getCityEmoji(restaurant.cities.name)}</span>
            <span>{restaurant.cities.name}</span>
          </div>
          <div className="flex justify-end space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleEditRestaurant(restaurant)}
              className="text-blue-500 hover:text-blue-700"
            >
              <Edit size={14} className="mr-1" /> Edit
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => deleteRestaurant(restaurant.id)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 size={14} className="mr-1" /> Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Restaurant Dashboard</h1>
      <Button className="mb-4" onClick={() => setIsAddDialogOpen(true)}>
        <PlusCircle size={16} className="mr-2" /> Add Restaurant
      </Button>
      <SimpleDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        title="Add New Restaurant"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <DynamicInput
            options={types}
            selectedOption={type}
            onSelect={setType}
            onAdd={addType}
            onEdit={editType}
            onDelete={deleteType}
            placeholder="Enter restaurant type"
            title="Type"
          />
          <DynamicInput
            options={cities}
            selectedOption={city}
            onSelect={setCity}
            onAdd={addCity}
            onEdit={editCity}
            onDelete={deleteCity}
            placeholder="Enter city"
            title="City"
          />
          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <Button
                  key={value}
                  variant={rating === value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRating(value)}
                >
                  {value} <Star className="ml-1" size={14} />
                </Button>
              ))}
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={addRestaurant}>Add Restaurant</Button>
          </div>
        </div>
      </SimpleDialog>
      <SimpleDialog
  isOpen={isEditDialogOpen}
  onClose={() => setIsEditDialogOpen(false)}
  title="Edit Restaurant"
>
  {editingRestaurant && (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-name">Name</Label>
        <Input
          id="edit-name"
          value={editingRestaurant.name}
          onChange={(e) => setEditingRestaurant({ ...editingRestaurant, name: e.target.value })}
        />
      </div>
      <DynamicInput
        options={types}
        selectedOption={types.find(t => t.id === editingRestaurant.type_id)}
        onSelect={(type) => setEditingRestaurant({ ...editingRestaurant, type_id: type.id })}
        onAdd={addType}
        onEdit={editType}
        onDelete={deleteType}
        placeholder="Enter restaurant type"
        title="Type"
      />
      <DynamicInput
        options={cities}
        selectedOption={cities.find(c => c.id === editingRestaurant.city_id)}
        onSelect={(city) => setEditingRestaurant({ ...editingRestaurant, city_id: city.id })}
        onAdd={addCity}
        onEdit={editCity}
        onDelete={deleteCity}
        placeholder="Enter city"
        title="City"
      />
      <div className="space-y-2">
        <Label>Rating</Label>
        <div className="flex space-x-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <Button
              key={value}
              variant={editingRestaurant.rating === value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setEditingRestaurant({ ...editingRestaurant, rating: value })}
            >
              {value} <Star className="ml-1" size={14} />
            </Button>
          ))}
        </div>
      </div>
      <div className="flex justify-end mt-4">
        <Button onClick={() => updateRestaurant(editingRestaurant)}>Save Changes</Button>
      </div>
    </div>
  )}
</SimpleDialog>
<div className="space-y-4">
  {restaurants.map((restaurant) => (
    <RestaurantCard 
      key={restaurant.id} 
      restaurant={restaurant} 
      handleEditRestaurant={handleEditRestaurant}
      deleteRestaurant={deleteRestaurant}
    />
  ))}
</div>
    </div>
  );
};

export default RestaurantDashboard;