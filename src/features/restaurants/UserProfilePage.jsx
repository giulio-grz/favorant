import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { Settings, Star } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { 
  followUser, 
  unfollowUser, 
  getFollowers, 
  getFollowing, 
  isFollowing,
  getUserStats 
} from '@/supabaseClient';

const UserProfilePage = ({ currentUser }) => {
  const navigate = useNavigate();
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);

  const isOwnProfile = viewedUser?.id === currentUser.id;

  // Fetch recent activity
  const fetchRecentActivity = async (userId) => {
    try {
      // Get the 5 most recent reviews and notes
      const [reviewsResponse, notesResponse] = await Promise.all([
        supabase
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
          .limit(3),

        supabase
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
          .limit(3)
      ]);

      if (reviewsResponse.error) throw reviewsResponse.error;
      if (notesResponse.error) throw notesResponse.error;

      // Combine and sort activities
      const activities = [
        ...(reviewsResponse.data || []).map(review => ({
          type: 'review',
          date: review.created_at,
          data: review
        })),
        ...(notesResponse.data || []).map(bookmark => ({
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
  };

  useEffect(() => {
    const userId = window.location.pathname.split('/profile/')[1];
    const loadUserData = async () => {
      try {
        setLoading(true);
        // Get user profile from your existing profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError) throw profileError;
        setViewedUser(profile);

        const stats = await getUserStats(userId);
        setStats(stats);

        if (!isOwnProfile) {
          const followStatus = await isFollowing(currentUser.id, userId);
          setFollowing(followStatus);
        }

        const [followersData, followingData] = await Promise.all([
          getFollowers(userId),
          getFollowing(userId)
        ]);

        setFollowers(followersData);
        setFollowingUsers(followingData);

        // Fetch recent activity
        await fetchRecentActivity(userId);
      } catch (err) {
        console.error('Error loading profile data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [currentUser.id]);

  const handleFollow = async () => {
    if (!viewedUser) return;
    
    try {
      setLoading(true);
      
      if (following) {
        await unfollowUser(currentUser.id, viewedUser.id);
        setStats(prev => ({ ...prev, followersCount: prev.followersCount - 1 }));
      } else {
        await followUser(currentUser.id, viewedUser.id);
        setStats(prev => ({ ...prev, followersCount: prev.followersCount + 1 }));
      }
      
      setFollowing(!following);
    } catch (err) {
      console.error('Error following/unfollowing:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (userId) => {
    setShowFollowers(false);
    setShowFollowing(false);
    navigate(`/profile/${userId}`);
  };

  const navigateToList = (filter) => {
    if (filter === 'visited') {
      navigate(`/user/${viewedUser.id}`, { state: { tab: 'visited' } });
    } else if (filter === 'to-try') {
      navigate(`/user/${viewedUser.id}`, { state: { tab: 'toTry' } });
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!viewedUser) return <div className="p-8 text-center">User not found</div>;

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Avatar className="h-24 w-24">
            <AvatarFallback className="text-4xl">
              {viewedUser.username?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold mb-1">{viewedUser.username}</h1>
            <p className="text-muted-foreground">{viewedUser.email}</p>
          </div>
        </div>

        {isOwnProfile ? (
          <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        ) : (
          <Button
            variant={following ? "outline" : "default"}
            size="sm"
            onClick={handleFollow}
            disabled={loading}
          >
            {following ? 'Following' : 'Follow'}
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8 text-center">
        <button 
          onClick={() => navigateToList('visited')}
          className="p-4 hover:bg-accent rounded-lg transition-colors"
        >
          <div className="text-2xl font-semibold">{stats.visitedCount}</div>
          <div className="text-sm text-muted-foreground">Visited</div>
        </button>

        <button 
          onClick={() => navigateToList('to-try')}
          className="p-4 hover:bg-accent rounded-lg transition-colors"
        >
          <div className="text-2xl font-semibold">{stats.toTryCount}</div>
          <div className="text-sm text-muted-foreground">To Try</div>
        </button>

        <button 
          onClick={() => setShowFollowers(true)}
          className="p-4 hover:bg-accent rounded-lg transition-colors"
        >
          <div className="text-2xl font-semibold">{stats.followersCount}</div>
          <div className="text-sm text-muted-foreground">Followers</div>
        </button>

        <button 
          onClick={() => setShowFollowing(true)}
          className="p-4 hover:bg-accent rounded-lg transition-colors"
        >
          <div className="text-2xl font-semibold">{stats.followingCount}</div>
          <div className="text-sm text-muted-foreground">Following</div>
        </button>
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div 
                key={index}
                onClick={() => navigate(`/user/${viewedUser.id}/restaurant/${activity.data.restaurant_id}`)}
                className="flex items-center justify-between p-2 hover:bg-accent rounded-lg cursor-pointer"
              >
                <div>
                  <div className="font-medium">{activity.data.restaurants.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {activity.data.restaurants.restaurant_types?.name}
                  </div>
                </div>
                {activity.type === 'review' ? (
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 mr-1" />
                    <span>{activity.data.rating.toFixed(1)}</span>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Want to try</div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <Dialog open={showFollowers} onOpenChange={setShowFollowers}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Followers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {followers.map((follower) => (
              <div
                key={follower.id}
                className="flex items-center justify-between p-2 hover:bg-accent rounded-md cursor-pointer"
                onClick={() => handleUserClick(follower.id)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {follower.username?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span>{follower.username}</span>
                </div>
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

      <Dialog open={showFollowing} onOpenChange={setShowFollowing}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Following</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {followingUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-2 hover:bg-accent rounded-md cursor-pointer"
                onClick={() => handleUserClick(user.id)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {user.username?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span>{user.username}</span>
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

      {/* Error Alert */}
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