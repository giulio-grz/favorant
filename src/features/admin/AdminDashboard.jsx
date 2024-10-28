import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, getAllEntities, approveRestaurant, updateRestaurant, deleteRestaurant, approveCity, approveType, updateCity, deleteCity, updateType, deleteType, createCity, createRestaurantType } from '@/supabaseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash, MoreHorizontal, Check, Plus, MapPin } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { executeWithRetry } from '@/supabaseClient';
import { Label } from "@/components/ui/label";
import LoadingSpinner from '@/components/LoadingSpinner';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [cities, setCities] = useState([]);
  const [types, setTypes] = useState([]);
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  const [editingCity, setEditingCity] = useState(null);
  const [editingType, setEditingType] = useState(null);
  const [deletingRestaurant, setDeletingRestaurant] = useState(null);
  const [deletingCity, setDeletingCity] = useState(null);
  const [deletingType, setDeletingType] = useState(null);
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

  const [coordinatesUpdated, setCoordinatesUpdated] = useState(false);

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
      const { restaurants, cities, types } = await getAllEntities();
      setRestaurants(restaurants || []);
      setCities(cities || []);
      setTypes(types || []);
    } catch (error) {
      console.error('Error fetching entities:', error);
      setAlert({ show: true, message: "Failed to fetch data. Please try again.", type: "error" });
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
  
      const city = cities.find(c => c.id === editingRestaurant.city_id)?.name;
      if (!city) {
        setAlert({
          show: true,
          message: 'Please select a valid city',
          type: 'error'
        });
        return;
      }
  
      const searchQuery = [
        editingRestaurant.address,
        geocodingDetails.cap,
        city
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
        setEditingRestaurant(prev => ({
          ...prev,
          latitude: parseFloat(lat),
          longitude: parseFloat(lon)
        }));
  
        setCoordinatesUpdated(true);
        setTimeout(() => setCoordinatesUpdated(false), 3000); // Hide after 3 seconds
      } else {
        throw new Error('Location not found');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setAlert({
        show: true,
        message: 'Failed to geocode address',
        type: 'error'
      });
    }
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
    };
  }, []);

  const handleApprove = async (id, type) => {
    try {
      setLoadingState('action', true);
      if (type === 'restaurant') {
        // Get restaurant details first
        const { data: restaurant } = await supabase
          .from('restaurants')
          .select(`
            id,
            address,
            cities (
              name
            )
          `)
          .eq('id', id)
          .single();
  
        if (restaurant && restaurant.address && restaurant.cities?.name) {
          // Geocode the address
          const searchQuery = `${restaurant.address}, ${restaurant.cities.name}`;
          
          const response = await executeWithRetry(async () => {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
              {
                headers: {
                  'Accept': 'application/json',
                  'User-Agent': 'RestaurantApp/1.0'
                }
              }
            );
            
            if (!res.ok) {
              throw new Error('Geocoding failed');
            }
            
            return res.json();
          });
  
          if (response && response.length > 0) {
            const { lat, lon } = response[0];
            
            // Update restaurant with coordinates and status
            await supabase
              .from('restaurants')
              .update({
                latitude: parseFloat(lat),
                longitude: parseFloat(lon),
                status: 'approved'
              })
              .eq('id', id);
          } else {
            // If geocoding fails, still approve but without coordinates
            await approveRestaurant(id);
          }
        } else {
          // If no address/city, just approve without coordinates
          await approveRestaurant(id);
        }
      } else if (type === 'city') {
        await approveCity(id);
      } else if (type === 'type') {
        await approveType(id);
      }
      
      await fetchAllEntities();
      setAlert({ show: true, message: `${type} approved successfully.`, type: "success" });
    } catch (error) {
      console.error(`Error approving ${type}:`, error);
      setAlert({ show: true, message: `Failed to approve ${type}. Please try again.`, type: "error" });
    } finally {
      setLoadingState('action', false);
    }
  };

  const handleEdit = (entity, type) => {
    if (type === 'restaurant') {
      setEditingRestaurant(entity);
    } else if (type === 'city') {
      setEditingCity(entity);
    } else if (type === 'type') {
      setEditingType(entity);
    }
  };

  const handleSaveEdit = async (type) => {
    try {
      setLoadingState('action', true);
      if (type === 'restaurant') {
        await updateRestaurant(editingRestaurant.id, editingRestaurant);
        setEditingRestaurant(null);
      } else if (type === 'city') {
        await updateCity(editingCity.id, editingCity);
        setEditingCity(null);
      } else if (type === 'type') {
        await updateType(editingType.id, editingType);
        setEditingType(null);
      }
      await fetchAllEntities();
      setAlert({ show: true, message: `${type} updated successfully.`, type: "success" });
    } catch (error) {
      console.error(`Error updating ${type}:`, error);
      setAlert({ show: true, message: `Failed to update ${type}. Please try again.`, type: "error" });
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
      }
      await fetchAllEntities();
      setAlert({ show: true, message: `${type} deleted successfully.`, type: "success" });
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      setAlert({ show: true, message: `Failed to delete ${type}. Please try again.`, type: "error" });
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
    return entities.filter(entity => 
      (filters.status === 'all' || filters.status === '' || entity.status === filters.status) &&
      (filters.search === '' || entity.name.toLowerCase().includes(filters.search.toLowerCase()))
    );
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
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      
      <AlertDialog open={alert.show} onOpenChange={() => setAlert({ ...alert, show: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alert.type === 'success' ? 'Success' : 'Error'}</AlertDialogTitle>
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
            <SelectTrigger className="w-[180px]">
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
          <h2 className="text-xl font-semibold mb-2">Restaurants</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntities(restaurants).map((restaurant) => (
                <TableRow key={restaurant.id}>
                  <TableCell>{restaurant.name}</TableCell>
                  <TableCell>{restaurant.address}</TableCell>
                  <TableCell>
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
                  <TableCell>
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
        </TabsContent>

        <TabsContent value="cities">
          <h2 className="text-xl font-semibold mb-2">Cities</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntities(cities).map((city) => (
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
        </TabsContent>

        <TabsContent value="types">
          <h2 className="text-xl font-semibold mb-2">Types</h2>
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
      </Tabs>

      {/* Restaurant Edit Dialog */}
      <Dialog 
        open={editingRestaurant !== null} 
        onOpenChange={(open) => {
          if (!open) {
            setEditingRestaurant(null);
          }
        }}
      >
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>Edit Restaurant</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Restaurant Name */}
            <Input
              value={editingRestaurant?.name || ''}
              onChange={(e) => setEditingRestaurant({...editingRestaurant, name: e.target.value})}
              placeholder="Restaurant Name"
            />

            {/* Address */}
            <Input
              value={editingRestaurant?.address || ''}
              onChange={(e) => setEditingRestaurant({...editingRestaurant, address: e.target.value})}
              placeholder="Address"
            />

            {/* Location Coordinates Section */}
            <div>
              <div className="mb-4">
                <h3 className="text-sm font-medium">Location Coordinates</h3>
                <p className="text-sm text-muted-foreground">
                  Current: {editingRestaurant?.latitude ? 
                    `${editingRestaurant.latitude}, ${editingRestaurant.longitude}` : 
                    'Not set'}
                </p>
                {coordinatesUpdated && (
                  <p className="mt-2 text-sm text-emerald-600 bg-emerald-50 p-2 rounded-md">
                    Coordinates updated successfully!
                  </p>
                )}
              </div>

              <div className="space-y-4">
                {/* CAP */}
                <div>
                  <Label>CAP (Optional)</Label>
                  <Input
                    value={geocodingDetails.cap || ''}
                    onChange={(e) => setGeocodingDetails(prev => ({ 
                      ...prev, 
                      cap: e.target.value 
                    }))}
                    placeholder="CAP"
                  />
                </div>

                {/* Latitude & Longitude */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Latitude</Label>
                    <Input
                      type="number"
                      step="any"
                      value={editingRestaurant?.latitude || ''}
                      onChange={(e) => setEditingRestaurant({
                        ...editingRestaurant,
                        latitude: parseFloat(e.target.value)
                      })}
                      placeholder="Latitude"
                    />
                  </div>
                  <div>
                    <Label>Longitude</Label>
                    <Input
                      type="number"
                      step="any"
                      value={editingRestaurant?.longitude || ''}
                      onChange={(e) => setEditingRestaurant({
                        ...editingRestaurant,
                        longitude: parseFloat(e.target.value)
                      })}
                      placeholder="Longitude"
                    />
                  </div>
                </div>

                {/* Recalculate Button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleRecalculateCoordinates}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Recalculate Coordinates
                </Button>
              </div>
            </div>

            {/* City and Type Selection */}
            <div className="grid grid-cols-2 gap-4">
              {/* City Selection */}
              <div>
                <Select
                  value={editingRestaurant?.city_id?.toString() || ''}
                  onValueChange={(value) => setEditingRestaurant({...editingRestaurant, city_id: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select City" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map(city => (
                      <SelectItem key={city.id} value={city.id.toString()}>{city.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="mt-2 w-full justify-start" 
                  onClick={() => setIsAddingCity(true)}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add New City
                </Button>
              </div>

              {/* Type Selection */}
              <div>
                <Select
                  value={editingRestaurant?.type_id?.toString() || ''}
                  onValueChange={(value) => setEditingRestaurant({...editingRestaurant, type_id: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map(type => (
                      <SelectItem key={type.id} value={type.id.toString()}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="mt-2 w-full justify-start" 
                  onClick={() => setIsAddingType(true)}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add New Type
                </Button>
              </div>
            </div>

            {/* Price Selection */}
            <Select
              value={editingRestaurant?.price?.toString() || ''}
              onValueChange={(value) => setEditingRestaurant({...editingRestaurant, price: parseInt(value)})}
            >
              <SelectTrigger>
                <SelectValue placeholder="€" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">€</SelectItem>
                <SelectItem value="2">€€</SelectItem>
                <SelectItem value="3">€€€</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button 
              className="bg-black text-white hover:bg-black/90"
              onClick={() => handleSaveEdit('restaurant')}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog with higher z-index */}
      <AlertDialog 
        open={alert.show} 
        onOpenChange={(open) => setAlert(prev => ({ ...prev, show: open }))}
      >
        <AlertDialogContent className="z-[200]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {alert.type === 'error' ? 'Error' : 'Success'}
            </AlertDialogTitle>
            <AlertDialogDescription>{alert.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlert(prev => ({ ...prev, show: false }))}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* City Edit Dialog */}
      <Dialog open={editingCity !== null} onOpenChange={() => setEditingCity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit City</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={editingCity?.name || ''}
              onChange={(e) => setEditingCity({...editingCity, name: e.target.value})}
              placeholder="City Name"
            />
          </div>
          <DialogFooter>
            <Button onClick={() => handleSaveEdit('city')}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Type Edit Dialog */}
      <Dialog open={editingType !== null} onOpenChange={() => setEditingType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={editingType?.name || ''}
              onChange={(e) => setEditingType({...editingType, name: e.target.value})}
              placeholder="Type Name"
            />
          </div>
          <DialogFooter>
            <Button onClick={() => handleSaveEdit('type')}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Type Dialog */}
      <Dialog open={isAddingType} onOpenChange={setIsAddingType}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Type</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Type name"
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
          />
          <DialogFooter>
            <Button onClick={handleAddNewType}>Add Type</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New City Dialog */}
      <Dialog open={isAddingCity} onOpenChange={setIsAddingCity}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New City</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="City name"
            value={newCityName}
            onChange={(e) => setNewCityName(e.target.value)}
          />
          <DialogFooter>
            <Button onClick={handleAddNewCity}>Add City</Button>
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
    </div>
  );
};

export default AdminDashboard;