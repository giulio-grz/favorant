import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, PenLine } from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import LoadingSpinner from '@/components/LoadingSpinner';
import { formatDistance } from 'date-fns';
import { getActivityFeed } from '@/supabaseClient';

const ActivityFeed = ({ user }) => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadActivityFeed = async () => {
      try {
        setLoading(true);
        const data = await getActivityFeed(user.id);
        setActivities(data);
      } catch (err) {
        console.error('Error loading activity feed:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadActivityFeed();
  }, [user.id]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 text-center">
        Error loading activity feed: {error}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Activity Feed</h1>
        <p className="text-muted-foreground mt-1">
          See what people you follow are up to
        </p>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="divide-y">
          {activities.map((activity) => (
            <div 
              key={`${activity.type}-${activity.id}`}
              className="py-4 first:pt-0 cursor-pointer hover:bg-accent/5 transition-colors"
              onClick={() => navigate(`/user/${activity.user_id}/restaurant/${activity.restaurant_id}`)}
            >
              {/* Header with Avatar and Username */}
              <div className="flex items-center gap-2 mb-3">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-sm">
                    {activity.username?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  {activity.username}
                </span>
                <span className="text-xs text-muted-foreground">
                  • {formatDistance(new Date(activity.created_at), new Date(), { addSuffix: true })}
                </span>
              </div>
            
              {/* Activity Content */}
              <div className="pl-9 space-y-1.5">
                {/* Restaurant Name */}
                <div className="font-medium leading-snug">{activity.restaurant_name}</div>
            
                {/* Type and City */}
                <div className="text-xs text-muted-foreground leading-tight">
                  {activity.restaurant_type && activity.city && (
                    <>
                      {activity.restaurant_type} • {activity.city}
                    </>
                  )}
                </div>
            
                {/* Activity-specific content */}
                {activity.type === 'review' && (
                  <div className="flex items-center gap-1.5 text-sm mt-2">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">{activity.rating.toFixed(1)}</span>
                  </div>
                )}
            
                {activity.type === 'bookmark' && (
                  <div className="mt-2">
                    <Badge 
                      variant="secondary" 
                      className="bg-emerald-50 text-emerald-700 font-normal text-xs"
                    >
                      Wants to try
                    </Badge>
                  </div>
                )}
            
            {activity.type === 'note' && activity.note && (
                  <div className="flex items-start gap-1.5 mt-2">
                    <PenLine className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      {activity.note}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {activities.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No activity yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Follow more people to see their activity here.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ActivityFeed;