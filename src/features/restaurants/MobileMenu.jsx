import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { searchUsers, signOut } from '../../supabaseClient';
import { Menu, User, PlusCircle, Filter, Settings, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu';

const MobileMenu = ({ onAddClick, onFilterClick, onUserSelect, currentUserId, user, setUser, canAdd }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = useCallback(async (query) => {
    if (query.trim()) {
      const { data } = await searchUsers(query, currentUserId);
      setSearchResults(data || []);
    } else {
      setSearchResults([]);
    }
  }, [currentUserId]);

  const handleUserSelect = (selectedUser) => {
    onUserSelect(selectedUser);
    setIsOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setIsOpen(false);
    navigate('/auth');
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex flex-col space-y-4 p-2">
          <Input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
          />
          {searchResults.length > 0 && (
            <ul className="max-h-32 overflow-auto rounded-md border bg-popover p-1">
              {searchResults.map((result) => (
                <li
                  key={result.id}
                  className="cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                  onClick={() => handleUserSelect(result)}
                >
                  {result.username}
                </li>
              ))}
            </ul>
          )}
        </div>
        <DropdownMenuSeparator />
        {canAdd && (
          <DropdownMenuItem onClick={onAddClick}>
            <PlusCircle className="mr-2 h-4 w-4" />
            <span>Add Restaurant</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onFilterClick}>
          <Filter className="mr-2 h-4 w-4" />
          <span>Filter</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default MobileMenu;