import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { searchUsers } from '../supabaseClient';
import { Search, User } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

const UserSearch = ({ onUserSelect, currentUserId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const searchRef = useRef(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query) {
        handleSearch();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSearch = async () => {
    if (query.trim()) {
      try {
        const { data } = await searchUsers(query, currentUserId);
        setResults(data || []);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      }
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon">
          <Search className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <div className="p-2">
          <Input
            type="text"
            placeholder="Search users..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full"
          />
        </div>
        {results.length > 0 && (
          <ul className="max-h-48 overflow-auto">
            {results.map((user) => (
              <li
                key={user.id}
                className="cursor-pointer flex items-center p-2 hover:bg-gray-100"
                onClick={() => {
                  onUserSelect(user);
                  setIsOpen(false);
                  setQuery('');
                  setResults([]);
                }}
              >
                <User className="mr-2 h-4 w-4" />
                {user.username}
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default UserSearch;