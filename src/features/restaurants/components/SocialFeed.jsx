import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Star, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistance } from 'date-fns';
import { getRestaurantSocialFeed } from '@/supabaseClient';

const SocialFeed = ({ restaurantId, userId, wrapper }) => {
  const [socialData, setSocialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const loadSocialFeed = async () => {
      try {
        setLoading(true);
        const data = await getRestaurantSocialFeed(restaurantId, userId);
        setSocialData(data);
      } catch (err) {
        console.error('Error loading social feed:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadSocialFeed();
  }, [restaurantId, userId]);

  if (loading) {
    return null;
  }

  if (error) {
    return null;
  }

  if (!socialData) {
    return null;
  }

  const reviews = socialData.reviews || [];
  const notes = socialData.notes || [];

  if (reviews.length === 0 && notes.length === 0) {
    return null;
  }

  const allItems = [
    ...reviews.map(r => ({ ...r, type: 'review' })),
    ...notes.map(n => ({ ...n, type: 'note' }))
  ];

  if (allItems.length === 0) {
    return null;
  }

  // Group items by user
  const groupedItems = {};
  allItems.forEach(item => {
    if (!item.profiles?.username) return; // Skip items without valid user data
    
    const userId = item.user_id;
    if (!groupedItems[userId]) {
      groupedItems[userId] = {
        username: item.profiles.username,
        items: []
      };
    }
    groupedItems[userId].items.push({
      ...item,
      timestamp: new Date(item.created_at)
    });
  });

  // Sort items within each group
  Object.values(groupedItems).forEach(group => {
    group.items.sort((a, b) => b.timestamp - a.timestamp);
  });

  // Convert to array and sort by most recent activity
  const sortedGroups = Object.entries(groupedItems)
    .map(([userId, data]) => ({
      userId,
      username: data.username,
      items: data.items,
      mostRecent: Math.max(...data.items.map(item => item.timestamp))
    }))
    .sort((a, b) => b.mostRecent - a.mostRecent);

  if (sortedGroups.length === 0) {
    return null;
  }

  const displayGroups = isExpanded ? sortedGroups : sortedGroups.slice(0, 2);

  const content = sortedGroups.length > 0 ? (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">From people you follow</p>
        {sortedGroups.length > 2 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                Show less <ChevronUp className="ml-1 h-4 w-4" />
              </>
            ) : (
              <>
                Show more <ChevronDown className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {displayGroups.map((group) => (
          <div 
            key={group.userId} 
            className="bg-muted/50 rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {group.username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{group.username}</span>
            </div>
            
            <div className="space-y-3">
              {group.items.map((item) => (
                <div key={item.id} className="text-sm">
                  {item.type === 'review' ? (
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{item.rating.toFixed(1)}</span>
                      <span className="text-muted-foreground">
                        {formatDistance(item.timestamp, new Date(), { addSuffix: true })}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <p>{item.note}</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {formatDistance(item.timestamp, new Date(), { addSuffix: true })}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  return wrapper ? wrapper(content) : content;
};

export default SocialFeed;