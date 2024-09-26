import React, { useState, useEffect } from 'react';
import { SearchIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';

/**
 * SearchDialog Component
 * 
 * This component provides a search functionality with an accessible dialog.
 * It includes a trigger button that opens a dialog with a search input.
 * 
 * @param {Object} props
 * @param {Function} props.onSearch - Function to handle the search action
 */
const SearchDialog = ({ onSearch }) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

  const handleOpenChange = (newOpen) => {
    setOpen(newOpen);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch(searchQuery);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="w-9 px-0"
        >
          <SearchIcon className="h-4 w-4" />
          <span className="sr-only">Search restaurants</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Search Restaurants</DialogTitle>
          <DialogDescription>
            Enter a search term to find restaurants.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSearch} className="flex items-center space-x-2">
          <div className="relative flex-grow">
            <SearchIcon className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
              placeholder="Type to search restaurants..."
              autoFocus
            />
          </div>
          <Button type="submit">Search</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SearchDialog;