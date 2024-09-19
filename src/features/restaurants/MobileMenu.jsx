import React, { useState } from 'react';
import { Menu, Filter, PlusCircle, Search, Settings, LogOut } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { searchUsers, signOut } from '../../supabaseClient';
import UserSettingsDialog from './UserSettingsDialog';

const MobileMenu = ({ onAddClick, onFilterClick, onUserSelect, currentUserId, user, setUser, canAdd }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim()) {
      const { data } = await searchUsers(query, currentUserId);
      setSearchResults(data || []);
    } else {
      setSearchResults([]);
    }
  };

  const handleUserSelect = (selectedUser) => {
    onUserSelect(selectedUser);
    setSearchQuery('');
    setSearchResults([]);
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setIsOpen(false);
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
            <Menu className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <div className="flex items-center space-x-2 p-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{user.email[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium leading-none">{user.email}</p>
              <p className="text-xs text-muted-foreground truncate">{user.profile?.username || user.email}</p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onFilterClick} className="cursor-pointer">
            <Filter className="mr-2 h-4 w-4" />
            <span>Filter</span>
          </DropdownMenuItem>
          {canAdd && (
            <DropdownMenuItem onSelect={onAddClick} className="cursor-pointer">
              <PlusCircle className="mr-2 h-4 w-4" />
              <span>Add Restaurant</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={handleSearch}
                className="pl-8"
              />
            </div>
            {searchResults.length > 0 && (
              <ul className="mt-2 max-h-32 overflow-auto rounded-md border bg-popover p-1">
                {searchResults.map((result) => (
                  <li
                    key={result.id}
                    onClick={() => handleUserSelect(result)}
                    className="cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                  >
                    {result.username}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setIsSettingsOpen(true)} className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>User Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleSignOut} className="cursor-pointer text-red-500">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <UserSettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        setUser={setUser}
      />
    </>
  );
};

export default MobileMenu;