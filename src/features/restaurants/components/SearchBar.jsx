import React, { useState } from 'react';
import { SearchIcon, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/**
 * SearchBar Component
 * 
 * This component provides a search input functionality for both desktop and mobile views.
 * It includes a search input and a clear button, with improved mobile alignment.
 * 
 * @param {Object} props
 * @param {Function} props.onSearch - Function to handle the search action
 */
const SearchBar = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
    onSearch(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    onSearch('');
  };

  return (
    <div className="w-full relative mb-8 sm:mb-0">
      <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        value={searchQuery}
        onChange={handleInputChange}
        className="pl-10 pr-10"
        placeholder="Search restaurants..."
      />
      {searchQuery && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 px-2 h-8"
          onClick={handleClearSearch}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default SearchBar;