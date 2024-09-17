import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Slider } from '../../../components/ui/slider';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../../../components/ui/accordion';
import { Star } from 'lucide-react';
import { Switch } from '../../../components/ui/switch';
import DynamicInput from './DynamicInput';

const PriceSelector = ({ price, setPrice }) => {
  return (
    <div className="flex space-x-2">
      {[1, 2, 3].map((value) => (
        <button
          key={value}
          onClick={() => setPrice(value)}
          className={`px-3 py-1 rounded-md transition-colors ${
            price === value ? 'bg-gray-200' : 'bg-gray-100'
          }`}
        >
          <span className="text-black">€</span>
          <span className={value >= 2 ? "text-black" : "text-gray-300"}>€</span>
          <span className={value >= 3 ? "text-black" : "text-gray-300"}>€</span>
        </button>
      ))}
    </div>
  );
};

const AddRestaurant = ({ onAdd, onCancel, types, cities, addType, editType, deleteType, addCity, editCity, deleteCity, initialData = null }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState(null);
  const [city, setCity] = useState(null);
  const [rating, setRating] = useState(0);
  const [price, setPrice] = useState(1);
  const [notes, setNotes] = useState('');
  const [toTry, setToTry] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setType(types.find(t => t.id === initialData.type_id));
      setCity(cities.find(c => c.id === initialData.city_id));
      setRating(initialData.rating || 0);
      setPrice(initialData.price || 1);
      setNotes(initialData.notes || '');
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
          price,
          notes,
          to_try: toTry 
        };

        await onAdd(restaurantData);
        resetForm();
      } catch (error) {
        console.error('Error in handleSubmit:', error);
        alert('Failed to save restaurant: ' + error.message);
      }
    } else {
      alert('Please fill in all required fields');
    }
  };

  const resetForm = () => {
    setName('');
    setType(null);
    setCity(null);
    setRating(0);
    setPrice(1);
    setNotes('');
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
      <div className="space-y-2">
        <Label>Price</Label>
        <PriceSelector price={price} setPrice={setPrice} />
      </div>
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
          <div className="flex justify-between items-center">
            <Label>Rating</Label>
            <span className="text-sm font-medium">{rating}/10</span>
          </div>
          <Slider
            min={1}
            max={10}
            step={1}
            value={[rating]}
            onValueChange={(value) => setRating(value[0])}
          />
        </div>
      )}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="notes">
          <AccordionTrigger>Add Notes</AccordionTrigger>
          <AccordionContent>
            <Textarea 
              id="notes" 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes here..."
              rows={3}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <div className="flex justify-end space-x-2 mt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit}>{initialData ? 'Update' : 'Add'} Restaurant</Button>
      </div>
    </div>
  );
};

export default AddRestaurant;