import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Slider } from '../../../components/ui/slider';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../../../components/ui/accordion';
import { Euro, Star } from 'lucide-react';
import { Switch } from '../../../components/ui/switch';
import { SimpleDialog } from '../../../components/ui/SimpleDialog';

const PriceSelector = ({ price, setPrice }) => {
  return (
    <div className="flex space-x-2">
      {[1, 2, 3].map((value) => (
        <Button
          key={value}
          onClick={() => setPrice(value)}
          variant={price === value ? "default" : "outline"}
          size="sm"
          className="w-20"
        >
          {'€'.repeat(value)}
        </Button>
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
  const [isAddTypeDialogOpen, setIsAddTypeDialogOpen] = useState(false);
  const [isAddCityDialogOpen, setIsAddCityDialogOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newCityName, setNewCityName] = useState('');

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

  const handleAddType = async () => {
    if (newTypeName.trim()) {
      const newType = await addType(newTypeName.trim());
      setType(newType);
      setNewTypeName('');
      setIsAddTypeDialogOpen(false);
    }
  };

  const handleAddCity = async () => {
    if (newCityName.trim()) {
      const newCity = await addCity(newCityName.trim());
      setCity(newCity);
      setNewCityName('');
      setIsAddCityDialogOpen(false);
    }
  };

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
    <div className="space-y-6 max-h-[80vh] overflow-y-auto p-2">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full" />
      </div>
      
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="type" className="border-none">
          <AccordionTrigger className="bg-gray-50 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors">Type</AccordionTrigger>
          <AccordionContent className="bg-gray-50 px-4 py-3 mt-1 rounded-lg">
            <div className="flex flex-wrap gap-2">
              {types.map((t) => (
                <Button
                  key={t.id}
                  variant={type && type.id === t.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setType(t)}
                >
                  {t.name}
                </Button>
              ))}
              <Button variant="outline" size="sm" onClick={() => setIsAddTypeDialogOpen(true)}>
                + Add New
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="city" className="border-none">
          <AccordionTrigger className="bg-gray-50 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors">City</AccordionTrigger>
          <AccordionContent className="bg-gray-50 px-4 py-3 mt-1 rounded-lg">
            <div className="flex flex-wrap gap-2">
              {cities.map((c) => (
                <Button
                  key={c.id}
                  variant={city && city.id === c.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCity(c)}
                >
                  {c.name}
                </Button>
              ))}
              <Button variant="outline" size="sm" onClick={() => setIsAddCityDialogOpen(true)}>
                + Add New
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      
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
          <Label>Rating: {rating}/10</Label>
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
        <AccordionItem value="notes" className="border-none">
          <AccordionTrigger className="bg-gray-50 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors">Notes</AccordionTrigger>
          <AccordionContent className="bg-gray-50 px-4 py-3 mt-1 rounded-lg">
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

      <SimpleDialog
        isOpen={isAddTypeDialogOpen}
        onClose={() => setIsAddTypeDialogOpen(false)}
        title="Add New Type"
      >
        <div className="space-y-4">
          <Label htmlFor="newTypeName">Type Name</Label>
          <Input
            id="newTypeName"
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            placeholder="Enter new type name"
          />
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsAddTypeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddType}>Add Type</Button>
          </div>
        </div>
      </SimpleDialog>

      <SimpleDialog
        isOpen={isAddCityDialogOpen}
        onClose={() => setIsAddCityDialogOpen(false)}
        title="Add New City"
      >
        <div className="space-y-4">
          <Label htmlFor="newCityName">City Name</Label>
          <Input
            id="newCityName"
            value={newCityName}
            onChange={(e) => setNewCityName(e.target.value)}
            placeholder="Enter new city name"
          />
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsAddCityDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCity}>Add City</Button>
          </div>
        </div>
      </SimpleDialog>
    </div>
  );
};

export default AddRestaurant;