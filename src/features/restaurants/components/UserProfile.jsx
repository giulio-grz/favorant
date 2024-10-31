import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { User, Settings } from 'lucide-react';
import { 
  followUser, 
  unfollowUser, 
  getFollowers, 
  getFollowing, 
  isFollowing 
} from '@/supabaseClient';

const UserProfile = ({ viewedUser, currentUser }) => {
  const navigate = useNavigate();
  const [following, setFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followers, setFollowers] = useState([]);
  const [followingUsers, setFollowingUsers] = useState([]);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isOwnProfile = currentUser.id === viewedUser.id;

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        setLoading(true);
        
        if (!isOwnProfile) {
          const followStatus = await isFollowing(currentUser.id, viewedUser.id);
          setFollowing(followStatus);
        }

        const [followersData, followingData] = await Promise.all([
          getFollowers(viewedUser.id),
          getFollowing(viewedUser.id)
        ]);

        setFollowers(followersData);
        setFollowingUsers(followingData);
        setFollowersCount(followersData.length);
        setFollowingCount(followingData.length);
      } catch (err) {
        console.error('Error loading profile data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [viewedUser.id, currentUser.id, isOwnProfile]);

  const handleFollow = async () => {
    try {
      setLoading(true);
      
      if (following) {
        await unfollowUser(currentUser.id, viewedUser.id);
        setFollowersCount(prev => prev - 1);
      } else {
        await followUser(currentUser.id, viewedUser.id);
        setFollowersCount(prev => prev + 1);
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
    navigate(`/user/${userId}`);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-slate-100 text-slate-500 text-xl">
              {viewedUser.username?.substring(0, 2).toUpperCase() || <User className="h-8 w-8" />}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold">{viewedUser.username}</h2>
            <p className="text-muted-foreground">{viewedUser.email}</p>
          </div>
        </div>
        {isOwnProfile ? (
          <Button 
            variant="outline" 
            onClick={() => navigate('/settings')}
          >
            <Settings className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        ) : (
          <Button 
            onClick={handleFollow}
            disabled={loading}
            variant={following ? "outline" : "default"}
          >
            {following ? 'Unfollow' : 'Follow'}
          </Button>
        )}
      </div>

      <div className="flex gap-6 mb-6 border-b pb-6">
        <Button
          variant="ghost"
          className="flex flex-col items-center hover:bg-transparent"
          onClick={() => setShowFollowers(true)}
        >
          <span className="text-lg font-semibold">{followersCount}</span>
          <span className="text-sm text-muted-foreground">Followers</span>
        </Button>
        <Button
          variant="ghost"
          className="flex flex-col items-center hover:bg-transparent"
          onClick={() => setShowFollowing(true)}
        >
          <span className="text-lg font-semibold">{followingCount}</span>
          <span className="text-sm text-muted-foreground">Following</span>
        </Button>
      </div>

      {/* Followers Dialog */}
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

      {/* Following Dialog */}
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
    </>
  );
};

export default UserProfile;