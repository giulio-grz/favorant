import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { PlusCircle, Filter } from 'lucide-react';
import RestaurantFilter from './components/RestaurantFilter';
import { motion, AnimatePresence } from 'framer-motion';
import RestaurantCard from './components/RestaurantCard';
import AddRestaurant from './components/AddRestaurant';
import { SimpleDialog } from '../../components/ui/SimpleDialog';
import { useRestaurants } from './hooks/useRestaurants';
import { useTypesAndCities } from './hooks/useTypesAndCities';
import { useRestaurantOperations } from './hooks/useRestaurantOperations';

const RestaurantDashboard = () => {
  const { restaurants, loading, error, setRestaurants } = useRestaurants();
  const { types, cities, addType, editType, deleteType, addCity, editCity, deleteCity } = useTypesAndCities();
  const { addRestaurant, updateRestaurant, deleteRestaurant } = useRestaurantOperations();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  const [filters, setFilters] = useState({
    name: '',
    type_id: null,
    city_id: null,
    toTry: null,
    rating: 0
  });
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [sortOption, setSortOption] = useState('dateAdded');

  const handleEditRestaurant = (restaurant) => {
    setEditingRestaurant(restaurant);
    setIsEditDialogOpen(true);
  };

  const filteredRestaurants = restaurants.filter(restaurant => {
    const isVisited = !restaurant.to_try && restaurant.rating > 0;
    return (
      restaurant.name.toLowerCase().includes(filters.name.toLowerCase()) &&
      (!filters.type_id || restaurant.restaurant_types.id === filters.type_id) &&
      (!filters.city_id || restaurant.cities.id === filters.city_id) &&
      (filters.toTry === null || 
        (filters.toTry === true && restaurant.to_try === true) ||
        (filters.toTry === false && isVisited)) &&
      (filters.toTry !== false || restaurant.rating >= filters.rating)
    );
  }).sort((a, b) => {
    if (sortOption === 'name') {
      return a.name.localeCompare(b.name);
    } else if (sortOption === 'rating') {
      return (b.rating || 0) - (a.rating || 0);
    } else if (sortOption === 'dateAdded') {
      return new Date(b.created_at) - new Date(a.created_at);
    }
    return 0;
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">My Favorants</h1>
      <div className="flex space-x-2 mb-4">
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <PlusCircle size={16} className="mr-2" /> Add Favorant
        </Button>
        <Button onClick={() => setIsFilterDialogOpen(true)} variant="outline">
          <Filter size={16} className="mr-2" /> Filter & Sort
        </Button>
      </div>
      
      <SimpleDialog
        isOpen={isFilterDialogOpen}
        onClose={() => setIsFilterDialogOpen(false)}
        title="Filter & Sort Favorants"
      >
        <RestaurantFilter
          types={types}
          cities={cities}
          filters={filters}
          setFilters={setFilters}
          sortOption={sortOption}
          setSortOption={setSortOption}
          onClose={() => setIsFilterDialogOpen(false)}
        />
      </SimpleDialog>

      <SimpleDialog
  isOpen={isAddDialogOpen}
  onClose={() => setIsAddDialogOpen(false)}
  title="Add New Favorant"
>
  <AddRestaurant
    onAdd={async (newRestaurant) => {
      try {
        const addedRestaurant = await addRestaurant(newRestaurant);
        setRestaurants(prev => [...prev, addedRestaurant]);
        setIsAddDialogOpen(false);
      } catch (error) {
        alert('Failed to add restaurant: ' + error.message);
      }
    }}
    onCancel={() => setIsAddDialogOpen(false)}
    types={types}
    cities={cities}
    addType={addType}
    editType={editType}
    deleteType={deleteType}
    addCity={addCity}
    editCity={editCity}
    deleteCity={deleteCity}
  />
</SimpleDialog>

<SimpleDialog
  isOpen={isEditDialogOpen}
  onClose={() => setIsEditDialogOpen(false)}
  title="Edit Favorant"
>
  {editingRestaurant && (
    <AddRestaurant
      initialData={editingRestaurant}
      onAdd={async (updatedRestaurant) => {
        try {
          const updated = await updateRestaurant(editingRestaurant.id, updatedRestaurant);
          setRestaurants(prev => prev.map(r => r.id === editingRestaurant.id ? updated : r));
          setIsEditDialogOpen(false);
        } catch (error) {
          alert('Failed to update restaurant: ' + error.message);
        }
      }}
      onCancel={() => setIsEditDialogOpen(false)}
      types={types}
      cities={cities}
      addType={addType}
      editType={editType}
      deleteType={deleteType}
      addCity={addCity}
      editCity={editCity}
      deleteCity={deleteCity}
    />
  )}
</SimpleDialog>

      <AnimatePresence>
        {filteredRestaurants.map((restaurant) => (
          <RestaurantCard 
          key={restaurant.id} 
          restaurant={restaurant} 
          handleEditRestaurant={handleEditRestaurant}
          deleteRestaurant={async (id) => {
            try {
              await deleteRestaurant(id);
              setRestaurants(prev => prev.filter(r => r.id !== id));
            } catch (error) {
              alert('Failed to delete restaurant: ' + error.message);
            }
          }}
        />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default RestaurantDashboard;