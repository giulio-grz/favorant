import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  supabase, 
  getAllEntities, 
  approveRestaurant, 
  updateRestaurant, 
  deleteRestaurant, 
  approveCity, 
  approveType, 
  updateCity, 
  deleteCity, 
  updateType, 
  deleteType, 
  createCity, 
  createRestaurantType,
  executeWithRetry,
} from '@/supabaseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Edit,
  Plus,
  MoreHorizontal,
  Check,
  Trash,
  MapPin,
  ArrowLeft
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import LoadingSpinner from '@/components/LoadingSpinner';
import { ScrollArea } from "@/components/ui/scroll-area";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [cities, setCities] = useState([]);
  const [types, setTypes] = useState([]);
  const [countries, setCountries] = useState([]); // New state for countries
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  const [editingCity, setEditingCity] = useState(null);
  const [editingType, setEditingType] = useState(null);
  const [editingCountry, setEditingCountry] = useState(null); // New state for editing country
  const [deletingRestaurant, setDeletingRestaurant] = useState(null);
  const [deletingCity, setDeletingCity] = useState(null);
  const [deletingType, setDeletingType] = useState(null);
  const [deletingCountry, setDeletingCountry] = useState(null); // New state for deleting country
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'info' });
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [newTypeName, setNewTypeName] = useState('');
  const [newCityName, setNewCityName] = useState('');
  const [isAddingType, setIsAddingType] = useState(false);
  const [isAddingCity, setIsAddingCity] = useState(false);
  const [geocodingDetails, setGeocodingDetails] = useState({
    address: '',
    cap: '',
    city: ''
  });

  const [loadingStates, setLoadingStates] = useState({
    adminCheck: true,
    entities: false,
    geocoding: false,
    action: false
  });

  const [selectedCountry, setSelectedCountry] = useState(null);

  const setLoadingState = (key, value) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  };

  const checkAdminStatus = async () => {
    try {
      setLoadingState('adminCheck', true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error("Error fetching admin status:", error);
          setAlert({ show: true, message: "Failed to verify admin status.", type: "error" });
          return false;
        } else {
          setIsAdmin(profile.is_admin);
          return profile.is_admin;
        }
      }
      return false;
    } catch (error) {
      console.error("Error checking admin status:", error);
      return false;
    } finally {
      setLoadingState('adminCheck', false);
    }
  };

  const fetchAllEntities = async () => {
    try {
      setLoadingState('entities', true);
      const { restaurants, cities, types, countries } = await getAllEntities();
      if (!countries || countries.length === 0) {
        console.warn('No countries loaded from the database');
      }
      setRestaurants(restaurants || []);
      setCities(cities || []);
      setTypes(types || []);
      setCountries(countries || []);
    } catch (error) {
      console.error('Error fetching entities:', error);
      setAlert({ 
        show: true, 
        message: "Failed to fetch data. Please try again.", 
        type: "error" 
      });
    } finally {
      setLoadingState('entities', false);
    }
  };

  const handleRecalculateCoordinates = async () => {
    try {
      if (!editingRestaurant?.address || !editingRestaurant?.city_id) {
        setAlert({
          show: true,
          message: 'Address and city are required for geocoding',
          type: 'error'
        });
        return;
      }
  
      const cityData = cities.find(c => c.id === editingRestaurant.city_id);
      if (!cityData) {
        setAlert({
          show: true,
          message: 'Please select a valid city',
          type: 'error'
        });
        return;
      }
  
      // Get country code
      const country = countries.find(c => c.id === cityData.country_id);
      console.log('Found country:', country);
  
      // Try different search query formats in order of specificity
      const searchQueries = [
        // Full address
        [
          editingRestaurant.address,
          editingRestaurant.postal_code,
          cityData.name,
          country?.name
        ].filter(Boolean).join(', '),
        
        // Without postal code
        [
          editingRestaurant.address,
          cityData.name,
          country?.name
        ].filter(Boolean).join(', '),
        
        // Just city and street
        [
          editingRestaurant.address,
          cityData.name
        ].filter(Boolean).join(', '),
        
        // Just the address components
        editingRestaurant.address.split(',').map(part => 
          part.trim() + ', ' + cityData.name + ', ' + country?.name
        )
      ];
  
      let foundLocation = null;
  
      for (const query of searchQueries) {
        // If it's an array (from the split address), try each part
        if (Array.isArray(query)) {
          for (const subQuery of query) {
            console.log('Trying address part:', subQuery);
            const result = await tryGeocode(subQuery, country?.code);
            if (result) {
              foundLocation = result;
              break;
            }
          }
        } else {
          console.log('Trying query:', query);
          const result = await tryGeocode(query, country?.code);
          if (result) {
            foundLocation = result;
            break;
          }
        }
  
        if (foundLocation) break;
      }
  
      if (!foundLocation) {
        throw new Error('Unable to find location. Please check the address and try again.');
      }
  
      setEditingRestaurant(prev => ({
        ...prev,
        latitude: parseFloat(foundLocation.lat),
        longitude: parseFloat(foundLocation.lon)
      }));
  
      const messageElement = document.getElementById('coordinates-message');
      if (messageElement) {
        messageElement.textContent = 'Coordinates updated successfully';
        messageElement.className = 'text-sm text-emerald-600 mt-2';
        setTimeout(() => {
          messageElement.textContent = '';
        }, 3000);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setAlert({
        show: true,
        message: error.message || 'Failed to geocode address',
        type: 'error'
      });
    }
  };
  
  // Helper function to try geocoding with a query
  const tryGeocode = async (query, countryCode) => {
    const baseUrl = 'https://nominatim.openstreetmap.org/search';
    const urls = [
      // Try with country code first
      countryCode ? 
        `${baseUrl}?format=json&q=${encodeURIComponent(query)}&countrycodes=${countryCode.toLowerCase()}&limit=1` :
        null,
      // Then try without country code
      `${baseUrl}?format=json&q=${encodeURIComponent(query)}&limit=1`
    ].filter(Boolean);
  
    for (const url of urls) {
      console.log('Trying URL:', url);
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'RestaurantApp/1.0'
        }
      });
  
      if (!response.ok) {
        console.log('Request failed:', response.status);
        continue;
      }
  
      const data = await response.json();
      console.log('Response:', data);
  
      if (data && data.length > 0) {
        return data[0];
      }
    }
  
    return null;
  };

  useEffect(() => {
    let mounted = true;
  
    const initialize = async () => {
      const isAdminUser = await checkAdminStatus();
      if (mounted && isAdminUser) {
        await fetchAllEntities();
      }
    };
  
    initialize();
  
    return () => {
      mounted = false;
      // Clear all editing states
      setEditingCity(null);
      setEditingType(null);
      setEditingCountry(null);
      setEditingRestaurant(null);
      setDeletingCity(null);
      setDeletingType(null);
      setDeletingCountry(null);
      setDeletingRestaurant(null);
      setSelectedCountry(null);
      
      // Clean up any stuck dialogs
      document.querySelectorAll('[role="dialog"]').forEach(dialog => {
        dialog.remove();
      });
      document.querySelectorAll('[role="alertdialog"]').forEach(dialog => {
        dialog.remove();
      });
      document.querySelectorAll('[data-radix-portal]').forEach(portal => {
        portal.remove();
      });
    };
  }, []);

  const handleApprove = async (id, type) => {
    try {
      setLoadingState('action', true);
      
      if (type === 'restaurant') {
        await approveRestaurant(id);
      } else if (type === 'city') {
        await approveCity(id);
      } else if (type === 'type') {
        await approveType(id);
      } else if (type === 'country') {
        const { error } = await supabase
          .from('countries')
          .update({ status: 'approved' })
          .eq('id', id);
        if (error) throw error;
      }
  
      await fetchAllEntities();
      setAlert({ 
        show: true, 
        message: `${type} approved successfully.`, 
        type: "success" 
      });
    } catch (error) {
      console.error(`Error approving ${type}:`, error);
      setAlert({ 
        show: true, 
        message: `Failed to approve ${type}. Please try again.`, 
        type: "error" 
      });
    } finally {
      setLoadingState('action', false);
    }
  };

  const handleEdit = (entity, type) => {
    if (type === 'restaurant') {
      setEditingRestaurant(entity);
    } else if (type === 'city') {
      const country = countries.find(c => c.id === entity.country_id);
      setSelectedCountry(country || null);
      setEditingCity(entity);
    } else if (type === 'type') {
      setEditingType(entity);
    } else if (type === 'country') {
      setEditingCountry(entity);
    }
  };

  const handleSaveEdit = async (type) => {
    try {
      setLoadingState('action', true);
      if (type === 'restaurant') {
        const updateData = {
          id: editingRestaurant.id,
          name: editingRestaurant.name,
          address: editingRestaurant.address,
          postal_code: editingRestaurant.postal_code,
          city_id: editingRestaurant.city_id,
          type_id: editingRestaurant.type_id,
          price: editingRestaurant.price,
          latitude: editingRestaurant.latitude,
          longitude: editingRestaurant.longitude,
          website: editingRestaurant.website
        };    
        await updateRestaurant(editingRestaurant.id, updateData);
        setEditingRestaurant(null);
      } else if (type === 'city') {
        await updateCity(editingCity.id, {
          name: editingCity.name,
          country_id: editingCity.country_id
        });
        setEditingCity(null);
        setSelectedCountry(null);
      } else if (type === 'type') {
        await updateType(editingType.id, editingType);
        setEditingType(null);
      } else if (type === 'country') {
        const { error } = await supabase
          .from('countries')
          .update({ 
            name: editingCountry.name,
            code: editingCountry.code.toUpperCase()
          })
          .eq('id', editingCountry.id);
        if (error) throw error;
        setEditingCountry(null);
      }
  
      await fetchAllEntities();
      setAlert({
        show: true,
        message: `${type} updated successfully`,
        type: 'success'
      });
  
    } catch (error) {
      console.error(`Error updating ${type}:`, error);
      setAlert({
        show: true,
        message: `Failed to update ${type}: ${error.message}`,
        type: 'error'
      });
    } finally {
      setLoadingState('action', false);
    }
  };

  const handleDelete = async (type) => {
    try {
      setLoadingState('action', true);
      if (type === 'restaurant') {
        await deleteRestaurant(deletingRestaurant.id, currentUser.id);
        setDeletingRestaurant(null);
      } else if (type === 'city') {
        await deleteCity(deletingCity.id);
        setDeletingCity(null);
      } else if (type === 'type') {
        await deleteType(deletingType.id);
        setDeletingType(null);
      } else if (type === 'country') {
        const { error } = await supabase
          .from('countries')
          .delete()
          .eq('id', deletingCountry.id);
        if (error) throw error;
        setDeletingCountry(null);
      }
  
      await fetchAllEntities();
      setAlert({ 
        show: true, 
        message: `${type} deleted successfully.`, 
        type: "success" 
      });
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      setAlert({ 
        show: true, 
        message: `Failed to delete ${type}. Please try again.`, 
        type: "error" 
      });
    } finally {
      setLoadingState('action', false);
    }
  };

  const handleAddNewType = async () => {
    try {
      setLoadingState('action', true);
      const newType = await createRestaurantType({ 
        name: newTypeName, 
        created_by: currentUser.id,
        status: 'approved'
      });
      setTypes(prevTypes => [...prevTypes, newType]);
      setNewTypeName('');
      setIsAddingType(false);
      setEditingRestaurant(prev => ({ ...prev, type_id: newType.id }));
      setAlert({ show: true, message: 'New type added successfully', type: 'success' });
    } catch (error) {
      console.error('Error adding new type:', error);
      setAlert({ show: true, message: `Failed to add new type: ${error.message}`, type: 'error' });
    } finally {
      setLoadingState('action', false);
    }
  };

  const handleAddNewCity = async () => {
    try {
      setLoadingState('action', true);
      const newCity = await createCity({ 
        name: newCityName, 
        created_by: currentUser.id,
        status: 'approved'
      });
      setCities(prevCities => [...prevCities, newCity]);
      setNewCityName('');
      setIsAddingCity(false);
      setEditingRestaurant(prev => ({ ...prev, city_id: newCity.id }));
      setAlert({ show: true, message: 'New city added successfully', type: 'success' });
    } catch (error) {
      console.error('Error adding new city:', error);
      setAlert({ show: true, message: `Failed to add new city: ${error.message}`, type: 'error' });
    } finally {
      setLoadingState('action', false);
    }
  };

  const filteredEntities = (entities) => {
    if (Array.isArray(entities)) {
      return entities.filter(entity => 
        (filters.status === 'all' || filters.status === '' || entity.status === filters.status) &&
        (filters.search === '' || entity.name.toLowerCase().includes(filters.search.toLowerCase()))
      );
    } else if (entities === cities) {
      // Special handling for cities since they're displayed in groups
      return cities.filter(city => 
        (filters.status === 'all' || filters.status === '' || city.status === filters.status) &&
        (filters.search === '' || city.name.toLowerCase().includes(filters.search.toLowerCase()))
      );
    }
    return [];
  };

  // Show loading spinner only during initial load
  if (loadingStates.adminCheck) {
    return <LoadingSpinner />;
  }

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
        <p className="text-gray-600">You do not have admin privileges.</p>
        <Button 
          onClick={() => navigate('/')} 
          className="mt-4"
          variant="outline"
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      
      <AlertDialog open={alert.show} onOpenChange={() => setAlert({ ...alert, show: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {alert.type === 'success' ? 'Success' : 'Error'}
            </AlertDialogTitle>
            <AlertDialogDescription>{alert.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlert({ ...alert, show: false })}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
  
      <Tabs defaultValue="restaurants">
        <TabsList>
          <TabsTrigger value="restaurants">Restaurants</TabsTrigger>
          <TabsTrigger value="cities">Cities</TabsTrigger>
          <TabsTrigger value="types">Types</TabsTrigger>
          <TabsTrigger value="countries">Countries</TabsTrigger>
        </TabsList>

        <div className="flex space-x-2 my-4">
          <Input
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="max-w-sm"
          />
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
          >
            <SelectTrigger className="w-[180px] h-10">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="restaurants">
          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Name</TableHead>
                  <TableHead className="whitespace-nowrap">Address</TableHead>
                  <TableHead className="whitespace-nowrap">Postal Code</TableHead>
                  <TableHead className="whitespace-nowrap">City</TableHead>
                  <TableHead className="whitespace-nowrap">Website</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntities(restaurants).map((restaurant) => (
                  <TableRow key={restaurant.id}>
                    <TableCell className="whitespace-nowrap">
                      {restaurant.name}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{restaurant.address}</TableCell>
                    <TableCell className="whitespace-nowrap">{restaurant.postal_code}</TableCell>
                    <TableCell className="whitespace-nowrap">{restaurant.cities?.name}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {restaurant.website ? (
                        <a 
                          href={restaurant.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {restaurant.website}
                        </a>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge 
                        className={
                          restaurant.status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' 
                            : restaurant.status === 'approved' 
                            ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                            : ''
                        }
                      >
                        {restaurant.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {restaurant.status === 'pending' && (
                            <DropdownMenuItem onClick={() => handleApprove(restaurant.id, 'restaurant')}>
                              <Check className="mr-2 h-4 w-4" /> Approve
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleEdit(restaurant, 'restaurant')}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeletingRestaurant(restaurant)} className="text-red-600">
                            <Trash className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="cities">
          {/* Show cities without country first */}
          {filteredEntities(cities).filter(city => !city.country_id).length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  No Country Assigned
                  <Badge variant="secondary" className="ml-2">
                    {filteredEntities(cities).filter(city => !city.country_id).length} cities
                  </Badge>
                </h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntities(cities)
                    .filter(city => !city.country_id)
                    .map((city) => (
                    <TableRow key={city.id}>
                      <TableCell>{city.name}</TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            city.status === 'pending' 
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' 
                              : city.status === 'approved' 
                              ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                              : ''
                          }
                        >
                          {city.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {city.status === 'pending' && (
                              <DropdownMenuItem onClick={() => handleApprove(city.id, 'city')}>
                                <Check className="mr-2 h-4 w-4" /> Approve
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleEdit(city, 'city')}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeletingCity(city)} className="text-red-600">
                              <Trash className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Then show cities grouped by country */}
          {countries.map(country => {
            const countryCities = filteredEntities(cities).filter(city => city.country_id === country.id);
            if (countryCities.length === 0) return null;

            return (
              <div key={country.id} className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    {country.name}
                    <span className="text-muted-foreground">({country.code})</span>
                    <Badge variant="secondary" className="ml-2">
                      {countryCities.length} cities
                    </Badge>
                  </h3>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Name</TableHead>
                      <TableHead className="w-[40%]">Status</TableHead>
                      <TableHead className="w-[20%] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {countryCities.map((city) => (
                      <TableRow key={city.id}>
                        <TableCell className="font-medium">{city.name}</TableCell>
                        <TableCell>
                          <Badge 
                            className={
                              city.status === 'pending' 
                                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' 
                                : city.status === 'approved' 
                                ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                                : ''
                            }
                          >
                            {city.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {city.status === 'pending' && (
                                <DropdownMenuItem onClick={() => handleApprove(city.id, 'city')}>
                                  <Check className="mr-2 h-4 w-4" /> Approve
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleEdit(city, 'city')}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeletingCity(city)} className="text-red-600">
                                <Trash className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="types">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntities(types).map((type) => (
                <TableRow key={type.id}>
                  <TableCell>{type.name}</TableCell>
                  <TableCell>
                    <Badge 
                      className={
                        type.status === 'pending' 
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' 
                          : type.status === 'approved' 
                          ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                          : ''
                      }
                    >
                      {type.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {type.status === 'pending' && (
                          <DropdownMenuItem onClick={() => handleApprove(type.id, 'type')}>
                            <Check className="mr-2 h-4 w-4" /> Approve
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleEdit(type, 'type')}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeletingType(type)} className="text-red-600">
                          <Trash className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="countries">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Cities</TableHead>  
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntities(countries).map((country) => (
                <TableRow key={country.id}>
                  <TableCell>{country.name}</TableCell>
                  <TableCell>{country.code}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {cities.filter(city => city.country_id === country.id).length} cities
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className={
                        country.status === 'pending' 
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' 
                          : country.status === 'approved' 
                          ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                          : ''
                      }
                    >
                      {country.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {country.status === 'pending' && (
                          <DropdownMenuItem onClick={() => handleApprove(country.id, 'country')}>
                            <Check className="mr-2 h-4 w-4" /> Approve
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleEdit(country, 'country')}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeletingCountry(country)} className="text-red-600">
                          <Trash className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* Restaurant Edit Dialog */}
      {editingRestaurant && (
        <div className="fixed inset-0 bg-background z-50 overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-background">
              <Button
                variant="ghost"
                onClick={() => setEditingRestaurant(null)}
                className="p-0 hover:bg-transparent"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <h2 className="text-lg font-semibold">Edit Restaurant</h2>
              <div className="w-[52px]"></div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2 sm:py-4">
              <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <Label>Restaurant Name</Label>
                  <Input
                    value={editingRestaurant?.name || ''}
                    onChange={(e) => setEditingRestaurant({...editingRestaurant, name: e.target.value})}
                    placeholder="Restaurant Name"
                    className="h-10 sm:h-12"
                  />
                </div>

                <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
                  <div className="space-y-2">
                    <Label>Street Address</Label>
                    <Input
                      value={editingRestaurant?.address || ''}
                      onChange={(e) => setEditingRestaurant({...editingRestaurant, address: e.target.value})}
                      placeholder="Address"
                      className="h-10 sm:h-12"
                      />
                      </div>
    
                      <div className="space-y-2">
                        <Label>Postal Code</Label>
                        <Input
                          value={editingRestaurant?.postal_code || ''}
                          onChange={(e) => setEditingRestaurant({
                            ...editingRestaurant, 
                            postal_code: e.target.value
                          })}
                          placeholder="Postal Code"
                          className="h-10 sm:h-12"
                        />
                      </div>
                    </div>
    
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Select
                        value={editingRestaurant?.city_id?.toString()}
                        onValueChange={(value) => {
                          if (value === 'new') {
                            setIsAddingCity(true);
                          } else {
                            setEditingRestaurant({...editingRestaurant, city_id: parseInt(value)});
                          }
                        }}
                      >
                        <SelectTrigger className="h-10 sm:h-12">
                          <SelectValue placeholder="Select City" />
                        </SelectTrigger>
                        <SelectContent>
                          {cities.map(city => (
                            <SelectItem key={city.id} value={city.id.toString()}>
                              {city.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="new" className="text-primary">
                            <div className="flex items-center">
                              <Plus className="h-4 w-4 mr-2" />
                              Add new city
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
    
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={editingRestaurant?.type_id?.toString()}
                        onValueChange={(value) => {
                          if (value === 'new') {
                            setIsAddingType(true);
                          } else {
                            setEditingRestaurant({...editingRestaurant, type_id: parseInt(value)});
                          }
                        }}
                      >
                        <SelectTrigger className="h-10 sm:h-12">
                          <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {types.map(type => (
                            <SelectItem key={type.id} value={type.id.toString()}>
                              {type.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="new" className="text-primary">
                            <div className="flex items-center">
                              <Plus className="h-4 w-4 mr-2" />
                              Add new type
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
    
                    <div className="space-y-2">
                      <Label>Website</Label>
                      <Input
                        type="url"
                        value={editingRestaurant?.website || ''}
                        onChange={(e) => setEditingRestaurant({
                          ...editingRestaurant,
                          website: e.target.value
                        })}
                        placeholder="https://example.com"
                        className="h-10 sm:h-12"
                      />
                    </div>
    
                    <div className="space-y-2">
                      <Label>Location Coordinates</Label>
                      {editingRestaurant?.latitude && editingRestaurant?.longitude && (
                        <p className="text-sm text-muted-foreground">
                          Current: {editingRestaurant.latitude}, {editingRestaurant.longitude}
                        </p>
                      )}
                      <Button
                        variant="outline"
                        className="w-full h-10 sm:h-12"
                        onClick={handleRecalculateCoordinates}
                      >
                        <MapPin className="mr-2 h-4 w-4" />
                        Recalculate Coordinates
                      </Button>
                      <div id="coordinates-message"></div>
                    </div>
    
                    <div className="space-y-2">
                      <Label>Price</Label>
                      <Select
                        value={editingRestaurant?.price?.toString()}
                        onValueChange={(value) => setEditingRestaurant({...editingRestaurant, price: parseInt(value)})}
                      >
                        <SelectTrigger className="h-10 sm:h-12">
                          <SelectValue placeholder="€" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">€</SelectItem>
                          <SelectItem value="2">€€</SelectItem>
                          <SelectItem value="3">€€€</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
    
                <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t bg-background">
                  <div className="max-w-2xl mx-auto">
                    <Button 
                      onClick={() => handleSaveEdit('restaurant')}
                      className="w-full h-10 sm:h-12"
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
    
          {/* City Edit Screen */}
          {editingCity && (
            <div className="fixed inset-0 bg-background z-50 overflow-hidden">
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-background">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditingCity(null);
                      setSelectedCountry(null);
                    }}
                    className="p-0 hover:bg-transparent"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <h2 className="text-lg font-semibold">Edit City</h2>
                  <div className="w-[52px]"></div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-2 sm:py-4">
                  <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
                    <div className="space-y-2">
                      <Label>City Name</Label>
                      <Input
                        value={editingCity?.name || ''}
                        onChange={(e) => setEditingCity({...editingCity, name: e.target.value})}
                        placeholder="City Name"
                        className="h-10 sm:h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Country</Label>
                      {countries.length > 0 ? (
                        <Select
                          value={selectedCountry?.id?.toString() || ''}
                          onValueChange={(value) => {
                            const country = countries.find(c => c.id.toString() === value);
                            setSelectedCountry(country);
                            setEditingCity(prev => ({
                              ...prev,
                              country_id: parseInt(value)
                            }));
                          }}
                        >
                          <SelectTrigger className="h-10 sm:h-12">
                            <SelectValue placeholder="Select Country" />
                          </SelectTrigger>
                          <SelectContent>
                            {countries.map(country => (
                              <SelectItem key={country.id} value={country.id.toString()}>
                                {country.name} ({country.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          No countries available. Please add countries first.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t bg-background">
                  <div className="max-w-2xl mx-auto">
                    <Button 
                      onClick={() => handleSaveEdit('city')}
                      className="w-full h-10 sm:h-12"
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
    
          {/* Type Edit Screen */}
          {editingType && (
            <div className="fixed inset-0 bg-background z-50 overflow-hidden">
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-background">
                  <Button
                    variant="ghost"
                    onClick={() => setEditingType(null)}
                    className="p-0 hover:bg-transparent"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <h2 className="text-lg font-semibold">Edit Type</h2>
                  <div className="w-[52px]"></div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-2 sm:py-4">
                  <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
                    <div className="space-y-2">
                      <Label>Type Name</Label>
                      <Input
                        value={editingType?.name || ''}
                        onChange={(e) => setEditingType({...editingType, name: e.target.value})}
                        placeholder="Type Name"
                        className="h-10 sm:h-12"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t bg-background">
                  <div className="max-w-2xl mx-auto">
                    <Button 
                      onClick={() => handleSaveEdit('type')}
                      className="w-full h-10 sm:h-12"
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
    
          {/* Country Edit/Add Screen */}
          {editingCountry && (
            <div className="fixed inset-0 bg-background z-50 overflow-hidden">
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-background">
                  <Button
                    variant="ghost"
                    onClick={() => setEditingCountry(null)}
                    className="p-0 hover:bg-transparent"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <h2 className="text-lg font-semibold">
                    {editingCountry.id ? 'Edit Country' : 'Add New Country'}
                  </h2>
                  <div className="w-[52px]"></div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-2 sm:py-4">
                  <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
                    <div className="space-y-2">
                      <Label>Country Name</Label>
                      <Input
                        value={editingCountry?.name || ''}
                        onChange={(e) => setEditingCountry(prev => ({
                          ...prev,
                          name: e.target.value
                        }))}
                        placeholder="e.g., Italy"
                        className="h-10 sm:h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Country Code (ISO)</Label>
                      <Input
                        value={editingCountry?.code || ''}
                        onChange={(e) => setEditingCountry(prev => ({
                          ...prev,
                          code: e.target.value.toUpperCase()
                        }))}
                        placeholder="e.g., IT"
                        maxLength={2}
                        className="uppercase h-10 sm:h-12"
                      />
                      <p className="text-sm text-muted-foreground">
                        Common codes: IT (Italy), FR (France), UK (United Kingdom), ES (Spain), DE (Germany)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t bg-background">
                  <div className="max-w-2xl mx-auto">
                    <Button 
                      onClick={async () => {
                        try {
                          if (!editingCountry.name || !editingCountry.code) {
                            setAlert({
                              show: true,
                              message: 'Country name and code are required',
                              type: 'error'
                            });
                            return;
                          }

                          if (editingCountry.code.length !== 2) {
                            setAlert({
                              show: true,
                              message: 'Country code must be exactly 2 characters',
                              type: 'error'
                            });
                            return;
                          }

                          if (!editingCountry.id) {
                            const { error } = await supabase
                              .from('countries')
                              .insert([{
                                name: editingCountry.name.trim(),
                                code: editingCountry.code.toUpperCase(),
                                status: 'approved',
                                created_by: currentUser.id
                              }]);

                            if (error) throw error;
                          } else {
                            await handleSaveEdit('country');
                          }

                          await fetchAllEntities();
                          setEditingCountry(null);
                          setAlert({
                            show: true,
                            message: `Country ${editingCountry.id ? 'updated' : 'added'} successfully`,
                            type: 'success'
                          });
                        } catch (error) {
                          console.error('Error saving country:', error);
                          setAlert({
                            show: true,
                            message: `Failed to ${editingCountry.id ? 'update' : 'add'} country: ${error.message}`,
                            type: 'error'
                          });
                        }
                      }}
                      className="w-full h-10 sm:h-12"
                    >
                      {editingCountry.id ? 'Save Changes' : 'Add Country'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
    
          {/* Add New City Dialog */}
          <Dialog open={isAddingCity} onOpenChange={setIsAddingCity}>
            <DialogContent className="bg-background p-0 max-h-[90vh] w-full max-w-lg">
              <DialogHeader className="px-6 py-4 border-b">
                <DialogTitle>Add New City</DialogTitle>
              </DialogHeader>
              <div className="px-6 py-4 h-full overflow-y-auto">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>City Name</Label>
                    <Input
                      value={newCityName}
                      onChange={(e) => setNewCityName(e.target.value)}
                      placeholder="Enter city name"
                      className="mt-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    {countries.length > 0 ? (
                      <Select
                        value={selectedCountry?.id?.toString() || ''}
                        onValueChange={(value) => {
                          const country = countries.find(c => c.id.toString() === value);
                          setSelectedCountry(country);
                          setEditingCity(prev => ({
                            ...prev,
                            country_id: parseInt(value)
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Country" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map(country => (
                            <SelectItem key={country.id} value={country.id.toString()}>
                              {country.name} ({country.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No countries available. Please add countries first.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter className="px-6 py-4 border-t">
                <div className="flex justify-end gap-4">
                  <Button variant="outline" onClick={() => setIsAddingCity(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddNewCity}
                    disabled={!newCityName.trim()}
                  >
                    Add City
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
    
          {/* Add New Type Dialog */}
          <Dialog open={isAddingType} onOpenChange={setIsAddingType}>
            <DialogContent className="bg-background p-0 max-h-[90vh] w-full max-w-lg">
              <DialogHeader className="px-6 py-4 border-b">
                <DialogTitle>Add New Type</DialogTitle>
              </DialogHeader>
              <div className="px-6 py-4 h-full overflow-y-auto">
                <div className="space-y-4">
                  <Label>Type Name</Label>
                  <Input
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="Enter type name"
                    className="mt-2"
                  />
                </div>
              </div>
              <DialogFooter className="px-6 py-4 border-t">
                <div className="flex justify-end gap-4">
                  <Button variant="outline" onClick={() => setIsAddingType(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddNewType}
                    disabled={!newTypeName.trim()}
                  >
                    Add Type
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
    
          {/* Delete Restaurant Dialog */}
          <AlertDialog open={deletingRestaurant !== null} onOpenChange={() => setDeletingRestaurant(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Restaurant</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {deletingRestaurant?.name}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingRestaurant(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDelete('restaurant')}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
    
          {/* Delete City Dialog */}
          <AlertDialog open={deletingCity !== null} onOpenChange={() => setDeletingCity(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete City</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {deletingCity?.name}? This may affect associated restaurants.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingCity(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDelete('city')}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
    
          {/* Delete Type Dialog */}
          <AlertDialog open={deletingType !== null} onOpenChange={() => setDeletingType(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Type</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {deletingType?.name}? This may affect associated restaurants.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingType(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDelete('type')}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
    
          {/* Delete Country Dialog */}
          <AlertDialog open={deletingCountry !== null} onOpenChange={() => setDeletingCountry(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Country</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {deletingCountry?.name}? This will affect all cities and restaurants associated with this country.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingCountry(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => handleDelete('country')}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    };
    
    export default AdminDashboard;