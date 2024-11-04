import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin } from 'lucide-react';
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
    <div className="max-w-2xl mx-auto pb-20">
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
              className="py-6 first:pt-0 cursor-pointer hover:bg-accent/5 transition-colors"
              onClick={() => navigate(`/user/${activity.user_id}/restaurant/${activity.restaurant_id}`)}
            >
              {/* Header with Avatar and Timestamp */}
              <div className="flex items-center space-x-3 mb-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {activity.username?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">
                      {activity.username}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistance(new Date(activity.created_at), new Date(), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Activity Content */}
              <div className="pl-11 space-y-2">
                {/* Restaurant Name and Type for all activities */}
                <div className="flex items-center gap-2">
                  {activity.type === 'review' && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                  {activity.type === 'note' && <MapPin className="h-4 w-4" />}
                  <span className="font-medium">{activity.restaurant_name}</span>
                </div>

                {/* Activity-specific content */}
                {activity.type === 'review' && (
                  <div className="bg-muted/50 p-3 rounded-md text-sm flex items-center gap-2">
                    <span>Added review</span>
                    <Badge variant="secondary">
                      {activity.rating.toFixed(1)}
                    </Badge>
                  </div>
                )}

                {activity.type === 'bookmark' && (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                    Wants to try
                  </Badge>
                )}

                {activity.type === 'note' && activity.note && (
                  <div className="bg-muted/50 p-3 rounded-md text-sm">
                    {activity.note}
                  </div>
                )}

                {/* Restaurant Details */}
                <div className="text-xs text-muted-foreground">
                  {activity.restaurant_type && activity.city && (
                    <>
                      {activity.restaurant_type} • {activity.city}
                    </>
                  )}
                </div>
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