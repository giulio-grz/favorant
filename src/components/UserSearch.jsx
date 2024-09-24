import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { searchUsers } from '../supabaseClient';
import { Search, User } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { debounce } from 'lodash'; // Make sure to install lodash

const UserSearch = ({ onUserSelect, currentUserId }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const debouncedSearch = useRef(
    debounce(async (searchQuery) => {
      if (searchQuery.trim()) {
        try {
          const { data } = await searchUsers(searchQuery, currentUserId);
          setResults(data || []);
        } catch (error) {
          console.error('Search error:', error);
          setResults([]);
        }
      } else {
        setResults([]);
      }
    }, 300)
  ).current;

  useEffect(() => {
    debouncedSearch(query);
    return () => {
      debouncedSearch.cancel();
    };
  }, [query, debouncedSearch]);

  const handleUserSelect = useCallback((selectedUser) => {
    onUserSelect(selectedUser);
    setIsOpen(false);
    setQuery('');
    setResults([]);
  }, [onUserSelect]);

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
              onClick={() => handleUserSelect(user)}
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