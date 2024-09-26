import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '../components/ui/input';
import { searchUsers } from '../supabaseClient';
import { User } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { debounce } from 'lodash';

const UserSearch = ({ onUserSelect, currentUserId, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);

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
    return () => debouncedSearch.cancel();
  }, [query]);

  const handleUserSelect = useCallback((selectedUser) => {
    onUserSelect(selectedUser);
    setIsOpen(false);
    setQuery('');
    setResults([]);
  }, [onUserSelect]);

  const handleOpenChange = (open) => {
    setIsOpen(open);
    if (!open) {
      setQuery('');
      setResults([]);
    }
  };

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <div className="p-2">
          <Input
            ref={inputRef}
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