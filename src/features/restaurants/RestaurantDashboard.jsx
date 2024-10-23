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
  const [viewingUser, setViewingUser] = useState(null);
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

  useEffect(() => {
    const fetchViewingUser = async () => {
      if (viewingUserId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', viewingUserId)
          .single();
        setViewingUser(profile);
      }
    };
    fetchViewingUser();
  }, [viewingUserId]);

  const fetchRestaurants = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const fetchedRestaurants = await getUserRestaurants(viewingUserId || user.id);
      console.log("Fetched restaurants in component:", fetchedRestaurants);
      setRestaurants(fetchedRestaurants);
      setError(null);
    } catch (err) {
      console.error("Error fetching restaurants in component:", err);
      setError('Failed to fetch restaurants. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [user, viewingUserId]);

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
          break;
        default:
          throw new Error('Unexpected result from addBookmark');
      }
      
      await fetchRestaurants();
      setAlert({ show: true, message: message, type: alertType });
      setSearchResults([]);
      setSearchQuery('');
    } catch (error) {
      console.error('Error adding restaurant to list:', error);
      setAlert({ show: true, message: `Failed to add restaurant to your list: ${error.message}`, type: 'error' });
    }
  }, [user.id, fetchRestaurants]);

  const handleRemoveFromList = async (restaurantId) => {
    try {
      const result = await removeRestaurantFromUserList(user.id, restaurantId);
      if (result.success) {
        setRestaurants(prevRestaurants => 
          prevRestaurants.filter(restaurant => restaurant.id !== restaurantId)
        );
        setAlert({ show: true, message: result.message, type: "success" });
        setIsRemovingRestaurant(null);
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
    
    const matchesSearch = !searchQuery || 
      restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      restaurant.restaurant_types?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      restaurant.cities?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

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