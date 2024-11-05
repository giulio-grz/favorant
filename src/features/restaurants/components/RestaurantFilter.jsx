import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, X } from 'lucide-react';

const FilterSection = ({ title, onClear, showClear, children }) => (
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
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-10 bg-background">
        <div className="px-4">
          <div className="max-w-2xl mx-auto w-full">
            <div className="py-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/')}
                className="shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </div>

            {getActiveFilters().length > 0 && (
              <div className="pb-4">
                <div className="flex flex-wrap gap-2">
                  {getActiveFilters().map((filter) => (
                    <Badge
                      key={`${filter.type}-${filter.id}`}
                      variant="secondary"
                      className="flex items-center gap-1 pr-1"
                    >
                      <span className="px-1">{filter.value}</span>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={handleClearAll}
                  >
                    Clear all
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Content */}
      <div className="flex-1 px-4">
        <div className="max-w-2xl mx-auto w-full space-y-6 pb-20">
          {/* Types Section */}
          <FilterSection title="Type">
            <Select
              value={filters.type_id?.toString() || "all"}
              onValueChange={(value) => setFilters(prev => ({
                ...prev,
                type_id: value === "all" ? null : parseInt(value)
              }))}
            >
              <SelectTrigger className="h-9">
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

          {/* Cities Section */}
          <FilterSection title="City">
            <Select
              value={filters.city_id?.toString() || "all"}
              onValueChange={(value) => setFilters(prev => ({
                ...prev,
                city_id: value === "all" ? null : parseInt(value)
              }))}
            >
              <SelectTrigger className="h-9">
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

          {/* Price Section */}
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
                  size="sm"
                  className="h-9"
                >
                  {'€'.repeat(value)}
                </Button>
              ))}
            </div>
          </FilterSection>

          {/* Sort Section */}
          <FilterSection title="Sort By">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={sortOption === 'dateAdded' ? "default" : "outline"}
                onClick={() => setSortOption('dateAdded')}
                size="sm"
                className="h-9"
              >
                Most Recent
              </Button>
              <Button
                variant={sortOption === 'rating' ? "default" : "outline"}
                onClick={() => setSortOption('rating')}
                size="sm"
                className="h-9"
              >
                Top Rated
              </Button>
            </div>
          </FilterSection>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
        <div className="max-w-2xl mx-auto w-full flex gap-3">
          <Button 
            variant="outline"
            className="flex-1"
            onClick={handleClearAll}
          >
            Clear all
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
  );
};

export default RestaurantFilter;