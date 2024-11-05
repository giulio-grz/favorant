import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { updateProfile, updatePassword } from '../../supabaseClient';
import { ArrowLeft } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const UserSettings = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState(user.profile?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

  const handleUsernameChange = async () => {
    try {
      setLoading(true);
      await updateProfile(user.id, { username });
      setUser(prevUser => ({
        ...prevUser,
        profile: { ...prevUser.profile, username }
      }));
      setAlert({
        show: true,
        message: 'Username updated successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Error updating username:', error);
      setAlert({
        show: true,
        message: 'Failed to update username',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    try {
      setLoading(true);

      if (newPassword !== confirmPassword) {
        setAlert({
          show: true,
          message: 'New passwords do not match',
          type: 'error'
        });
        return;
      }

      if (newPassword.length < 6) {
        setAlert({
          show: true,
          message: 'Password must be at least 6 characters',
          type: 'error'
        });
        return;
      }

      await updatePassword(currentPassword, newPassword);
      
      setAlert({
        show: true,
        message: 'Password updated successfully',
        type: 'success'
      });
      
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
    } catch (error) {
      console.error('Error updating password:', error);
      setAlert({
        show: true,
        message: error.message || 'Failed to update password',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="flex items-center"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
      
      <Tabs defaultValue="username" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="username">Username</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>
        
        <TabsContent value="username">
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button 
              onClick={handleUsernameChange}
              disabled={loading || !username.trim() || username === user.profile?.username}
            >
              {loading ? 'Updating...' : 'Update Username'}
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="password">
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button 
              onClick={handlePasswordChange}
              disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={alert.show} onOpenChange={() => setAlert({ ...alert, show: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {alert.type === 'error' ? 'Error' : 'Success'}
            </AlertDialogTitle>
            <AlertDialogDescription>{alert.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlert({ ...alert, show: false })}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserSettings;