import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Star } from 'lucide-react';
import { Switch } from '../../../components/ui/switch';
import DynamicInput from './DynamicInput';

const AddRestaurant = ({ onAdd, onCancel, types, cities, addType, editType, deleteType, addCity, editCity, deleteCity, initialData = null }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState(null);
  const [city, setCity] = useState(null);
  const [rating, setRating] = useState(0);
  const [toTry, setToTry] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setType(types.find(t => t.id === initialData.type_id));
      setCity(cities.find(c => c.id === initialData.city_id));
      setRating(initialData.rating || 0);
      setToTry(initialData.to_try);
    }
  }, [initialData, types, cities]);

  const handleSubmit = async () => {
    if (name && type && city) {
      try {
        const restaurantData = { 
          name, 
          type_id: type.id, 
          city_id: city.id, 
          rating: toTry ? null : rating, 
          to_try: toTry 
        };

        await onAdd(restaurantData);
        resetForm();
      } catch (error) {
        console.error('Error in handleSubmit:', error);
        alert('Failed to save restaurant: ' + error.message);
      }
    } else {
      alert('Please fill in all fields');
    }
  };

  const resetForm = () => {
    setName('');
    setType(null);
    setCity(null);
    setRating(0);
    setToTry(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <DynamicInput
        options={types}
        selectedOption={type}
        onSelect={setType}
        onAdd={addType}
        onEdit={editType}
        onDelete={deleteType}
        placeholder="Enter restaurant type"
        title="Type"
      />
      <DynamicInput
        options={cities}
        selectedOption={city}
        onSelect={setCity}
        onAdd={addCity}
        onEdit={editCity}
        onDelete={deleteCity}
        placeholder="Enter city"
        title="City"
      />
      <div className="flex items-center space-x-2">
        <Switch
          id="to-try"
          checked={toTry}
          onCheckedChange={setToTry}
        />
        <Label htmlFor="to-try">To Try</Label>
      </div>
      {!toTry && (
        <div className="space-y-2">
          <Label>Rating</Label>
          <div className="flex space-x-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <Button
                key={value}
                variant={rating === value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRating(value)}
              >
                {value} <Star className="ml-1" size={14} />
              </Button>
            ))}
          </div>
        </div>
      )}
      <div className="flex justify-end space-x-2 mt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit}>{initialData ? 'Update' : 'Add'} Restaurant</Button>
      </div>
    </div>
  );
};

export default AddRestaurant;