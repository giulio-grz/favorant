import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import { supabase, getUserRestaurants, searchRestaurants, addBookmark, createRestaurant, removeRestaurantFromUserList } from '@/supabaseClient';
import SearchBar from './components/SearchBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Euro, MapPin, UtensilsCrossed, Star, User } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const RestaurantDashboard = ({ user, filters, setFilters, sortOption, setSortOption }) => {
  const navigate = useNavigate();
  const { id: viewingUserId } = useParams();
  const mounted = React.useRef(true);
  const [viewingUser, setViewingUser] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
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
  const [loadingStates, setLoadingStates] = useState({
    restaurants: false,
    user: viewingUserId ? true : false,
    search: false
  });

  const setLoadingState = (key, value) => {
    if (mounted.current) {
      setLoadingStates(prev => ({ ...prev, [key]: value }));
    }
  };

  const fetchRestaurants = useCallback(async () => {
    console.log("Starting fetchRestaurants with user:", user);
    if (!user?.id) {
      console.log("No user ID available, skipping fetch");
      setLoadingState('restaurants', false);
      return;
    }
    
    try {
      setLoadingState('restaurants', true);
      console.log("Fetching restaurants for user ID:", viewingUserId || user.id);
      
      const targetUserId = viewingUserId || user.id;
      const fetchedRestaurants = await getUserRestaurants(targetUserId, targetUserId);
      
      console.log("Fetched restaurants:", fetchedRestaurants);
      
      if (mounted.current) {
        setRestaurants(fetchedRestaurants || []);
        setError(null);
      }
    } catch (err) {
      console.error("Error fetching restaurants:", err);
      if (mounted.current) {
        setError('Failed to fetch restaurants. Please try again later.');
        setRestaurants([]);
      }
    } finally {
      if (mounted.current) {
        setLoadingState('restaurants', false);
      }
    }
  }, [user?.id, viewingUserId]);

  useEffect(() => {
    console.log("Fetch restaurants effect running");
    if (user?.id) {
      console.log("User ID available, triggering fetch");
      fetchRestaurants();
    } else {
      console.log("No user ID available yet");
    }
  }, [fetchRestaurants, user?.id]);

  useEffect(() => {
    console.log("Fetch restaurants effect running");
    if (user?.id) {
      console.log("User ID available, triggering fetch");
      fetchRestaurants();
    } else {
      console.log("No user ID available yet");
    }
  }, [fetchRestaurants, user?.id]);

  const deleteLocalRestaurant = useCallback((restaurantId) => {
    setRestaurants(prevRestaurants => 
      prevRestaurants.filter(restaurant => restaurant.id !== restaurantId)
    );
  }, []);

  const handleRestaurantClick = (restaurantId) => {
    if (viewingUserId) {
      navigate(`/user/${viewingUserId}/restaurant/${restaurantId}`);
    } else {
      navigate(`/user/${user.id}/restaurant/${restaurantId}`);
    }
  };

  const handleSearch = useCallback(async (query) => {
    setSearchQuery(query);
    if (query.length > 2) {
      try {
        setLoadingState('search', true);
        const results = await searchRestaurants(query);
        if (mounted.current) {
          setSearchResults(results);
        }
      } catch (error) {
        console.error('Error searching restaurants:', error);
        if (mounted.current) {
          setAlert({ show: true, message: 'Failed to search restaurants. Please try again.', type: 'error' });
        }
      } finally {
        if (mounted.current) {
          setLoadingState('search', false);
        }
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
          break;
        default:
          throw new Error('Unexpected result from addBookmark');
      }
      
      await fetchRestaurants();
      if (mounted.current) {
        setAlert({ show: true, message: message, type: alertType });
        setSearchResults([]);
        setSearchQuery('');
      }
    } catch (error) {
      console.error('Error adding restaurant to list:', error);
      if (mounted.current) {
        setAlert({ show: true, message: `Failed to add restaurant to your list: ${error.message}`, type: 'error' });
      }
    }
  }, [user.id, fetchRestaurants]);

  const handleRemoveFromList = async (restaurantId) => {
    try {
      setLoadingState('restaurants', true);
      console.log('Attempting to remove restaurant:', restaurantId);
      const result = await removeRestaurantFromUserList(user.id, restaurantId);
      console.log('Remove restaurant result:', result);
      
      if (result) {
        setRestaurants(prevRestaurants => 
          prevRestaurants.filter(restaurant => restaurant.id !== restaurantId)
        );
        setAlert({ show: true, message: 'Restaurant removed successfully', type: "success" });
        setIsRemovingRestaurant(null);
        
        // Force a refresh of the restaurants list
        await fetchRestaurants();
      }
    } catch (error) {
      console.error('Error removing restaurant:', error);
      setAlert({ show: true, message: `Failed to remove restaurant: ${error.message}`, type: "error" });
    } finally {
      setLoadingState('restaurants', false);
    }
  };

  const filteredRestaurants = restaurants.filter(restaurant => {
    const matchesTab = 
      (activeTab === 'all') || 
      (activeTab === 'toTry' && restaurant.is_to_try) ||
      (activeTab === 'visited' && !restaurant.is_to_try);
    
    const matchesSearch = !searchQuery || 
      restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      restaurant.restaurant_types?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      restaurant.cities?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const isLoading = loadingStates.restaurants && !restaurants.length;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="space-y-6">
      {viewingUserId && viewingUser && (
        <div className="flex items-center space-x-4 mb-8">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-slate-100 text-slate-500 text-xl">
              {viewingUser.username?.substring(0, 2).toUpperCase() || <User className="h-8 w-8" />}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-bold">{viewingUser.username}</h1>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="visited">Visited</TabsTrigger>
            <TabsTrigger value="toTry">To Try</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="w-full sm:w-64">
          <SearchBar onSearch={handleSearch} />
        </div>
      </div>

      <div className="space-y-4">
      {filteredRestaurants.map((restaurant) => (
        <div 
          key={restaurant.id} 
          className="cursor-pointer hover:bg-slate-50 transition-all"
          onClick={() => handleRestaurantClick(restaurant.id)}
        >
          <div className="flex items-start p-4 relative">
            <div className="h-16 w-16 bg-slate-100 rounded-lg flex items-center justify-center text-xl font-semibold text-slate-500 relative">
              {restaurant.name.substring(0, 2).toUpperCase()}
              {restaurant.is_to_try && (
                <div className="absolute -bottom-2 -right-2">
                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px] px-1 py-0.5 leading-normal rounded-full">
                    To Try
                  </Badge>
                </div>
              )}
              {!restaurant.is_to_try && restaurant.aggregate_rating && (
                <div className="absolute -bottom-2 -right-2 bg-white rounded-full px-2 py-0.5 text-sm border">
                  {restaurant.aggregate_rating.toFixed(1)}
                </div>
              )}
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-semibold">{restaurant.name}</h3>
              <div className="text-sm text-gray-500 space-y-0.5">
                <div>{restaurant.restaurant_types?.name}</div>
                <div>{restaurant.cities?.name}</div>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              {'€'.repeat(restaurant.price || 0)}
            </div>
          </div>
        </div>
      ))}
      </div>

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