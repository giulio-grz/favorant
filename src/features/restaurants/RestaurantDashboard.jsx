import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import { supabase } from '@/supabaseClient';
import SearchBar from './components/SearchBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Euro, MapPin, UtensilsCrossed, Star, User, Plus, SlidersHorizontal } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import CityMap from './components/CityMap';

const formatRating = (rating) => {
  return rating === 10 ? "10" : rating.toFixed(1);
};

const useRestaurants = (userId, isViewingOwnRestaurants, filters, sortOption) => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasResults, setHasResults] = useState(true);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const MAX_RETRIES = 3;

  const fetchRestaurants = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setRestaurants([]);
      setError(null);
      setTotalCount(0);
      setHasResults(false);
      return;
    }
  
    try {
      setLoading(true);
      setError(null);
  
      // First get all approved restaurants
      const { data: restaurantsData, error: restaurantsError } = await supabase
        .from('restaurants')
        .select(`
          *,
          cities (*),
          restaurant_types (*),
          restaurant_reviews!restaurant_reviews_restaurant_id_fkey (
            rating,
            user_id
          ),
          bookmarks!bookmarks_restaurant_id_fkey (
            type,
            user_id
          )
        `)
        .eq('status', 'approved');
  
      if (restaurantsError) throw restaurantsError;
  
      let filteredData = restaurantsData;
      if (!isViewingOwnRestaurants) {
        // Viewing someone else's list - filter by their interactions
        filteredData = restaurantsData.filter(restaurant => 
          restaurant.restaurant_reviews.some(r => r.user_id === userId) ||
          restaurant.bookmarks.some(b => b.user_id === userId)
        );
      } else {
        // Viewing own list - show all restaurants with my interactions
        filteredData = restaurantsData.filter(restaurant =>
          restaurant.restaurant_reviews.some(r => r.user_id === userId) ||
          restaurant.bookmarks.some(b => b.user_id === userId) ||
          restaurant.created_by === userId
        );
      }
  
      let formattedRestaurants = filteredData.map(restaurant => {
        const userReview = restaurant.restaurant_reviews?.find(r => 
          r.user_id === userId
        );
  
        const userBookmark = restaurant.bookmarks?.find(b => 
          b.user_id === userId
        );
  
        return {
          ...restaurant,
          user_rating: userReview?.rating,
          is_to_try: userBookmark?.type === 'to_try'
        };
      });
  
      // Apply filters
      if (filters.name) {
        formattedRestaurants = formattedRestaurants.filter(r => 
          r.name.toLowerCase().includes(filters.name.toLowerCase())
        );
      }
      if (filters.type_id) {
        formattedRestaurants = formattedRestaurants.filter(r => r.type_id === filters.type_id);
      }
      if (filters.city_id) {
        formattedRestaurants = formattedRestaurants.filter(r => r.city_id === filters.city_id);
      }
      if (filters.price) {
        formattedRestaurants = formattedRestaurants.filter(r => r.price === filters.price);
      }
  
      switch (sortOption) {
        case 'name':
          formattedRestaurants.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'rating':
          formattedRestaurants.sort((a, b) => (b.user_rating || 0) - (a.user_rating || 0));
          break;
        case 'dateAdded':
        default:
          formattedRestaurants.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }
  
      setRestaurants(formattedRestaurants);
      setTotalCount(formattedRestaurants.length);
      setHasResults(formattedRestaurants.length > 0);
      setError(null);
  
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      setError(error.message);
      setRestaurants([]);
      setTotalCount(0);
      setHasResults(false);
    } finally {
      setLoading(false);
    }
  }, [userId, isViewingOwnRestaurants, filters, sortOption]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  return {
    restaurants,
    loading,
    error,
    totalCount,
    hasResults,
    refetch: fetchRestaurants
  };
};

const RestaurantDashboard = ({ user, filters, setFilters, sortOption, setSortOption, initialTab = 'all' }) => {
  const navigate = useNavigate();
  const { id: viewingUserId } = useParams();
  const [viewingUser, setViewingUser] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [alert, setAlert] = useState({ show: false, message: '', type: 'info' });
  const [loadingStates, setLoadingStates] = useState({
    view: true
  });

  const isViewingOwnRestaurants = !viewingUserId || viewingUserId === user.id;

  const { 
    restaurants, 
    loading, 
    error, 
    totalCount, 
    hasResults,
    refetch 
  } = useRestaurants(
    viewingUserId || user.id,
    isViewingOwnRestaurants,
    filters,
    sortOption
  );

  useEffect(() => {
    let mounted = true;

    const loadViewingUser = async () => {
      if (!viewingUserId || viewingUserId === user.id) {
        setViewingUser(null);
        setLoadingStates(prev => ({ ...prev, view: false }));
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', viewingUserId)
          .single();

        if (error) throw error;

        if (mounted) {
          setViewingUser(profile);
        }
      } catch (error) {
        console.error('Error loading viewing user:', error);
        if (mounted) {
          setAlert({
            show: true,
            message: 'Failed to load user profile',
            type: 'error'
          });
        }
      } finally {
        if (mounted) {
          setLoadingStates(prev => ({ ...prev, view: false }));
        }
      }
    };

    loadViewingUser();

    return () => {
      mounted = false;
    };
  }, [viewingUserId, user.id]);

  const handleRestaurantClick = useCallback((restaurantId) => {
    if (viewingUserId) {
      navigate(`/user/${viewingUserId}/restaurant/${restaurantId}`);
    } else {
      navigate(`/user/${user.id}/restaurant/${restaurantId}`);
    }
  }, [navigate, viewingUserId, user.id]);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

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

  if (loading || loadingStates.view) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="space-y-6 pb-44">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
      {viewingUser && (
          <div className="flex items-center space-x-3">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="text-xl">
                {viewingUser.username?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-base font-semibold">{viewingUser.username}</h2>
              <p className="text-xs text-muted-foreground">{viewingUser.email}</p>
            </div>
          </div>
        )}

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

      <CityMap
        restaurants={filteredRestaurants}
        cities={restaurants?.map(r => r.cities).filter(Boolean)}
        onRestaurantClick={handleRestaurantClick}
        className="mt-6"
      />

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
                {!restaurant.is_to_try && restaurant.user_rating && (
                <div className="absolute -bottom-2 -right-2 bg-white rounded-full px-2 py-0.5 text-sm border">
                  {formatRating(restaurant.user_rating)}
                </div>
              )}
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-semibold">{restaurant.name}</h3>
                <div className="text-sm text-gray-500 space-y-0.5">
                  <div>{restaurant.restaurant_types?.name}</div>
                  <div>
                    {restaurant.cities?.name}
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-400">
                {'€'.repeat(restaurant.price || 0)}
              </div>
            </div>
          </div>
        ))}

        {filteredRestaurants.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No restaurants found
          </div>
        )}
      </div>

      <AlertDialog open={alert.show} onOpenChange={() => setAlert({ ...alert, show: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {alert.type === 'error' ? 'Error' : 'Success'}
            </AlertDialogTitle>
            <AlertDialogDescription>{alert.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlert({ ...alert, show: false })}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-[100]">
        <Button 
          className="rounded-full shadow-xl h-12 px-6 bg-primary hover:bg-primary/90 min-w-[120px]"
          onClick={() => navigate('/add')}
        >
          <Plus className="h-5 w-5" />
          <span className="ml-2">Add</span>
        </Button>
        <Button 
          variant="outline"
          className="rounded-full shadow-xl h-12 px-6 bg-background border-2 min-w-[120px]"
          onClick={() => navigate('/filter')}
        >
          <SlidersHorizontal className="h-5 w-5" />
          <span className="ml-2">Filter</span>
        </Button>
      </div>
    </div>
  );
};

export default RestaurantDashboard;