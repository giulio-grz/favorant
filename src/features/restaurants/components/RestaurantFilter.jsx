import React from 'react';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { Star } from 'lucide-react';
import { Switch } from "../../../components/ui/switch";

const RestaurantFilter = ({ types, cities, filters, setFilters, sortOption, setSortOption, onClose }) => {
  const clearFilters = () => {
    setFilters({
      name: '',
      type_id: null,
      city_id: null,
      toTry: null,
      rating: 0
    });
    setSortOption('dateAdded');
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="nameFilter">Name</Label>
        <Input
          id="nameFilter"
          value={filters.name}
          onChange={(e) => setFilters({ ...filters, name: e.target.value })}
          placeholder="Filter by name"
        />
      </div>
      <div>
        <Label>Type</Label>
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
      </div>
      <div>
        <Label>City</Label>
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
        <div>
          <Label>Minimum Rating</Label>
          <div className="flex space-x-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <Button
                key={value}
                variant={filters.rating === value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilters({ ...filters, rating: filters.rating === value ? 0 : value, toTry: false })}
              >
                {value} <Star className="ml-1" size={14} />
              </Button>
            ))}
          </div>
        </div>
      )}
      <div>
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
  );
};

export default RestaurantFilter;