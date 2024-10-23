import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Euro, MapPin, UtensilsCrossed, Search, Plus, ArrowRight, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createRestaurant, updateRestaurant, getRestaurantTypes, getCities, createCity, createRestaurantType, searchRestaurants, addBookmark, addReview, getUserRestaurantData } from '@/supabaseClient';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AddEditRestaurant = ({ user, types: initialTypes, cities: initialCities, restaurants, addLocalRestaurant, updateLocalRestaurant }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  // Main state
  const [currentStep, setCurrentStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showToTryStep, setShowToTryStep] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Restaurant data
  const [restaurant, setRestaurant] = useState({
    name: '',
    type_id: null,
    city_id: null,
    price: 1,
    address: '',
  });

  // Review data
  const [toTry, setToTry] = useState(false);
  const [rating, setRating] = useState(5);

  // Add new state for note
  const [initialNote, setInitialNote] = useState('');

  // UI state
  const [types, setTypes] = useState(initialTypes || []);
  const [cities, setCities] = useState(initialCities || []);
  const [openCity, setOpenCity] = useState(false);
  const [openType, setOpenType] = useState(false);
  const [isAddingType, setIsAddingType] = useState(false);
  const [isAddingCity, setIsAddingCity] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newCityName, setNewCityName] = useState('');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (isEditing && id) {
      // Fetch restaurant data if editing
      const fetchRestaurantData = async () => {
        try {
          const data = await getUserRestaurantData(user.id, id);
          if (data) {
            setRestaurant({
              name: data.name,
              type_id: data.type_id,
              city_id: data.city_id,
              price: data.price,
              address: data.address,
            });
          }
        } catch (error) {
          setError('Failed to fetch restaurant data');
        }
      };
      fetchRestaurantData();
    }
  }, [isEditing, id, user.id]);

  // Handlers
  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length > 2) {
      setSearchLoading(true);
      try {
        const results = await searchRestaurants(query);
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching restaurants:', error);
        setError('Failed to search restaurants. Please try again.');
      } finally {
        setSearchLoading(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleAddNew = () => {
    if (searchQuery.trim()) {
      setShowAddForm(true);
      setRestaurant(prev => ({
        ...prev,
        name: searchQuery.trim()
      }));
      setCurrentStep(2);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSelectRestaurant = (restaurant) => {
    setSelectedRestaurant(restaurant);
    setRestaurant({
      name: restaurant.name,
      type_id: restaurant.restaurant_types?.id,
      city_id: restaurant.cities?.id,
      address: restaurant.address,
      price: restaurant.price || 1,
    });
    setSearchQuery('');
    setSearchResults([]);
    setCurrentStep(3);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setRestaurant(prev => ({ ...prev, [name]: value }));
  };

  const handleAddType = async () => {
    if (newTypeName.trim()) {
      try {
        const newType = await createRestaurantType({ 
          name: newTypeName.trim(), 
          created_by: user.id,
          status: user.profile?.is_admin ? 'approved' : 'pending'
        });
        setTypes(prev => [...prev, newType]);
        setRestaurant(prev => ({ ...prev, type_id: newType.id }));
        setNewTypeName('');
        setIsAddingType(false);
      } catch (error) {
        console.error('Error adding type:', error);
        setError(`Failed to add type: ${error.message}`);
      }
    }
  };
  
  const handleAddCity = async () => {
    if (newCityName.trim()) {
      try {
        const newCity = await createCity({ 
          name: newCityName.trim(), 
          created_by: user.id,
          status: user.profile?.is_admin ? 'approved' : 'pending'
        });
        setCities(prev => [...prev, newCity]);
        setRestaurant(prev => ({ ...prev, city_id: newCity.id }));
        setNewCityName('');
        setIsAddingCity(false);
      } catch (error) {
        console.error('Error adding city:', error);
        setError(`Failed to add city: ${error.message}`);
      }
    }
  };

  const handleToTrySelection = async (isToTry) => {
    setToTry(isToTry);
    if (isToTry) {
      await handleSubmit(true);
    } else {
      setShowReviewForm(true);
      setCurrentStep(4);
    }
  };

  const validateStep = (step) => {
    switch (step) {
      case 2:
        return restaurant.name.trim() !== '' && restaurant.address.trim() !== '';
      case 3:
        return restaurant.city_id !== null && restaurant.type_id !== null;
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    } else {
      setError('Please fill in all required fields');
    }
  };

  const handleSubmit = async (isToTry = false) => {
    setError(null);
    setSuccessMessage('');
    try {
      let savedRestaurant;
      if (isEditing) {
        savedRestaurant = await updateRestaurant(id, restaurant);
        updateLocalRestaurant(savedRestaurant);
      } else {
        // Make sure to pass the user.id explicitly
        savedRestaurant = await createRestaurant({
          name: restaurant.name,
          type_id: restaurant.type_id,
          city_id: restaurant.city_id,
          price: restaurant.price,
          address: restaurant.address
        }, user.id, isToTry);
        
        addLocalRestaurant(savedRestaurant);
      }
  
      // Handle "To Try" case
      if (isToTry) {
        await addBookmark(user.id, savedRestaurant.id, 'to_try');
        setSuccessMessage('Restaurant added to your "To Try" list.');
        setTimeout(() => navigate('/'), 2000);
      } 
      // Handle rating and note case
      else if (!toTry && rating > 0) {
        // Add the rating
        await addReview({
          user_id: user.id,
          restaurant_id: savedRestaurant.id,
          rating: rating
        });
  
        // Add the note if provided
        if (initialNote.trim()) {
          await supabase
            .from('notes')
            .insert({
              user_id: user.id,
              restaurant_id: savedRestaurant.id,
              note: initialNote.trim()
            });
        }
  
        setSuccessMessage('Restaurant and rating added successfully.');
        setTimeout(() => navigate('/'), 2000);
      }
      // Handle base case (no rating or to try)
      else {
        setSuccessMessage('Restaurant added successfully.');
        setTimeout(() => navigate('/'), 2000);
      }
  
    } catch (error) {
      console.error('Error saving restaurant:', error);
      setError(error.message);
    }
  };

  // Render helpers
  const renderStepIndicator = () => {
    const totalSteps = showReviewForm ? 4 : 3;
    const progress = (currentStep / totalSteps) * 100;
    
    return (
      <div className="mb-8 space-y-2">
        <Progress value={progress} />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Search</span>
          <span>Details</span>
          <span>Confirm</span>
          {showReviewForm && <span>Review</span>}
        </div>
      </div>
    );
  };

  // Step 1: Search or Start New
  if (currentStep === 1) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Add Restaurant</CardTitle>
          <CardDescription>Search for an existing restaurant or add a new one</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search restaurants..."
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>

          {searchLoading && (
            <div className="text-center text-sm text-muted-foreground">
              Searching...
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="border rounded-lg divide-y">
              {searchResults.map((result) => {
                const isInUserList = restaurants.some(r => r.id === result.id);
                
                return (
                  <div
                    key={result.id}
                    className="p-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                    onClick={() => {
                      if (isInUserList) {
                        navigate(`/restaurant/${result.id}`);
                      } else {
                        handleSelectRestaurant(result);
                      }
                    }}
                  >
                    <div>
                      <div className="font-medium">{result.name}</div>
                      <div className="text-sm text-muted-foreground">{result.address}</div>
                      {result.restaurant_types?.name && (
                        <Badge variant="secondary" className="mt-1">
                          {result.restaurant_types.name}
                        </Badge>
                      )}
                      {isInUserList && (
                        <Badge variant="outline" className="ml-2">Already in your list</Badge>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                );
              })}
            </div>
          )}

          {searchQuery.length > 2 && searchResults.length === 0 && !searchLoading && (
            <div className="text-center p-6 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-4">
                No restaurants found matching "{searchQuery}"
              </p>
              <Button onClick={handleAddNew}>
                <Plus className="mr-2 h-4 w-4" />
                Add as New Restaurant
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Main Form Steps
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit' : 'Add'} Restaurant</CardTitle>
        <CardDescription>
          {currentStep === 2 && 'Enter basic restaurant information'}
          {currentStep === 3 && 'Specify restaurant details'}
          {currentStep === 4 && 'Add your review'}
        </CardDescription>
        {renderStepIndicator()}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step 2: Basic Info */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Restaurant Name</Label>
              <Input
                id="name"
                name="name"
                value={restaurant.name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                value={restaurant.address}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Price Range</Label>
              <div className="flex space-x-2">
                {[1, 2, 3].map((value) => (
                  <Button
                    key={value}
                    type="button"
                    onClick={() => setRestaurant(prev => ({ ...prev, price: value }))}
                    variant={restaurant.price === value ? "default" : "outline"}
                    className="flex-1"
                  >
                    {'€'.repeat(value)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Location & Type */}
        {/* Step 3: Location & Type */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>City</Label>
              <div className="flex space-x-2">
                <Select
                  value={restaurant.city_id?.toString() || ''}
                  onValueChange={(value) => setRestaurant(prev => ({ ...prev, city_id: parseInt(value) }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city.id} value={city.id.toString()}>
                        {city.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="new">
                      <Button 
                        variant="ghost" 
                        className="w-full text-left p-0 h-auto font-normal"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsAddingCity(true);
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add new city
                      </Button>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex space-x-2">
                <Select
                  value={restaurant.type_id?.toString() || ''}
                  onValueChange={(value) => setRestaurant(prev => ({ ...prev, type_id: parseInt(value) }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="new">
                      <Button 
                        variant="ghost" 
                        className="w-full text-left p-0 h-auto font-normal"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsAddingType(true);
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add new type
                      </Button>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <div className="text-lg font-semibold">What would you like to do with this restaurant?</div>
              <div className="flex flex-col space-y-4">
              <Button
                  variant={toTry ? "default" : "outline"}
                  className="w-full justify-start h-auto py-4"
                  onClick={() => {
                    setToTry(true);
                  }}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">Add to "To Try" List</span>
                    <span className="text-sm text-muted-foreground">
                      Save this restaurant to try later
                    </span>
                  </div>
                </Button>

                <Button
                  variant={!toTry ? "default" : "outline"}
                  className="w-full justify-start h-auto py-4"
                  onClick={() => {
                    setToTry(false);
                  }}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">Add Review</span>
                    <span className="text-sm text-muted-foreground">
                      I've visited this restaurant and want to add a review
                    </span>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 4 && (
          <div className="space-y-6">
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
                <div className="w-16 text-right font-medium">
                  {rating === 10 ? '10' : rating.toFixed(1)}/10
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Add a Note (Optional)</Label>
              <Textarea
                value={initialNote}
                onChange={(e) => setInitialNote(e.target.value)}
                placeholder="Add a personal note about this restaurant..."
                rows={4}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 text-green-600 px-4 py-3 rounded-md text-sm">
            {successMessage}
          </div>
        )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => currentStep > 1 ? setCurrentStep(prev => prev - 1) : navigate('/')}
          >
            {currentStep > 1 ? 'Back' : 'Cancel'}
          </Button>
          
          {currentStep === 3 ? (
            <Button 
              onClick={() => {
                if (toTry) {
                  handleSubmit(true);
                } else {
                  setCurrentStep(4);
                }
              }}
            >
              {toTry ? 'Add Restaurant' : 'Next'}
            </Button>
          ) : currentStep < 4 ? (
            <Button onClick={handleNextStep}>Next</Button>
          ) : (
            <Button 
              onClick={() => handleSubmit(false)}
              disabled={!rating && !toTry}
            >
              Add Restaurant
            </Button>
          )}
        </CardFooter>

      {/* Dialogs */}
      <Dialog open={isAddingType} onOpenChange={setIsAddingType}>
        <DialogContent>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingType(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddType}>Add Type</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddingCity} onOpenChange={setIsAddingCity}>
        <DialogContent>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingCity(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCity}>Add City</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AddEditRestaurant;