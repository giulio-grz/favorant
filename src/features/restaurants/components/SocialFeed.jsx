import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Star, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistance } from 'date-fns';
import { getRestaurantSocialFeed } from '@/supabaseClient';

const SocialFeed = ({ restaurantId, userId }) => {
  const [socialData, setSocialData] = useState({ reviews: [], notes: [] });
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

  if (loading || error) return null;

  // Group items by user and combine their reviews and notes
  const groupedItems = {};
  [...socialData.reviews, ...socialData.notes].forEach(item => {
    const userId = item.user_id;
    if (!groupedItems[userId]) {
      groupedItems[userId] = {
        username: item.profiles.username,
        review: null,
        note: null,
        latestTimestamp: new Date(item.created_at)
      };
    }

    const timestamp = new Date(item.created_at);
    if (timestamp > groupedItems[userId].latestTimestamp) {
      groupedItems[userId].latestTimestamp = timestamp;
    }

    if ('rating' in item) {
      groupedItems[userId].review = {
        ...item,
        timestamp: new Date(item.created_at)
      };
    } else {
      groupedItems[userId].note = {
        ...item,
        timestamp: new Date(item.created_at)
      };
    }
  });

  // Convert to array and sort by most recent activity
  const sortedGroups = Object.entries(groupedItems)
    .map(([userId, data]) => ({
      userId,
      username: data.username,
      review: data.review,
      note: data.note,
      latestTimestamp: data.latestTimestamp
    }))
    .sort((a, b) => b.latestTimestamp - a.latestTimestamp);

  if (sortedGroups.length === 0) return null;

  const displayGroups = isExpanded ? sortedGroups : sortedGroups.slice(0, 2);

  return (
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
            className="bg-muted/50 rounded-lg p-4 space-y-3"
          >
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {group.username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{group.username}</span>
            </div>
            
            <div className="space-y-2">
              {group.review && (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium">{group.review.rating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatDistance(group.review.timestamp, new Date(), { addSuffix: true })}
                  </span>
                </div>
              )}
              
              {group.note && (
                <div className="text-sm">
                  <p>{group.note.note}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {formatDistance(group.note.timestamp, new Date(), { addSuffix: true })}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SocialFeed;