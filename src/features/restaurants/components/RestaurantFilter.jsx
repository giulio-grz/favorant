import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from 'lucide-react';

const FilterSection = ({ title, children }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <Label>{title}</Label>
    </div>
    {children}
  </div>
);

const RestaurantFilter = ({ 
  types, 
  cities, 
  filters, 
  setFilters, 
  sortOption, 
  setSortOption, 
  onApplyFilters 
}) => {
  const navigate = useNavigate();
  const countries = Array.from(new Set(
    cities
      .filter(city => city.countries)
      .map(city => JSON.stringify(city.countries))
  ))
    .map(str => JSON.parse(str))
    .sort((a, b) => a.name.localeCompare(b.name));

  const [selectedCountry, setSelectedCountry] = useState(filters.country_id ? 
    countries.find(c => c.id === filters.country_id) : null
  );
  const [filteredCities, setFilteredCities] = useState(cities);

  useEffect(() => {
    if (selectedCountry) {
      setFilteredCities(cities.filter(city => city.countries?.id === selectedCountry.id));
    } else {
      setFilteredCities(cities);
    }
  }, [selectedCountry, cities]);

  const activeFilterCount = Object.values(filters).filter(value => 
    value !== null && value !== '' && value !== false && value !== 0
  ).length + (sortOption !== 'dateAdded' ? 1 : 0);

  const getActiveFilters = () => {
    const active = [];
    if (filters.type_id) {
      const type = types.find(t => t.id === filters.type_id);
      if (type) active.push({ type: 'type', value: type.name, id: type.id });
    }
    if (filters.country_id) {
      const country = countries.find(c => c.id === filters.country_id);
      if (country) active.push({ 
        type: 'country', 
        value: `${country.name} (${country.code})`, 
        id: country.id 
      });
    }
    if (filters.city_id) {
      const city = cities.find(c => c.id === filters.city_id);
      if (city) active.push({ type: 'city', value: city.name, id: city.id });
    }
    if (filters.price) {
      active.push({ type: 'price', value: '€'.repeat(filters.price), id: filters.price });
    }
    if (sortOption !== 'dateAdded') {
      active.push({ type: 'sort', value: sortOption === 'rating' ? 'Top Rated' : 'Most Recent', id: sortOption });
    }
    return active;
  };

  const handleClearSection = (section) => {
    switch(section) {
      case 'type':
        setFilters(prev => ({ ...prev, type_id: null }));
        break;
      case 'country':
        setSelectedCountry(null);
        setFilters(prev => ({ ...prev, country_id: null, city_id: null }));
        setFilteredCities(cities);
        break;
      case 'city':
        setFilters(prev => ({ ...prev, city_id: null }));
        break;
      case 'price':
        setFilters(prev => ({ ...prev, price: null }));
        break;
      case 'sort':
        setSortOption('dateAdded');
        break;
      default:
        break;
    }
  };

  const handleClearAll = () => {
    setSelectedCountry(null);
    setFilteredCities(cities);
    setFilters({
      type_id: null,
      country_id: null,
      city_id: null,
      price: null
    });
    setSortOption('dateAdded');
  };

  const handleApply = () => {
    onApplyFilters(filters, sortOption);
    navigate('/');
  };

  return (
    <div className="fixed inset-0 bg-background sm:p-6 flex items-center justify-center">
      <div className="w-full h-full bg-background sm:rounded-xl sm:border sm:shadow-sm sm:max-w-3xl flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto">
          {getActiveFilters().length > 0 && (
            <div className="px-2 sm:px-4 py-4 border-b">
              <div className="flex flex-wrap gap-2">
                {getActiveFilters().map((filter) => (
                  <Badge
                    key={`${filter.type}-${filter.id}`}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    <span>{filter.value}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 hover:bg-transparent"
                      onClick={() => handleClearSection(filter.type)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="px-2 sm:p-4 space-y-6 mt-4">
            <FilterSection title="Type">
              <Select
                defaultValue=""
                onValueChange={(value) => setFilters(prev => ({
                  ...prev,
                  type_id: value === "all" ? null : parseInt(value)
                }))}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {types.map(type => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterSection>

            <FilterSection title="Country">
              <Select
                value={filters.country_id?.toString() || ""}
                onValueChange={(value) => {
                  const countryId = parseInt(value);
                  const country = countries.find(c => c.id === countryId);
                  setSelectedCountry(country);
                  setFilteredCities(cities.filter(city => city.countries?.id === countryId));
                  setFilters(prev => ({ ...prev, country_id: countryId, city_id: null }));
                }}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map(country => (
                    <SelectItem key={country.id} value={country.id.toString()}>
                      {country.name} ({country.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterSection>

            <FilterSection title="City">
              <Select
                value={filters.city_id?.toString() || ""}
                onValueChange={(value) => {
                  const cityId = parseInt(value);
                  setFilters(prev => ({
                    ...prev,
                    city_id: cityId
                  }));
                }}
                disabled={!selectedCountry}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder={selectedCountry ? "Select city" : "Select a country first"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredCities.map(city => (
                    <SelectItem key={city.id} value={city.id.toString()}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterSection>

            <FilterSection title="Price Range">
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((value) => (
                  <Button
                    key={value}
                    variant={filters.price === value ? "default" : "outline"}
                    onClick={() => setFilters(prev => ({ 
                      ...prev, 
                      price: filters.price === value ? null : value 
                    }))}
                    className="h-12"
                  >
                    {'€'.repeat(value)}
                  </Button>
                ))}
              </div>
            </FilterSection>

            <FilterSection title="Sort By">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={sortOption === 'dateAdded' ? "default" : "outline"}
                  onClick={() => setSortOption('dateAdded')}
                  className="h-12"
                >
                  Most Recent
                </Button>
                <Button
                  variant={sortOption === 'rating' ? "default" : "outline"}
                  onClick={() => setSortOption('rating')}
                  className="h-12"
                >
                  Top Rated
                </Button>
              </div>
            </FilterSection>
          </div>
        </div>

        <div className="shrink-0 border-t bg-background p-2 sm:p-4 sm:rounded-b-xl">
          <div className="flex gap-3">
            <Button 
              variant="outline"
              className="flex-1"
              onClick={() => {
                handleClearAll();
                navigate(-1);
              }}
            >
              Clear filters
            </Button>
            <Button 
              onClick={handleApply}
              className="flex-1"
            >
              Apply Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantFilter;