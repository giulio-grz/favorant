import React, { useState, useEffect, useCallback } from 'react';
import { supabase, likeRestaurant, unlikeRestaurant } from '../../supabaseClient';
import UserSearch from '../../components/UserSearch';
import UserMenu from '../../components/UserMenu';
import { useRestaurants } from './hooks/useRestaurants';
import { Button } from '../../components/ui/button';
import RestaurantCard from './components/RestaurantCard';
import RestaurantPopup from './components/RestaurantPopup';
import AddRestaurant from './components/AddRestaurant';
import RestaurantFilter from './components/RestaurantFilter';
import { useTypesAndCities } from './hooks/useTypesAndCities';
import { useRestaurantOperations } from './hooks/useRestaurantOperations';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { PlusCircle, Filter, ArrowLeft } from 'lucide-react';
import MobileMenu from './MobileMenu';

const RestaurantDashboard = ({ user, setUser }) => {
  // State for managing the viewed user and their profile
  const [viewingUserId, setViewingUserId] = useState(user?.id);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [searchedUser, setSearchedUser] = useState(null);

  // State for filters and sorting
  const [filters, setFilters] = useState({
    name: '',
    type_id: null,
    city_id: null,
    toTry: null,
    rating: 0,
    price: null
  });
  const [sortOption, setSortOption] = useState('dateAdded');

  // State for managing dialogs
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [restaurantToEdit, setRestaurantToEdit] = useState(null);
  
  // Custom hooks
  const { types, cities, addType, editType, deleteType, addCity, editCity, deleteCity } = useTypesAndCities();
  const { addRestaurant, updateRestaurant, deleteRestaurant } = useRestaurantOperations();
  const { 
    restaurants, 
    setRestaurants,
    loading, 
    error, 
    fetchRestaurants, 
    totalCount,
    loadMore: loadMoreRestaurants
  } = useRestaurants(user.id, viewingUserId, filters, sortOption);

  // Effect to fetch profile and restaurants when viewing user changes
  useEffect(() => {
    if (viewingUserId) {
      const fetchProfile = async () => {
        try {
          const profile = await getProfile(viewingUserId);
          setViewingProfile(profile);
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      };
      fetchProfile();
      fetchRestaurants();
    }
  }, [viewingUserId, fetchRestaurants]);

  // Handler for selecting a user to view
  const handleUserSelect = (selectedUser) => {
    setSearchedUser(selectedUser);
    setViewingUserId(selectedUser.id);
  };

  // Handler for clicking on a restaurant
  const handleRestaurantClick = (restaurant) => {
    setSelectedRestaurant(restaurant);
  };

  // Handler for adding a new restaurant
  const handleAddRestaurant = async (newRestaurant) => {
    try {
      const addedRestaurant = await addRestaurant({ ...newRestaurant, user_id: user.id });
      setRestaurants(prevRestaurants => [addedRestaurant, ...prevRestaurants]);
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Failed to add restaurant:', error);
      alert(`Failed to add restaurant: ${error.message}`);
    }
  };

  // Handler for clicking edit on a restaurant
  const handleEditClick = (restaurant) => {
    setRestaurantToEdit(restaurant);
    setIsEditDialogOpen(true);
  };

  // Handler for updating a restaurant
  const handleUpdateRestaurant = async (updatedRestaurant) => {
    try {
      const { id, city_id, type_id, cities, restaurant_types, ...rest } = updatedRestaurant;
      
      if (!id) {
        throw new Error("Restaurant ID is missing");
      }

      const updateData = {
        ...rest,
        city_id: typeof city_id === 'object' ? city_id.id : city_id,
        type_id: typeof type_id === 'object' ? type_id.id : type_id
      };

      await updateRestaurant(id, updateData);
      fetchRestaurants();
      setIsEditDialogOpen(false);
      setSelectedRestaurant(null);
    } catch (error) {
      console.error('Failed to update restaurant:', error);
      alert(`Failed to update restaurant: ${error.message}`);
    }
  };

  // Handler for deleting a restaurant
  const handleDeleteRestaurant = async (id) => {
    try {
      await deleteRestaurant(id);
      fetchRestaurants();
      setSelectedRestaurant(null);
    } catch (error) {
      console.error('Failed to delete restaurant:', error);
      alert(`Failed to delete restaurant: ${error.message}`);
    }
  };

  // Handler for liking a restaurant
  const handleLike = async (restaurantId) => {
    try {
      await likeRestaurant(user.id, restaurantId);
      setRestaurants(prevRestaurants => 
        prevRestaurants.map(r => 
          r.id === restaurantId ? { ...r, isLiked: true } : r
        )
      );
      if (viewingUserId !== user.id) {
        // Refetch restaurants when liking on another user's profile
        fetchRestaurants();
      }
    } catch (error) {
      console.error('Failed to like restaurant:', error);
      alert(`Failed to like restaurant: ${error.message}`);
    }
  };

  // Handler for unliking a restaurant
  const handleUnlike = async (restaurantId) => {
    try {
      await unlikeRestaurant(user.id, restaurantId);
      setRestaurants(prevRestaurants => 
        prevRestaurants.map(r => 
          r.id === restaurantId ? { ...r, isLiked: false } : r
        )
      );
      if (viewingUserId === user.id) {
        // Remove unliked restaurant from the list if it's not owned
        setRestaurants(prevRestaurants => 
          prevRestaurants.filter(r => r.id !== restaurantId || r.isOwned)
        );
      }
    } catch (error) {
      console.error('Failed to unlike restaurant:', error);
      alert(`Failed to unlike restaurant: ${error.message}`);
    }
  };

  // Memoized loadMore function
  const handleLoadMore = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Load More button clicked');
    loadMoreRestaurants();
  }, [loadMoreRestaurants]);

  // Calculate the number of active filters
  const activeFilterCount = Object.values(filters).filter(value => 
    value !== null && value !== '' && value !== 0 && value !== false
  ).length;

  if (loading && restaurants.length === 0) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            {searchedUser ? `${searchedUser.username}'s Favorants` : 'My Favorants'}
          </h1>
          <div className="flex items-center space-x-2">
            {searchedUser && (
              <Button 
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchedUser(null);
                  setViewingUserId(user.id);
                }}
                className="flex items-center"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to My Favorants
              </Button>
            )}
            <MobileMenu 
              onAddClick={() => setIsAddDialogOpen(true)}
              onFilterClick={() => setIsFilterDialogOpen(true)}
              onUserSelect={handleUserSelect}
              currentUserId={user.id}
              user={user}
              setUser={setUser}
              canAdd={user.id === viewingUserId}
            />
          </div>
        </div>
      </div>
      
      {/* Restaurant list section */}
      <div className="mt-8">
        <div className="grid grid-cols-1 gap-4">
          {restaurants.map((restaurant) => (
            <RestaurantCard 
              key={restaurant.id} 
              restaurant={restaurant} 
              onClick={() => handleRestaurantClick(restaurant)}
              onLike={handleLike}
              onUnlike={handleUnlike}
              currentUserId={user.id}
            />
          ))}
        </div>
      </div>
      
      {/* Load more button */}
      {totalCount > restaurants.length && (
        <Button 
          onClick={handleLoadMore}
          className="mt-6 w-full" 
          disabled={loading}
          type="button"
        >
          {loading ? 'Loading...' : 'Load More'}
        </Button>
      )}
      
      {/* Restaurant detail dialog */}
      <Dialog open={!!selectedRestaurant} onOpenChange={() => setSelectedRestaurant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedRestaurant?.name}</DialogTitle>
          </DialogHeader>
          <RestaurantPopup
            restaurant={selectedRestaurant}
            onClose={() => setSelectedRestaurant(null)}
            onEdit={handleEditClick}
            onDelete={handleDeleteRestaurant}
            isOwner={user && user.id === viewingUserId}
          />
        </DialogContent>
      </Dialog>
      
      {/* Add restaurant dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Favorant</DialogTitle>
            <DialogDescription>Enter the details for your new favorite restaurant.</DialogDescription>
          </DialogHeader>
          <AddRestaurant
            onAdd={handleAddRestaurant}
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
        </DialogContent>
      </Dialog>
      
      {/* Edit restaurant dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Favorant</DialogTitle>
          </DialogHeader>
          <AddRestaurant
            onAdd={handleUpdateRestaurant}
            onCancel={() => setIsEditDialogOpen(false)}
            types={types}
            cities={cities}
            addType={addType}
            editType={editType}
            deleteType={deleteType}
            addCity={addCity}
            editCity={editCity}
            deleteCity={deleteCity}
            initialData={restaurantToEdit}
          />
        </DialogContent>
      </Dialog>
      
      {/* Filter dialog */}
      <RestaurantFilter
        isOpen={isFilterDialogOpen}
        onClose={() => setIsFilterDialogOpen(false)}
        types={types}
        cities={cities}
        filters={filters}
        setFilters={setFilters}
        sortOption={sortOption}
        setSortOption={setSortOption}
      />
    </div>
  );
};

export default RestaurantDashboard;