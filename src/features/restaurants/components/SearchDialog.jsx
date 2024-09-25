import React, { useState, useEffect } from 'react';
import { SearchIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';

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
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        className="w-9 px-0"
      >
        <SearchIcon className="h-4 w-4" />
        <span className="sr-only">Search restaurants</span>
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px] p-0">
          <form onSubmit={handleSearch} className="flex items-center p-2">
            <SearchIcon className="h-4 w-4 mr-2 ml-1 flex-shrink-0 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-grow border-none focus-visible:ring-0 focus-visible:ring-offset-0 h-8"
              placeholder="Type to search restaurants..."
              autoFocus
            />
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SearchDialog;