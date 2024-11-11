import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, ChevronLeft } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

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

  const activeFilterCount = Object.values(filters).filter(value => 
    value !== null && value !== '' && value !== false && value !== 0
  ).length + (sortOption !== 'dateAdded' ? 1 : 0);

  const getActiveFilters = () => {
    const active = [];
    if (filters.type_id) {
      const type = types.find(t => t.id === filters.type_id);
      if (type) active.push({ type: 'type', value: type.name, id: type.id });
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
    setFilters({
      type_id: null,
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
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full bg-white sm:rounded-xl sm:border sm:shadow-sm flex flex-col min-h-screen sm:min-h-[calc(100vh-1rem)] sm:mx-4 sm:max-w-3xl"> 
        {/* Main Content - Scrollable Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Active Filters */}
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

          {/* Filter Sections */}
          <div className="px-2 sm:p-4 space-y-6 mt-4">
            <FilterSection title="Type">
              <Select
                value={filters.type_id?.toString() || "all"}
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
    
            <FilterSection title="City">
              <Select
                value={filters.city_id?.toString() || "all"}
                onValueChange={(value) => setFilters(prev => ({
                  ...prev,
                  city_id: value === "all" ? null : parseInt(value)
                }))}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cities</SelectItem>
                  {cities.map(city => (
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

        {/* Footer */}
        <div className="border-t bg-background p-2 sm:p-4 rounded-b-xl">
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