import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ChevronLeft, X } from 'lucide-react';

const FilterSection = ({ title, onClear, showClear, children }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between px-4">
      <Label className="text-sm font-normal">{title}</Label>
      {showClear && (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onClear}
          className="h-8 px-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/')}
              className="hover:bg-transparent"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">
              Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setFilters({
                    type_id: null,
                    city_id: null,
                    price: null
                  });
                  setSortOption('dateAdded');
                }}
                className="text-sm font-normal"
              >
                Clear all
              </Button>
            )}
            <Button 
              onClick={() => {
                onApplyFilters(filters, sortOption);
                navigate('/');
              }}
              className="text-sm font-normal h-8"
            >
              Apply
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Content */}
      <div className="space-y-6 pt-4">
        {/* Types Section */}
        <FilterSection 
          title="Type" 
          onClear={() => handleClearSection('type')}
          showClear={filters.type_id !== null}
        >
          <ScrollArea className="w-full whitespace-nowrap" type="scroll">
            <div className="flex gap-2 px-4">
              {types.map((type) => (
                <Button
                  key={type.id}
                  variant={filters.type_id === type.id ? "default" : "outline"}
                  onClick={() => setFilters(prev => ({ 
                    ...prev, 
                    type_id: filters.type_id === type.id ? null : type.id 
                  }))}
                  className="flex-shrink-0 text-sm font-normal h-8"
                  size="sm"
                >
                  {type.name}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="mt-2" />
          </ScrollArea>
        </FilterSection>

        {/* Cities Section */}
        <FilterSection 
          title="City" 
          onClear={() => handleClearSection('city')}
          showClear={filters.city_id !== null}
        >
          <ScrollArea className="w-full whitespace-nowrap" type="scroll">
            <div className="flex gap-2 px-4">
              {cities.map((city) => (
                <Button
                  key={city.id}
                  variant={filters.city_id === city.id ? "default" : "outline"}
                  onClick={() => setFilters(prev => ({ 
                    ...prev, 
                    city_id: filters.city_id === city.id ? null : city.id 
                  }))}
                  className="flex-shrink-0 text-sm font-normal h-8"
                  size="sm"
                >
                  {city.name}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="mt-2" />
          </ScrollArea>
        </FilterSection>

        {/* Price Section */}
        <FilterSection 
          title="Price Range" 
          onClear={() => handleClearSection('price')}
          showClear={filters.price !== null}
        >
          <div className="flex gap-2 px-4">
            {[1, 2, 3].map((value) => (
              <Button
                key={value}
                variant={filters.price === value ? "default" : "outline"}
                onClick={() => setFilters(prev => ({ 
                  ...prev, 
                  price: filters.price === value ? null : value 
                }))}
                className="flex-shrink-0 text-sm font-normal h-8"
                size="sm"
              >
                {'€'.repeat(value)}
              </Button>
            ))}
          </div>
        </FilterSection>

        {/* Sort Section */}
        <FilterSection 
          title="Sort By" 
          onClear={() => handleClearSection('sort')}
          showClear={sortOption !== 'dateAdded'}
        >
          <div className="flex gap-2 px-4">
            <Button
              variant={sortOption === 'dateAdded' ? "default" : "outline"}
              onClick={() => setSortOption('dateAdded')}
              className="flex-shrink-0 text-sm font-normal h-8"
              size="sm"
            >
              Most Recent
            </Button>
            <Button
              variant={sortOption === 'rating' ? "default" : "outline"}
              onClick={() => setSortOption('rating')}
              className="flex-shrink-0 text-sm font-normal h-8"
              size="sm"
            >
              Top Rated
            </Button>
          </div>
        </FilterSection>
      </div>
    </div>
  );
};

export default RestaurantFilter;