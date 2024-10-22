import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '../components/ui/input';
import { searchUsers } from '../supabaseClient';
import { User } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { debounce } from 'lodash';
import LoadingSpinner from './LoadingSpinner';

const UserSearch = ({ onUserSelect, currentUserId, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const debouncedSearch = useCallback(
    debounce(async (searchQuery) => {
      if (searchQuery.trim()) {
        setLoading(true);
        try {
          const { data, error } = await searchUsers(searchQuery, currentUserId);
          if (error) throw error;
          setResults(data || []);
        } catch (error) {
          console.error('Search error:', error);
          setResults([]);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
      }
    }, 300),
    [currentUserId]
  );

  useEffect(() => {
    debouncedSearch(query);
    return () => debouncedSearch.cancel();
  }, [query, debouncedSearch]);

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
      <PopoverContent className="w-64 p-0" align="end">
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
        {loading ? (
          <div className="py-2 px-4 text-center">
            <div className="w-4 h-4 mx-auto">
              <LoadingSpinner size="sm" />
            </div>
          </div>
        ) : results.length > 0 ? (
          <ul className="max-h-48 overflow-auto">
            {results.map((user) => (
              <li
                key={user.id}
                className="cursor-pointer flex items-center p-2 hover:bg-accent hover:text-accent-foreground"
                onClick={() => handleUserSelect(user)}
              >
                <User className="mr-2 h-4 w-4" />
                <span>{user.username || user.email}</span>
              </li>
            ))}
          </ul>
        ) : query.length > 0 && (
          <div className="py-2 px-4 text-sm text-muted-foreground text-center">
            No users found
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default UserSearch;