import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Users, ArrowLeft } from "lucide-react";
import { debounce } from 'lodash';
import { searchUsers, getFollowers, isFollowing, followUser, unfollowUser } from '@/supabaseClient';

const UserSearch = ({ user }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [followingStatus, setFollowingStatus] = useState({});

  const searchWithDebounce = useCallback(
    debounce(async (searchQuery) => {
      if (searchQuery.trim().length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const { data: searchData, error: searchError } = await searchUsers(searchQuery, user.id);
        if (searchError) throw searchError;

        const { data: followingData } = await getFollowers(user.id);
        const myFollowing = new Set((followingData || []).map(f => f.id));

        // Get following status for each user
        const followingStatuses = {};
        await Promise.all((searchData || []).map(async (searchedUser) => {
          const isFollowingUser = await isFollowing(user.id, searchedUser.id);
          followingStatuses[searchedUser.id] = isFollowingUser;
        }));
        setFollowingStatus(followingStatuses);

        const enhancedResults = await Promise.all((searchData || []).map(async (searchedUser) => {
          try {
            const { data: userFollowers } = await getFollowers(searchedUser.id);
            const mutualFollowers = (userFollowers || []).filter(f => myFollowing.has(f.id));
            
            return {
              ...searchedUser,
              mutualFollowersCount: mutualFollowers.length,
              totalFollowers: (userFollowers || []).length
            };
          } catch (error) {
            console.error('Error getting followers for user:', error);
            return {
              ...searchedUser,
              mutualFollowersCount: 0,
              totalFollowers: 0
            };
          }
        }));

        setResults(enhancedResults);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    [user.id]
  );

  const handleSearch = (value) => {
    setQuery(value);
    searchWithDebounce(value);
  };

  const handleUserClick = (userId) => {
    navigate(`/profile/${userId}`);
  };

  const handleFollowToggle = async (e, userId) => {
    e.stopPropagation();
    try {
      if (followingStatus[userId]) {
        await unfollowUser(user.id, userId);
      } else {
        await followUser(user.id, userId);
      }
      setFollowingStatus(prev => ({
        ...prev,
        [userId]: !prev[userId]
      }));
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background">
        {/* Back button row */}
        <div className="px-4 py-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
        {/* Search bar row */}
        <div className="px-4 pb-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search users..."
              className="pl-10 h-12 w-full"
              autoFocus
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="px-4 mt-4">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">
            Searching...
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-4">
            {results.map((searchedUser) => (
              <div
                key={searchedUser.id}
                onClick={() => handleUserClick(searchedUser.id)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/5 cursor-pointer transition-colors"
              >
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="text-base">
                    {searchedUser.username?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{searchedUser.username}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {searchedUser.email}
                  </div>
                  {searchedUser.mutualFollowersCount > 0 && (
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                      <Users className="h-3 w-3" />
                      {searchedUser.mutualFollowersCount} mutual followers
                    </div>
                  )}
                </div>
                {searchedUser.id !== user.id && (
                  <Button
                    variant={followingStatus[searchedUser.id] ? "outline" : "default"}
                    size="sm"
                    onClick={(e) => handleFollowToggle(e, searchedUser.id)}
                    className="shrink-0"
                  >
                    {followingStatus[searchedUser.id] ? 'Following' : 'Follow'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : query.length >= 2 ? (
          <div className="text-center text-muted-foreground py-8">
            No users found
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            Type at least 2 characters to search
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSearch;