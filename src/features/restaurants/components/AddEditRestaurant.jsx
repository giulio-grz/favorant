import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Plus, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
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

const AddEditRestaurant = ({ 
  user, 
  types, 
  cities, 
  restaurants, 
  addLocalRestaurant, 
  setTypes,
  setCities
}) => {
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
    address: '',
    postal_code: '',
    city_id: null,
    type_id: null,
    price: 1,
    website: ''
  });

  const [rating, setRating] = useState(5);
  const [error, setError] = useState(null);
  const [isToTry, setIsToTry] = useState(false);
  const [alert, setAlert] = useState({
    show: false,
    message: '',
    type: 'success'
  });
  
  const [isAddingCity, setIsAddingCity] = useState(false);
  const [isAddingType, setIsAddingType] = useState(false);
  const [newCityName, setNewCityName] = useState('');
  const [newTypeName, setNewTypeName] = useState('');

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

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
      if (!selected?.id) {
        console.error('No restaurant ID found:', selected);
        return;
      }
  
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
        navigate(`/user/${user.id}/restaurant/${selected.id}`);
        return;
      }
  
      setSelectedRestaurant(selected);
      setIsToTry(false);
      setShowReviewForm(false);
      setStep(3);
    } catch (error) {
      console.error('Error checking restaurant existence:', error);
    }
  };

  const handleAddNewCity = async () => {
    try {
      const newCity = await createCity({ 
        name: newCityName.trim(), 
        created_by: user.id,
        status: 'pending'
      });
  
      const updatedCity = {
        id: newCity.id,
        name: newCityName.trim(),
        status: 'pending'
      };
      
      setCities(prev => [...prev, updatedCity]);
      
      setRestaurant(prev => ({
        ...prev,
        city_id: updatedCity.id
      }));
  
      setNewCityName('');
      setIsAddingCity(false);
    } catch (error) {
      setError('Failed to add new city');
      console.error('Error adding new city:', error);
    }
  };

  const handleAddNewType = async () => {
    try {
      const newType = await createRestaurantType({ 
        name: newTypeName.trim(), 
        created_by: user.id,
        status: 'pending'
      });
  
      const updatedType = {
        id: newType.id,
        name: newTypeName.trim(),
        status: 'pending'
      };
      
      setTypes(prev => [...prev, updatedType]);
      
      setRestaurant(prev => ({
        ...prev,
        type_id: updatedType.id
      }));
  
      setNewTypeName('');
      setIsAddingType(false);
    } catch (error) {
      setError('Failed to add new type');
      console.error('Error adding new type:', error);
    }
  };
  
  const handleSubmit = async () => {
    try {
      setError(null);
  
      if (selectedRestaurant) {
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
      
      const restaurantData = {
        name: restaurant.name,
        address: restaurant.address,
        postal_code: restaurant.postal_code,
        city_id: restaurant.city_id,
        type_id: restaurant.type_id,
        price: restaurant.price,
        website: restaurant.website
      };
    
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

  const isFormValid = () => {
    if (step < 3) {
      return (
        restaurant.name && 
        restaurant.address && 
        restaurant.postal_code && 
        restaurant.city_id !== null && 
        restaurant.type_id !== null && 
        restaurant.price
      );
    }
    
    return isToTry || showReviewForm;
  };

  return (
    <div className="fixed inset-0 bg-background sm:p-6 flex items-center justify-center">
      <div className="w-full h-full bg-background sm:rounded-xl sm:border sm:shadow-sm sm:max-w-3xl flex flex-col">
        {/* Header - Not Scrollable */}
        <div className="shrink-0 border-b bg-background sm:rounded-t-xl">
          <div className="flex h-14 items-center justify-between px-2 sm:px-4">
            <span className="text-sm font-medium">
              Step {step} of {totalSteps}
            </span>
            <span className="text-sm text-muted-foreground">
              {step === 1 ? "Search" : step === 2 ? "Details" : "Add to List"}
            </span>
          </div>
          <Progress value={progress} className="h-1" />
        </div>
  
        {/* Main Content - Only This Part Scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4">
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
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        className="w-full p-4 text-left bg-card hover:bg-accent rounded-lg border transition-colors"
                        onClick={() => handleSelectRestaurant(result)}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <div className="font-medium">{result.name}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {result.address}
                            </div>
                            {result.restaurant_types?.name && (
                              <Badge variant="secondary" className="text-xs">
                                {result.restaurant_types.name}
                              </Badge>
                            )}
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground mt-1" />
                        </div>
                      </button>
                    ))}
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
  
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Restaurant Name</Label>
                  <Input
                    value={restaurant.name}
                    onChange={(e) => setRestaurant(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter restaurant name"
                    className="h-12"
                  />
                </div>
  
                <div className="space-y-2">
                  <Label>Street Address</Label>
                  <Input
                    value={restaurant.address || ''}
                    onChange={(e) => setRestaurant(prev => ({
                      ...prev,
                      address: e.target.value
                    }))}
                    placeholder="Enter street address"
                    className="h-12"
                  />
                </div>
  
                <div className="space-y-2">
                  <Label>Postal Code</Label>
                  <Input
                    value={restaurant.postal_code || ''}
                    onChange={(e) => setRestaurant(prev => ({
                      ...prev,
                      postal_code: e.target.value
                    }))}
                    placeholder="Enter postal code"
                    className="h-12"
                  />
                </div>
  
                <div className="space-y-2">
                  <Label>City</Label>
                  <Select
                    value={restaurant.city_id?.toString()}
                    onValueChange={(value) => {
                      if (value === 'new') {
                        setIsAddingCity(true);
                      } else {
                        setRestaurant(prev => ({
                          ...prev,
                          city_id: parseInt(value)
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
                        <Plus className="inline-block w-4 h-4 mr-2" />
                        Add new city
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
  
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={restaurant.type_id?.toString()}
                    onValueChange={(value) => {
                      if (value === 'new') {
                        setIsAddingType(true);
                      } else {
                        setRestaurant(prev => ({
                          ...prev,
                          type_id: parseInt(value)
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
                        <Plus className="inline-block w-4 h-4 mr-2" />
                        Add new type
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
  
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
  
                <div className="space-y-2">
                  <Label>Price Range</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((value) => (
                      <Button
                        key={value}
                        variant={restaurant.price === value ? "default" : "outline"}
                        onClick={() => setRestaurant(prev => ({ ...prev, price: value }))}
                        className="h-12"
                      >
                        {'€'.repeat(value)}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
  
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
                        Add review to this restaurant
                      </span>
                    </div>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
  
        {/* Footer - Not Scrollable */}
        <div className="shrink-0 border-t bg-background p-2 sm:p-4 sm:rounded-b-xl">
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReviewForm(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={rating === 0}
              >
                Add Review
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
  
        {error && (
          <div className="fixed bottom-4 left-4 right-4 mx-auto max-w-3xl bg-destructive/15 text-destructive p-4 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddEditRestaurant;