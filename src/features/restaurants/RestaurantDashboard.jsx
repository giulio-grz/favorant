import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import { getUserRestaurants, searchRestaurants, addBookmark, createRestaurant, removeRestaurantFromUserList } from '@/supabaseClient';
import SearchBar from './components/SearchBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Euro, MapPin, UtensilsCrossed, Star } from 'lucide-react';

const RestaurantDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isAddingRestaurant, setIsAddingRestaurant] = useState(false);
  const [newRestaurantName, setNewRestaurantName] = useState('');
  const [newRestaurantAddress, setNewRestaurantAddress] = useState('');
  const [selectedType, setSelectedType] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedPrice, setSelectedPrice] = useState(1);
  const [isToTryDialogOpen, setIsToTryDialogOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [isRemovingRestaurant, setIsRemovingRestaurant] = useState(null);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'info' });

  const fetchRestaurants = useCallback(async () => {
    if (!user || !user.id) return;
    try {
      setLoading(true);
      const fetchedRestaurants = await getUserRestaurants(user.id);
      console.log("Fetched restaurants in component:", fetchedRestaurants);
      setRestaurants(fetchedRestaurants);
      setError(null);
    } catch (err) {
      console.error("Error fetching restaurants in component:", err);
      setError('Failed to fetch restaurants. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const handleRestaurantClick = useCallback((restaurantId) => {
    navigate(`/restaurant/${restaurantId}`);
  }, [navigate]);

  const handleSearch = useCallback(async (query) => {
    setSearchQuery(query);
    if (query.length > 2) {
      try {
        const results = await searchRestaurants(query);
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching restaurants:', error);
        setAlert({ show: true, message: 'Failed to search restaurants. Please try again.', type: 'error' });
      }
    } else {
      setSearchResults([]);
    }
  }, []);

  const handleAddToList = useCallback(async (restaurant) => {
    try {
      const result = await addBookmark(user.id, restaurant.id);
      let message = 'Restaurant added to your list successfully.';
      let alertType = 'success';
  
      switch (result.status) {
        case 'reviewed':
        case 'exists':
        case 'added':
          // Use the same success message for all cases
          break;
        default:
          throw new Error('Unexpected result from addBookmark');
      }
      
      // Refresh the restaurant list regardless of the result
      await fetchRestaurants();
      
      setAlert({ show: true, message: message, type: alertType });
      setSearchResults([]);
      setSearchQuery('');
    } catch (error) {
      console.error('Error adding restaurant to list:', error);
      setAlert({ show: true, message: `Failed to add restaurant to your list: ${error.message}`, type: 'error' });
    }
  }, [user.id, fetchRestaurants]);

  const handleAddRestaurant = useCallback(async () => {
    try {
      const newRestaurant = await createRestaurant({
        name: newRestaurantName,
        address: newRestaurantAddress,
        type_id: selectedType,
        city_id: selectedCity,
        price: selectedPrice
      }, user.id);
      setSelectedRestaurant(newRestaurant);
      setIsAddingRestaurant(false);
      setIsToTryDialogOpen(true);
      fetchRestaurants();
    } catch (error) {
      console.error('Error adding restaurant:', error);
      setAlert({ show: true, message: 'Failed to add restaurant. Please try again.', type: 'error' });
    }
  }, [newRestaurantName, newRestaurantAddress, selectedType, selectedCity, selectedPrice, user.id, fetchRestaurants]);

  const handleRemoveFromList = async (restaurantId) => {
    try {
      const result = await removeRestaurantFromUserList(user.id, restaurantId);
  
      if (result.success) {
        setRestaurants(prevRestaurants => 
          prevRestaurants.filter(restaurant => restaurant.id !== restaurantId)
        );
        setAlert({ show: true, message: result.message, type: "success" });
      } else {
        throw new Error(result.message || 'Failed to remove restaurant');
      }
    } catch (error) {
      console.error('Error removing restaurant from list:', error);
      setAlert({ show: true, message: `Failed to remove restaurant: ${error.message}`, type: "error" });
    }
  };

  const filteredRestaurants = restaurants.filter(restaurant => {
    const matchesTab = 
      (activeTab === 'all') || 
      (activeTab === 'toTry' && restaurant.is_to_try) ||
      (activeTab === 'visited' && !restaurant.is_to_try);
    
    const matchesSearch = 
      restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      restaurant.restaurant_types?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      restaurant.cities?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const getPriceSymbol = (price) => {
    return '€'.repeat(price || 0);
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="toTry">To Try</TabsTrigger>
            <TabsTrigger value="visited">Visited</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="w-full sm:w-64">
          <SearchBar onSearch={handleSearch} />
        </div>
      </div>

      {searchResults.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Search Results:</h3>
          <div className="space-y-4">
            {searchResults.map((result) => (
              <Card key={result.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>{result.name}</CardTitle>
                  <CardDescription>{result.address}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>{result.cities?.name}</p>
                  <p>{result.restaurant_types?.name}</p>
                  <Button onClick={() => handleAddToList(result)}>Add to My List</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRestaurants.map((restaurant) => (
            <Card key={restaurant.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleRestaurantClick(restaurant.id)}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex-grow">
                  <h3 className="text-lg font-semibold mb-2">{restaurant.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                    <span>{restaurant.restaurant_types?.name || 'Type: N/A'}</span>
                    <span className="text-gray-300">·</span>
                    <span>{restaurant.cities?.name || 'City: N/A'}</span>
                    <span className="text-gray-300">·</span>
                    <span>{getPriceSymbol(restaurant.price) || 'Price: N/A'}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  {restaurant.is_to_try ? (
                    <Badge variant="secondary">To Try</Badge>
                  ) : (
                    <span>
                      {restaurant.aggregate_rating ? 
                        `${restaurant.aggregate_rating.toFixed(1)}/10` : 
                        (restaurant.restaurant_reviews && restaurant.restaurant_reviews.length > 0 ? 
                          `${restaurant.restaurant_reviews[0].rating}/10` : 
                          'Not Rated'
                        )
                      }
                    </span>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsRemovingRestaurant(restaurant);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {searchQuery.length > 2 && searchResults.length === 0 && (
        <div className="mt-4">
          <p>No restaurants found. Would you like to add "{searchQuery}"?</p>
          <Button onClick={() => setIsAddingRestaurant(true)}>Add New Restaurant</Button>
        </div>
      )}

      <Dialog open={isAddingRestaurant} onOpenChange={setIsAddingRestaurant}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Restaurant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Restaurant Name"
              value={newRestaurantName}
              onChange={(e) => setNewRestaurantName(e.target.value)}
            />
            <Input
              placeholder="Address"
              value={newRestaurantAddress}
              onChange={(e) => setNewRestaurantAddress(e.target.value)}
            />
            {/* Add inputs for type, city, and price */}
          </div>
          <DialogFooter>
            <Button onClick={handleAddRestaurant}>Add Restaurant</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isRemovingRestaurant !== null} onOpenChange={() => setIsRemovingRestaurant(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Restaurant from List</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{isRemovingRestaurant?.name}" from your list? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsRemovingRestaurant(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleRemoveFromList(isRemovingRestaurant.id)}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={alert.show} onOpenChange={() => setAlert({ ...alert, show: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {alert.type === 'error' ? 'Error' : 'Success'}
            </AlertDialogTitle>
            <AlertDialogDescription>{alert.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlert({ ...alert, show: false })}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RestaurantDashboard;