import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Slider } from '../../../components/ui/slider';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../../../components/ui/accordion';
import { Switch } from '../../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { ArrowLeft } from 'lucide-react';

/**
 * AddEditRestaurant component
 * Handles both adding new restaurants and editing existing ones
 */
const AddEditRestaurant = ({ onSave, types, cities, addType, editType, deleteType, addCity, editCity, deleteCity, userId, restaurants }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [restaurant, setRestaurant] = useState({
    name: '',
    type_id: null,
    city_id: null,
    rating: 0,
    price: 1,
    notes: '',
    to_try: false
  });

  const [isAddTypeDialogOpen, setIsAddTypeDialogOpen] = useState(false);
  const [isAddCityDialogOpen, setIsAddCityDialogOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newCityName, setNewCityName] = useState('');

  useEffect(() => {
    if (isEditing) {
      const existingRestaurant = restaurants.find(r => r.id.toString() === id);
      if (existingRestaurant) {
        setRestaurant(existingRestaurant);
      }
    }
  }, [id, restaurants, isEditing]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setRestaurant(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked) => {
    setRestaurant(prev => ({ ...prev, to_try: checked }));
  };

  const handleAddType = async () => {
    if (newTypeName.trim()) {
      const newType = await addType(newTypeName.trim());
      setRestaurant(prev => ({ ...prev, type_id: newType.id }));
      setNewTypeName('');
      setIsAddTypeDialogOpen(false);
    }
  };

  const handleAddCity = async () => {
    if (newCityName.trim()) {
      const newCity = await addCity(newCityName.trim());
      setRestaurant(prev => ({ ...prev, city_id: newCity.id }));
      setNewCityName('');
      setIsAddCityDialogOpen(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (restaurant.name && restaurant.type_id && restaurant.city_id) {
      try {
        await onSave({ ...restaurant, user_id: userId });
        navigate('/');
      } catch (error) {
        console.error('Error saving restaurant:', error);
        alert('Failed to save restaurant: ' + error.message);
      }
    } else {
      alert('Please fill in all required fields');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{isEditing ? 'Edit Restaurant' : 'Add New Restaurant'}</h2>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" value={restaurant.name} onChange={handleInputChange} required />
      </div>
      
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="type">
          <AccordionTrigger>Type</AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-wrap gap-2">
              {types.map((type) => (
                <Button
                  key={type.id}
                  type="button"
                  variant={restaurant.type_id === type.id ? "default" : "outline"}
                  onClick={() => setRestaurant(prev => ({ ...prev, type_id: type.id }))}
                >
                  {type.name}
                </Button>
              ))}
              <Button type="button" variant="outline" onClick={() => setIsAddTypeDialogOpen(true)}>
                + Add New
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="city">
          <AccordionTrigger>City</AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-wrap gap-2">
              {cities.map((city) => (
                <Button
                  key={city.id}
                  type="button"
                  variant={restaurant.city_id === city.id ? "default" : "outline"}
                  onClick={() => setRestaurant(prev => ({ ...prev, city_id: city.id }))}
                >
                  {city.name}
                </Button>
              ))}
              <Button type="button" variant="outline" onClick={() => setIsAddCityDialogOpen(true)}>
                + Add New
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      
      <div className="space-y-2">
        <Label>Price</Label>
        <div className="flex space-x-2">
          {[1, 2, 3].map((value) => (
            <Button
              key={value}
              type="button"
              onClick={() => setRestaurant(prev => ({ ...prev, price: value }))}
              variant={restaurant.price === value ? "default" : "outline"}
            >
              {'€'.repeat(value)}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch
          id="to-try"
          checked={restaurant.to_try}
          onCheckedChange={handleSwitchChange}
        />
        <Label htmlFor="to-try">To Try</Label>
      </div>
      
      {!restaurant.to_try && (
        <div className="space-y-2">
          <Label>Rating: {restaurant.rating}/10</Label>
          <Slider
            min={1}
            max={10}
            step={1}
            value={[restaurant.rating]}
            onValueChange={(value) => setRestaurant(prev => ({ ...prev, rating: value[0] }))}
          />
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          value={restaurant.notes}
          onChange={handleInputChange}
          rows={3}
        />
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={() => navigate('/')}>
          Cancel
        </Button>
        <Button type="submit">
          {isEditing ? 'Update' : 'Add'} Restaurant
        </Button>
      </div>

      <Dialog open={isAddTypeDialogOpen} onOpenChange={setIsAddTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label htmlFor="newTypeName">Type Name</Label>
            <Input
              id="newTypeName"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              placeholder="Enter new type name"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddTypeDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleAddType}>
              Add Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddCityDialogOpen} onOpenChange={setIsAddCityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New City</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label htmlFor="newCityName">City Name</Label>
            <Input
              id="newCityName"
              value={newCityName}
              onChange={(e) => setNewCityName(e.target.value)}
              placeholder="Enter new city name"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddCityDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleAddCity}>
              Add City
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
};

export default AddEditRestaurant;