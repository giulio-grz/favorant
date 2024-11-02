import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Star } from 'lucide-react';
import { supabase } from '@/supabaseClient';

const UserProfilePage = ({ currentUser }) => {
  const navigate = useNavigate();
  const { id: viewingUserId } = useParams();

  // State declarations
  const [viewedUser, setViewedUser] = useState(null);
  const [following, setFollowing] = useState(false);
  const [stats, setStats] = useState({
    visitedCount: 0,
    toTryCount: 0,
    followersCount: 0,
    followingCount: 0
  });
  const [followers, setFollowers] = useState([]);
  const [followingUsers, setFollowingUsers] = useState([]);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);

  const isOwnProfile = viewedUser?.id === currentUser?.id;

  const fetchRecentActivity = useCallback(async (userId) => {
    if (!userId) return;

    try {
      const { data: reviews } = await supabase
        .from('restaurant_reviews')
        .select(`
          *,
          restaurants (
            id,
            name,
            restaurant_types (name)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);

      const { data: bookmarks } = await supabase
        .from('bookmarks')
        .select(`
          *,
          restaurants (
            id,
            name,
            restaurant_types (name)
          )
        `)
        .eq('user_id', userId)
        .eq('type', 'to_try')
        .order('created_at', { ascending: false })
        .limit(3);

      const activities = [
        ...(reviews || []).map(review => ({
          type: 'review',
          date: review.created_at,
          data: review
        })),
        ...(bookmarks || []).map(bookmark => ({
          type: 'to_try',
          date: bookmark.created_at,
          data: bookmark
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

      setRecentActivity(activities);
    } catch (err) {
      console.error('Error fetching recent activity:', err);
    }
  }, []);

  const fetchUserData = useCallback(async () => {
    if (!viewingUserId || !currentUser) return;

    setLoading(true);
    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', viewingUserId)
        .single();

      if (profileError) throw profileError;
      setViewedUser(profile);

      // Fetch stats
      const [
        { count: visitedCount },
        { count: toTryCount },
        { count: followersCount },
        { count: followingCount }
      ] = await Promise.all([
        supabase
          .from('restaurant_reviews')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', viewingUserId),
        supabase
          .from('bookmarks')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', viewingUserId)
          .eq('type', 'to_try'),
        supabase
          .from('followers')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', viewingUserId),
        supabase
          .from('followers')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', viewingUserId)
      ]);

      setStats({
        visitedCount: visitedCount || 0,
        toTryCount: toTryCount || 0,
        followersCount: followersCount || 0,
        followingCount: followingCount || 0
      });

      // Fetch follow status and follow data
      if (!isOwnProfile) {
        const { data: followData } = await supabase
          .from('followers')
          .select('*')
          .eq('follower_id', currentUser.id)
          .eq('following_id', viewingUserId)
          .single();

        setFollowing(!!followData);
      }

      // Fetch followers and following
      const [{ data: followersData }, { data: followingData }] = await Promise.all([
        supabase
          .from('followers')
          .select(`
            follower:profiles!followers_follower_id_fkey(
              id,
              username,
              email
            )
          `)
          .eq('following_id', viewingUserId),
        supabase
          .from('followers')
          .select(`
            following:profiles!followers_following_id_fkey(
              id,
              username,
              email
            )
          `)
          .eq('follower_id', viewingUserId)
      ]);

      // Transform the data to get the actual profiles
      const transformedFollowers = (followersData || [])
        .map(item => item.follower)
        .filter(follower => follower.id !== currentUser.id); // Filter out current user

      const transformedFollowing = (followingData || [])
        .map(item => item.following)
        .filter(following => following.id !== currentUser.id); // Filter out current user

      setFollowers(transformedFollowers);
      setFollowingUsers(transformedFollowing);

      // Fetch recent activity
      await fetchRecentActivity(viewingUserId);

    } catch (err) {
      console.error('Error loading profile data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [viewingUserId, currentUser, isOwnProfile, fetchRecentActivity]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleFollow = async () => {
    if (!viewingUserId || !currentUser?.id || isOwnProfile) return;
    
    try {
      setLoading(true);
      
      if (following) {
        await supabase
          .from('followers')
          .delete()
          .match({
            follower_id: currentUser.id,
            following_id: viewingUserId
          });
        
        setStats(prev => ({
          ...prev,
          followersCount: Math.max(0, prev.followersCount - 1)
        }));
        setFollowing(false);
      } else {
        await supabase
          .from('followers')
          .insert({
            follower_id: currentUser.id,
            following_id: viewingUserId
          });
        
        setStats(prev => ({
          ...prev,
          followersCount: prev.followersCount + 1
        }));
        setFollowing(true);
      }
    } catch (err) {
      console.error('Error updating follow status:', err);
      setError('Failed to update follow status');
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (userId) => {
    navigate(`/profile/${userId}`);
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-xl">
              {viewedUser?.username?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-base font-semibold">{viewedUser?.username}</h1>
            <p className="text-xs text-muted-foreground">{viewedUser?.email}</p>
          </div>
        </div>

        <div className="sm:ml-auto">
          {!isOwnProfile && (
            <Button
              variant={following ? "outline" : "default"}
              size="sm"
              onClick={handleFollow}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {following ? 'Following' : 'Follow'}
            </Button>
          )}
        </div>
      </div>

      {/* Stats section */}
      <div className="grid grid-cols-4 gap-1 mb-6 bg-muted/50 rounded-lg p-2 text-center">
        <button 
          onClick={() => navigate(`/user/${viewingUserId}`, { state: { tab: 'visited' }})}
          className="px-2 py-1.5 hover:bg-accent rounded-md transition-colors"
        >
          <div className="text-sm font-semibold">{stats.visitedCount}</div>
          <div className="text-[10px] text-muted-foreground">Visited</div>
        </button>

        <button 
          onClick={() => navigate(`/user/${viewingUserId}`, { state: { tab: 'toTry' }})}
          className="px-2 py-1.5 hover:bg-accent rounded-md transition-colors"
        >
          <div className="text-sm font-semibold">{stats.toTryCount}</div>
          <div className="text-[10px] text-muted-foreground">To Try</div>
        </button>

        <button 
          onClick={() => setShowFollowers(true)}
          className="px-2 py-1.5 hover:bg-accent rounded-md transition-colors"
        >
          <div className="text-sm font-semibold">{stats.followersCount}</div>
          <div className="text-[10px] text-muted-foreground">Followers</div>
        </button>

        <button 
          onClick={() => setShowFollowing(true)}
          className="px-2 py-1.5 hover:bg-accent rounded-md transition-colors"
        >
          <div className="text-sm font-semibold">{stats.followingCount}</div>
          <div className="text-[10px] text-muted-foreground">Following</div>
        </button>
      </div>

      {/* Activity section */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div 
                  key={index}
                  onClick={() => navigate(`/user/${viewedUser.id}/restaurant/${activity.data.restaurant_id}`)}
                  className="flex items-center justify-between hover:bg-accent rounded-lg cursor-pointer p-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{activity.data.restaurants.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {activity.data.restaurants.restaurant_types?.name}
                    </div>
                  </div>
                  <div className="ml-2 flex-shrink-0">
                    {activity.type === 'review' ? (
                      <div className="flex items-center">
                        <Star className="h-3 w-3 text-yellow-400 fill-yellow-400 mr-1" />
                        <span className="text-xs">{activity.data.rating.toFixed(1)}</span>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">Want to try</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Followers Dialog */}
      <Dialog open={showFollowers} onOpenChange={setShowFollowers}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md w-full">
          <DialogHeader>
            <DialogTitle>Followers</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {followers.map((follower) => (
              <div
                key={follower.id}
                className="flex items-center justify-between p-3 hover:bg-accent rounded-md"
              >
                <div 
                  className="flex items-center gap-3 min-w-0 cursor-pointer"
                  onClick={() => {
                    setShowFollowers(false);
                    handleUserClick(follower.id);
                  }}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback>
                      {follower.username?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{follower.username}</span>
                </div>
                {!isOwnProfile && follower.id !== currentUser.id && (
                  <Button 
                    size="sm" 
                    onClick={async (e) => {
                      e.stopPropagation();
                      await handleFollow();
                    }}
                  >
                    Follow Back
                  </Button>
                )}
              </div>
            ))}
            {followers.length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                No followers yet
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Following Dialog */}
      <Dialog open={showFollowing} onOpenChange={setShowFollowing}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md w-full">
          <DialogHeader>
            <DialogTitle>Following</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {followingUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 hover:bg-accent rounded-md cursor-pointer"
                onClick={() => handleUserClick(user.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback>
                      {user.username?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{user.username}</span>
                </div>
              </div>
            ))}
            {followingUsers.length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                Not following anyone yet
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Error Alert Dialog */}
      <AlertDialog open={!!error} onOpenChange={() => setError(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error</AlertDialogTitle>
            <AlertDialogDescription>{error}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setError(null)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserProfilePage;