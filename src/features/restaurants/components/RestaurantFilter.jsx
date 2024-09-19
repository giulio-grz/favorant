import React from 'react';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { Slider } from '../../../components/ui/slider';
import { Switch } from "../../../components/ui/switch";
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../../../components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog';

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

const RestaurantFilter = ({ isOpen, onClose, types, cities, filters, setFilters, sortOption, setSortOption }) => {
  const clearFilters = () => {
    setFilters({
      name: '',
      type_id: null,
      city_id: null,
      toTry: null,
      rating: 0,
      price: null
    });
    setSortOption('dateAdded');
  };

  const removeFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: null }));
  };

  const getFilterDisplayValue = (key, value) => {
    switch (key) {
      case 'type_id':
        return types.find(type => type.id === value)?.name || 'Unknown Type';
      case 'city_id':
        return cities.find(city => city.id === value)?.name || 'Unknown City';
      case 'price':
        return '€'.repeat(value);
      case 'toTry':
        return 'To Try';
      case 'rating':
        return `${value}/10`;
      default:
        return value;
    }
  };

  const activeFilters = Object.entries(filters).filter(([key, value]) => 
    value !== null && value !== '' && value !== 0 && key !== 'name'
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Filter & Sort Favorants</DialogTitle>
          <DialogDescription>Customize your restaurant list view.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeFilters.map(([key, value]) => (
                <span key={key} className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
                  {getFilterDisplayValue(key, value)}
                  <button onClick={() => removeFilter(key)} className="ml-1 focus:outline-none">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
          
          <div className="space-y-4">
            <Label htmlFor="nameFilter">Name</Label>
            <Input
              id="nameFilter"
              value={filters.name}
              onChange={(e) => setFilters({ ...filters, name: e.target.value })}
              placeholder="Filter by name"
            />
          </div>
          
          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="type" className="border-none">
              <AccordionTrigger className="bg-gray-50 p-3 rounded-t-lg hover:bg-gray-100 transition-colors">Type</AccordionTrigger>
              <AccordionContent className="bg-gray-50 p-3 rounded-b-lg">
                <div className="flex flex-wrap gap-2">
                  {types.map((type) => (
                    <Button
                      key={type.id}
                      variant={filters.type_id === type.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilters({ ...filters, type_id: filters.type_id === type.id ? null : type.id })}
                    >
                      {type.name}
                    </Button>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          
          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="city" className="border-none">
              <AccordionTrigger className="bg-gray-50 p-3 rounded-t-lg hover:bg-gray-100 transition-colors">City</AccordionTrigger>
              <AccordionContent className="bg-gray-50 p-3 rounded-b-lg">
                <div className="flex flex-wrap gap-2">
                  {cities.map((city) => (
                    <Button
                      key={city.id}
                      variant={filters.city_id === city.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilters({ ...filters, city_id: filters.city_id === city.id ? null : city.id })}
                    >
                      {city.name}
                    </Button>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          
          <div className="space-y-4">
            <Label>Price</Label>
            <PriceSelector 
              price={filters.price} 
              setPrice={(value) => setFilters({ ...filters, price: value })} 
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="to-try-filter"
              checked={filters.toTry === true}
              onCheckedChange={(checked) => {
                setFilters({ ...filters, toTry: checked ? true : null, rating: checked ? 0 : filters.rating });
              }}
            />
            <Label htmlFor="to-try-filter">To Try</Label>
          </div>
          
          {filters.toTry !== true && (
            <div className="space-y-4">
              <Label>Minimum Rating: {filters.rating}/10</Label>
              <Slider
                min={0}
                max={10}
                step={1}
                value={[filters.rating]}
                onValueChange={(value) => setFilters({ ...filters, rating: value[0], toTry: false })}
              />
            </div>
          )}
          
          <div className="space-y-4">
            <Label>Sort By</Label>
            <div className="flex space-x-2">
            <Button
                variant={sortOption === 'dateAdded' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortOption('dateAdded')}
              >
                Date Added
              </Button>
              <Button
                variant={sortOption === 'name' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortOption('name')}
              >
                Name
              </Button>
              <Button
                variant={sortOption === 'rating' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortOption('rating')}
              >
                Rating
              </Button>
            </div>
          </div>
          
          <div className="flex justify-between mt-4">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
            <Button onClick={onClose}>
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RestaurantFilter;