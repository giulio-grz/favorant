// PART 1: IMPORTS AND COMPONENT SETUP
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Plus, MapPin, Euro } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { 
  supabase,
  searchRestaurants, 
  createRestaurant, 
  createCity, 
  createRestaurantType,
  addNote, 
  addReview,
  addBookmark
} from '@/supabaseClient';
import { Textarea } from "@/components/ui/textarea";
import { AddressSection } from "@/components/ui/address-section";

const AddEditRestaurant = ({ 
  user, 
  types, 
  cities, 
  restaurants, 
  addLocalRestaurant, 
  updateLocalRestaurant,
  setTypes,  // Add this
  setCities   // Add this
}) => {
  // PART 2: STATE MANAGEMENT
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [notes, setNotes] = useState('');
  
  const [restaurant, setRestaurant] = useState({
    name: '',
    address: {
      street: '',
      postalCode: '',
      cityId: null,
    },
    typeId: null,
    price: 1
  });

  const [rating, setRating] = useState(5);
  const [error, setError] = useState(null);

  const [isToTry, setIsToTry] = useState(false);

  const [loadingState, setLoadingState] = useState({
    action: false
  });
  
  const [alert, setAlert] = useState({
    show: false,
    message: '',
    type: 'success'
  });
  
  // New Type/City states
  const [isAddingCity, setIsAddingCity] = useState(false);
  const [isAddingType, setIsAddingType] = useState(false);
  const [newCityName, setNewCityName] = useState('');
  const [newTypeName, setNewTypeName] = useState('');

  // Progress calculation
  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  // PART 3: HANDLERS AND EFFECTS
  const handleSearch = useCallback(async (query) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const results = await searchRestaurants(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setError('Failed to search restaurants');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, handleSearch]);

  const handleSelectRestaurant = async (selected) => {
    try {
      // Check if the restaurant ID exists
      if (!selected?.id) {
        console.error('No restaurant ID found:', selected);
        return;
      }
  
      // First check if the user already has this restaurant
      const { data: existingBookmark } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', user.id)
        .eq('restaurant_id', selected.id)
        .maybeSingle();
  
      const { data: existingReview } = await supabase
        .from('restaurant_reviews')
        .select('*')
        .eq('user_id', user.id)
        .eq('restaurant_id', selected.id)
        .maybeSingle();
  
      if (existingBookmark || existingReview) {
        // If user already has this restaurant, redirect to its page
        navigate(`/user/${user.id}/restaurant/${selected.id}`);
        return;
      }
  
      // Otherwise, proceed with adding to list
      setSelectedRestaurant(selected);
      setIsToTry(false);
      setShowReviewForm(false);
      setStep(3);
    } catch (error) {
      console.error('Error checking restaurant existence:', error);
    }
  };

  // Update the handleAddNewCity function:
  const handleAddNewCity = async () => {
    try {
      const newCity = await createCity({ 
        name: newCityName.trim(), 
        created_by: user.id,
        status: 'pending'
      });
  
      // Add to local state and parent state
      const updatedCity = { ...newCity, name: newCityName.trim() };
      setCities(prev => [...prev, updatedCity]);
      
      // Update restaurant state
      setRestaurant(prev => ({
        ...prev,
        address: {
          ...prev.address,
          cityId: newCity.id
        }
      }));
  
      setNewCityName('');
      setIsAddingCity(false);
    } catch (error) {
      setError('Failed to add new city');
      console.error('Error adding new city:', error);
    }
  };

  // Update the handleAddNewType function:
  const handleAddNewType = async () => {
    try {
      const newType = await createRestaurantType({ 
        name: newTypeName.trim(), 
        created_by: user.id,
        status: 'pending'
      });
  
      // Add to local state and parent state
      const updatedType = { ...newType, name: newTypeName.trim() };
      setTypes(prev => [...prev, updatedType]);
      
      // Update restaurant state
      setRestaurant(prev => ({
        ...prev,
        typeId: newType.id
      }));
  
      setNewTypeName('');
      setIsAddingType(false);
    } catch (error) {
      setError('Failed to add new type');
      console.error('Error adding new type:', error);
    }
  };

  const handleRecalculateCoordinates = async () => {
    try {
      if (!restaurant.address.street || !restaurant.address.cityId) {
        setError('Address and city are required for geocoding');
        return;
      }
  
      const selectedCity = cities.find(c => c.id === restaurant.address.cityId)?.name;
      if (!selectedCity) {
        setError('Please select a valid city');
        return;
      }
  
      const searchQuery = [
        restaurant.address.street,
        restaurant.address.postalCode,
        selectedCity
      ].filter(Boolean).join(', ');
  
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'RestaurantApp/1.0'
          }
        }
      );
  
      if (!response.ok) {
        throw new Error('Geocoding failed');
      }
  
      const data = await response.json();
  
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setRestaurant(prev => ({
          ...prev,
          address: {
            ...prev.address,
            latitude: parseFloat(lat),
            longitude: parseFloat(lon)
          }
        }));
      } else {
        throw new Error('Location not found');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setError('Failed to geocode address');
    }
  };

  const handleSubmit = async () => {
    try {
      setError(null);
  
      if (selectedRestaurant) {
        // Adding existing restaurant to user's list
        if (isToTry) {
          await addBookmark(user.id, selectedRestaurant.id, true);
        } else if (showReviewForm) {
          await addReview({
            user_id: user.id,
            restaurant_id: selectedRestaurant.id,
            rating: rating
          });
          
          if (notes.trim()) {
            await addNote({
              user_id: user.id,
              restaurant_id: selectedRestaurant.id,
              note: notes.trim()
            });
          }
        }
        navigate('/');
        return;
      }
      
      // Creating new restaurant (only if no existing restaurant was selected)
      const restaurantData = {
        name: restaurant.name,
        address: restaurant.address.street,
        postal_code: restaurant.address.postalCode,
        city_id: restaurant.address.cityId,
        type_id: restaurant.typeId,
        price: restaurant.price
      };
  
      console.log('Submitting restaurant:', restaurantData);
  
      const newRestaurant = await createRestaurant(restaurantData, user.id, isToTry);
      
      if (showReviewForm && newRestaurant) {
        await addReview({
          user_id: user.id,
          restaurant_id: newRestaurant.id,
          rating: rating
        });
        
        if (notes.trim()) {
          await addNote({
            user_id: user.id,
            restaurant_id: newRestaurant.id,
            note: notes.trim()
          });
        }
      }
  
      if (newRestaurant) {
        const enrichedRestaurant = {
          ...newRestaurant,
          cities: cities.find(c => c.id === restaurantData.city_id),
          restaurant_types: types.find(t => t.id === restaurantData.type_id)
        };
        addLocalRestaurant(enrichedRestaurant);
        navigate('/');
      }
    } catch (error) {
      console.error('Error submitting restaurant:', error);
      setError(error.message || 'Failed to add restaurant');
    }
  };

  // Add this function to check if the form is valid
  const isFormValid = () => {
    if (step < 3) {
      return (
        restaurant.name && 
        restaurant.address.street && 
        restaurant.address.postalCode && 
        restaurant.address.cityId !== null && 
        restaurant.typeId !== null && 
        restaurant.price
      );
    }
    
    // For step 3, we just need either isToTry selected or showReviewForm
    return isToTry || showReviewForm;
  };

  // PART 4: RENDER JSX
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="max-w-2xl mx-auto w-full">
        {/* Top Progress Bar */}
        <div className="fixed top-0 left-0 right-0 z-10 bg-background border-b">
          <div className="p-4 max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-2 text-sm text-muted-foreground">
              <span>Step {step} of {totalSteps}</span>
              <span className="text-foreground font-medium">
                {step === 1 ? 'Search' : step === 2 ? 'Details' : 'Add to List'}
              </span>
            </div>
            <Progress 
              value={progress} 
              className="h-1 bg-emerald-100" 
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 pt-20 px-4 pb-20">
        {/* Step 1: Search */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search restaurants..."
                className="pl-10 h-12 text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Searching...
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((result) => {
                  const isInList = restaurants.some(r => r.id === result.id);
                  
                  return (
                    <button
                      key={result.id}
                      className="w-full p-4 text-left bg-card hover:bg-accent rounded-lg border transition-colors"
                      onClick={() => {
                        if (isInList) {
                          navigate(`/restaurant/${result.id}`);
                        } else {
                          handleSelectRestaurant(result);
                        }
                      }}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="font-medium">{result.name}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {result.address}
                          </div>
                          <div className="flex gap-2 mt-2">
                            {result.restaurant_types?.name && (
                              <Badge variant="secondary" className="text-xs">
                                {result.restaurant_types.name}
                              </Badge>
                            )}
                            {isInList && (
                              <Badge variant="outline" className="text-xs">
                                Already in list
                              </Badge>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground mt-1" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : searchQuery.length > 2 ? (
              <div className="text-center py-8 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-4">
                  No restaurants found matching "{searchQuery}"
                </p>
                <Button 
                  onClick={() => {
                    setRestaurant(prev => ({ ...prev, name: searchQuery }));
                    setStep(2);
                  }} 
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add as New Restaurant
                </Button>
              </div>
            ) : searchQuery.length > 0 ? (
              <p className="text-sm text-center text-muted-foreground">
                Type at least 3 characters to search
              </p>
            ) : null}
          </div>
        )}

        {/* Step 2: Restaurant Details */}
        {step === 2 && (
          <div className="space-y-6">
          <div className="space-y-4">
            {/* Restaurant Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Restaurant Name</Label>
              <Input
                id="name"
                value={restaurant.name}
                onChange={(e) => setRestaurant(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter restaurant name"
                className="h-12"
              />
            </div>
        
            {/* Address and Postal Code in same row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Street Address</Label>
                <Input
                  value={restaurant.address.street}
                  onChange={(e) => setRestaurant(prev => ({
                    ...prev,
                    address: {
                      ...prev.address,
                      street: e.target.value
                    }
                  }))}
                  placeholder="Enter street address"
                  className="h-12"
                />
              </div>
        
              <div className="space-y-2">
                <Label>Postal Code</Label>
                <Input
                  value={restaurant.address.postalCode}
                  onChange={(e) => setRestaurant(prev => ({
                    ...prev,
                    address: {
                      ...prev.address,
                      postalCode: e.target.value
                    }
                  }))}
                  placeholder="Enter postal code"
                  className="h-12"
                />
              </div>
            </div>
        
            {/* City Selection */}
            <div className="space-y-2">
              <Label>City</Label>
              <Select
                value={restaurant.address.cityId?.toString()}
                onValueChange={(value) => {
                  if (value === 'new') {
                    setIsAddingCity(true);
                  } else {
                    setRestaurant(prev => ({
                      ...prev,
                      address: {
                        ...prev.address,
                        cityId: parseInt(value)
                      }
                    }));
                  }
                }}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map(city => (
                    <SelectItem key={city.id} value={city.id.toString()}>
                      {city.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="new" className="text-primary">
                    <Plus className="inline-block w-4 w-4 mr-2" />
                    Add new city
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
        
            {/* Type Selection */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={restaurant.typeId?.toString()}
                onValueChange={(value) => {
                  if (value === 'new') {
                    setIsAddingType(true);
                  } else {
                    setRestaurant(prev => ({
                      ...prev,
                      typeId: parseInt(value)
                    }));
                  }
                }}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {types.map(type => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="new" className="text-primary">
                    <Plus className="inline-block w-4 w-4 mr-2" />
                    Add new type
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Website Field */}
            <div className="space-y-2">
              <Label>Website (optional)</Label>
              <Input
                type="url"
                value={restaurant.website || ''}
                onChange={(e) => setRestaurant(prev => ({
                  ...prev,
                  website: e.target.value
                }))}
                placeholder="https://example.com"
                className="h-12"
              />
            </div>
        
            {/* Price Selection */}
            <div className="space-y-2">
              <Label>Price Range</Label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={restaurant.price === value ? "default" : "outline"}
                    className="h-12"
                    onClick={() => setRestaurant(prev => ({ ...prev, price: value }))}
                  >
                    {'€'.repeat(value)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Step 3: Add to List */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium">Add to Your List</h2>
            <div className="space-y-4">
              <Button
                variant={isToTry ? "default" : "outline"}
                className="w-full justify-start h-auto p-4"
                onClick={() => {
                  setIsToTry(true);
                  setShowReviewForm(false);
                }}
              >
                <div className="flex flex-col items-start text-left">
                  <span className="font-medium">Add to "To Try" List</span>
                  <span className="text-sm text-muted-foreground mt-1 break-words">
                    Save this restaurant to try later
                  </span>
                </div>
              </Button>

              <Button
                variant={showReviewForm ? "default" : "outline"}
                className="w-full justify-start h-auto p-4"
                onClick={() => {
                  setIsToTry(false);
                  setShowReviewForm(true);
                }}
              >
                <div className="flex flex-col items-start text-left">
                  <span className="font-medium">Add Review</span>
                  <span className="text-sm text-muted-foreground mt-1 break-words">
                    I've visited this restaurant and want to add a review
                  </span>
                </div>
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => step > 1 ? setStep(prev => prev - 1) : navigate('/')}
          >
            {step > 1 ? 'Back' : 'Cancel'}
          </Button>
          
          <Button
            className="flex-1"
            disabled={!isFormValid()}
            onClick={() => {
              if (step < 3) {
                setStep(prev => prev + 1);
              } else {
                handleSubmit();
              }
            }}
          >
            {step === 3 ? 'Add Restaurant' : 'Next'}
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      {/* Add New City Dialog */}
      <Dialog open={isAddingCity} onOpenChange={setIsAddingCity}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New City</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>City Name</Label>
            <Input
              value={newCityName}
              onChange={(e) => setNewCityName(e.target.value)}
              placeholder="Enter city name"
              className="mt-2"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsAddingCity(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddNewCity}
              disabled={!newCityName.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Add City
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Type Dialog */}
      <Dialog open={isAddingType} onOpenChange={setIsAddingType}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Type</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Type Name</Label>
            <Input
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              placeholder="Enter type name"
              className="mt-2"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsAddingType(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddNewType}
              disabled={!newTypeName.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Add Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Your Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex items-center space-x-4">
                <Slider
                  min={0}
                  max={10}
                  step={0.5}
                  value={[rating]}
                  onValueChange={(value) => setRating(value[0])}
                  className="flex-1"
                />
                <div className="w-16 text-right font-medium bg-emerald-50 text-emerald-700 px-2 py-1 rounded">
                  {rating === 10 ? '10' : rating.toFixed(1)}/10
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about your experience..."
                className="h-32 resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowReviewForm(false)}>
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                await handleSubmit();
                setShowReviewForm(false);
              }}
              disabled={rating === 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Add Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Message */}
      {error && (
        <div className="fixed bottom-20 left-4 right-4 bg-destructive/15 text-destructive p-4 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default AddEditRestaurant;