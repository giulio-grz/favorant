import React, { useState, useEffect } from 'react';
import { supabase, getAllEntities, approveRestaurant, updateRestaurant, deleteRestaurant, approveCity, approveType, updateCity, deleteCity, updateType, deleteType, createCity, createRestaurantType } from '@/supabaseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash, MoreHorizontal, Check, Plus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AdminDashboard = () => {
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

  useEffect(() => {
    checkAdminStatus();
    fetchAllEntities();
  }, []);

  const checkAdminStatus = async () => {
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
      } else {
        setIsAdmin(profile.is_admin);
      }
    }
  };

  const fetchAllEntities = async () => {
    try {
      const { restaurants, cities, types } = await getAllEntities();
      setRestaurants(restaurants);
      setCities(cities);
      setTypes(types);
    } catch (error) {
      console.error('Error fetching entities:', error);
      setAlert({ show: true, message: "Failed to fetch data. Please try again.", type: "error" });
    }
  };

  const handleApprove = async (id, type) => {
    try {
      if (type === 'restaurant') await approveRestaurant(id);
      else if (type === 'city') await approveCity(id);
      else if (type === 'type') await approveType(id);
      fetchAllEntities();
      setAlert({ show: true, message: `${type} approved successfully.`, type: "success" });
    } catch (error) {
      console.error(`Error approving ${type}:`, error);
      setAlert({ show: true, message: `Failed to approve ${type}. Please try again.`, type: "error" });
    }
  };

  const handleEdit = (entity, type) => {
    if (type === 'restaurant') setEditingRestaurant(entity);
    else if (type === 'city') setEditingCity(entity);
    else if (type === 'type') setEditingType(entity);
  };

  const handleSaveEdit = async (type) => {
    try {
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
      fetchAllEntities();
      setAlert({ show: true, message: `${type} updated successfully.`, type: "success" });
    } catch (error) {
      console.error(`Error updating ${type}:`, error);
      setAlert({ show: true, message: `Failed to update ${type}. Please try again.`, type: "error" });
    }
  };

  const handleDelete = async (type) => {
    try {
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

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
      fetchAllEntities();
      setAlert({ show: true, message: `${type} deleted successfully.`, type: "success" });
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      setAlert({ show: true, message: `Failed to delete ${type}. Please try again.`, type: "error" });
    }
  };

  const handleAddNewType = async () => {
    try {
      const newType = await createRestaurantType({ 
        name: newTypeName, 
        created_by: currentUser.id,
        status: 'approved' // Set status as approved by default for admin
      });
      setTypes(prevTypes => [...prevTypes, newType]);
      setNewTypeName('');
      setIsAddingType(false);
      setEditingRestaurant(prev => ({ ...prev, type_id: newType.id }));
      setAlert({ show: true, message: 'New type added successfully', type: 'success' });
    } catch (error) {
      console.error('Error adding new type:', error);
      setAlert({ show: true, message: `Failed to add new type: ${error.message}`, type: 'error' });
    }
  };
  
  const handleAddNewCity = async () => {
    try {
      const newCity = await createCity({ 
        name: newCityName, 
        created_by: currentUser.id,
        status: 'approved' // Set status as approved by default for admin
      });
      setCities(prevCities => [...prevCities, newCity]);
      setNewCityName('');
      setIsAddingCity(false);
      setEditingRestaurant(prev => ({ ...prev, city_id: newCity.id }));
      setAlert({ show: true, message: 'New city added successfully', type: 'success' });
    } catch (error) {
      console.error('Error adding new city:', error);
      setAlert({ show: true, message: `Failed to add new city: ${error.message}`, type: 'error' });
    }
  };

  const filteredEntities = (entities) => {
    return entities.filter(entity => 
      (filters.status === 'all' || filters.status === '' || entity.status === filters.status) &&
      (filters.search === '' || entity.name.toLowerCase().includes(filters.search.toLowerCase()))
    );
  };

  if (!isAdmin) {
    return <div>You do not have admin privileges.</div>;
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
  
      {/* Dialog for editing restaurant */}
      <Dialog open={editingRestaurant !== null} onOpenChange={() => setEditingRestaurant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Restaurant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={editingRestaurant?.name || ''}
              onChange={(e) => setEditingRestaurant({...editingRestaurant, name: e.target.value})}
              placeholder="Restaurant Name"
            />
            <Input
              value={editingRestaurant?.address || ''}
              onChange={(e) => setEditingRestaurant({...editingRestaurant, address: e.target.value})}
              placeholder="Address"
            />
            <div className="flex justify-between space-x-4">
              <div className="flex-1">
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
                  className="mt-2"
                  onClick={() => setIsAddingCity(true)}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add New City
                </Button>
              </div>
              <div className="flex-1">
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
                  className="mt-2"
                  onClick={() => setIsAddingType(true)}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add New Type
                </Button>
              </div>
            </div>
            <Select
              value={editingRestaurant?.price?.toString() || ''}
              onValueChange={(value) => setEditingRestaurant({...editingRestaurant, price: parseInt(value)})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">€</SelectItem>
                <SelectItem value="2">€€</SelectItem>
                <SelectItem value="3">€€€</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button onClick={() => handleSaveEdit('restaurant')}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for adding new type */}
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

      {/* Dialog for adding new city */}
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
  
      {/* Dialog for editing city */}
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
  
      {/* Dialog for editing type */}
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
  
      {/* Alert dialog for deleting restaurant */}
      <AlertDialog open={deletingRestaurant !== null} onOpenChange={() => setDeletingRestaurant(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this restaurant?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the restaurant and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingRestaurant(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete('restaurant')}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
  
      {/* Alert dialog for deleting city */}
      <AlertDialog open={deletingCity !== null} onOpenChange={() => setDeletingCity(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this city?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the city and may affect associated restaurants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingCity(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete('city')}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
  
      {/* Alert dialog for deleting type */}
      <AlertDialog open={deletingType !== null} onOpenChange={() => setDeletingType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this type?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the type and may affect associated restaurants.
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