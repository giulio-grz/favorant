import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/sheet';
import { Menu, PlusCircle, Filter, Settings, LogOut } from 'lucide-react';
import { searchUsers, signOut } from '../../supabaseClient';

const MobileMenu = ({ onAddClick, onFilterClick, onUserSelect, currentUserId, user, setUser, canAdd }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = async (query) => {
    if (query.trim()) {
      const { data } = await searchUsers(query, currentUserId);
      setSearchResults(data || []);
    } else {
      setSearchResults([]);
    }
  };

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
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[400px] p-0">
        <div className="flex flex-col h-full pt-14">
          <div className="px-4 pb-4">
            <Input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearch(e.target.value);
              }}
            />
          </div>
          {searchResults.length > 0 && (
            <ul className="px-4 py-2 space-y-2 border-t border-b max-h-[200px] overflow-y-auto">
              {searchResults.map((result) => (
                <li
                  key={result.id}
                  className="flex items-center cursor-pointer py-2 hover:bg-accent hover:text-accent-foreground"
                  onClick={() => handleUserSelect(result)}
                >
                  {result.username}
                </li>
              ))}
            </ul>
          )}
          <nav className="flex-grow overflow-y-auto">
            <ul className="space-y-4 p-4">
              {canAdd && (
                <li>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => { onAddClick(); setIsOpen(false); }}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Restaurant
                  </Button>
                </li>
              )}
              <li>
                <Button variant="ghost" className="w-full justify-start" onClick={() => { onFilterClick(); setIsOpen(false); }}>
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
              </li>
              <li>
                <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate('/settings'); setIsOpen(false); }}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </li>
            </ul>
          </nav>
          <div className="p-4 border-t">
            <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenu;