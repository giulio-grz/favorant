import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { Slider } from '../../../components/ui/slider';
import { Switch } from "../../../components/ui/switch";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../../../components/ui/accordion';
import { Badge } from '../../../components/ui/badge';
import { X } from 'lucide-react';

const RestaurantFilter = ({ types, cities, filters, setFilters, sortOption, setSortOption, onApplyFilters }) => {
  const navigate = useNavigate();

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(value => 
      value !== null && value !== '' && value !== false && value !== 0
    ).length + (sortOption !== 'dateAdded' ? 1 : 0);
  }, [filters, sortOption]);

  const handleApply = () => {
    onApplyFilters(filters, sortOption);
    navigate('/');
  };

  const removeFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: null }));
  };

  const getFilterLabel = (key, value) => {
    switch (key) {
      case 'name':
        return `Name: ${value}`;
      case 'type_id':
        return `Type: ${types.find(t => t.id === value)?.name}`;
      case 'city_id':
        return `City: ${cities.find(c => c.id === value)?.name}`;
      case 'toTry':
        return 'To Try';
      case 'rating':
        return `Rating: >${value}`;
      case 'price':
        return `Price: ${'€'.repeat(value)}`;
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold">Filter & Sort Restaurants</h2>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(filters).map(([key, value]) => {
          if (value !== null && value !== '' && value !== false && value !== 0) {
            return (
              <Badge key={key} variant="secondary" className="flex items-center gap-1">
                {getFilterLabel(key, value)}
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-auto p-0 text-secondary-foreground"
                  onClick={() => removeFilter(key)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          }
          return null;
        })}
        {sortOption !== 'dateAdded' && (
          <Badge variant="secondary" className="flex items-center gap-1">
            Sort: {sortOption}
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-auto p-0 text-secondary-foreground"
              onClick={() => setSortOption('dateAdded')}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        )}
      </div>
      
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="type">
          <AccordionTrigger>Type</AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-wrap gap-2">
              {types.map((type) => (
                <Button
                  key={type.id}
                  variant={filters.type_id === type.id ? "default" : "outline"}
                  onClick={() => setFilters({ ...filters, type_id: filters.type_id === type.id ? null : type.id })}
                >
                  {type.name}
                </Button>
              ))}
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
                  variant={filters.city_id === city.id ? "default" : "outline"}
                  onClick={() => setFilters({ ...filters, city_id: filters.city_id === city.id ? null : city.id })}
                >
                  {city.name}
                </Button>
              ))}
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
              onClick={() => setFilters({ ...filters, price: filters.price === value ? null : value })}
              variant={filters.price === value ? "default" : "outline"}
            >
              {'€'.repeat(value)}
            </Button>
          ))}
        </div>
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
        <div className="space-y-2">
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
      
      <div className="space-y-2">
        <Label>Sort By</Label>
        <div className="flex space-x-2">
          <Button
            variant={sortOption === 'dateAdded' ? 'default' : 'outline'}
            onClick={() => setSortOption('dateAdded')}
          >
            Date Added
          </Button>
          <Button
            variant={sortOption === 'name' ? 'default' : 'outline'}
            onClick={() => setSortOption('name')}
          >
            Name
          </Button>
          <Button
            variant={sortOption === 'rating' ? 'default' : 'outline'}
            onClick={() => setSortOption('rating')}
          >
            Rating
          </Button>
        </div>
      </div>
      
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={() => {
          setFilters({
            name: '',
            type_id: null,
            city_id: null,
            toTry: null,
            rating: 0,
            price: null
          });
          setSortOption('dateAdded');
        }}>
          Clear Filters
        </Button>
        <Button onClick={handleApply}>
          Apply Filters
        </Button>
      </div>
    </div>
  );
};

export default RestaurantFilter;