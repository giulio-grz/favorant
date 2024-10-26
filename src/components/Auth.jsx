import React, { useState } from 'react';
import { signUp, signIn } from '../supabaseClient';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { AlertDialog, AlertDialogContent, AlertDialogDescription } from './ui/alert-dialog';
import { CheckCircle2 } from 'lucide-react';
import logo from '../assets/favorant-logo.svg';

const Auth = ({ setUser }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerificationAlert, setShowVerificationAlert] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setUsername('');
    setError('');
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setShowVerificationAlert(false);

    try {
      if (isSignUp) {
        console.log("Attempting sign up...");
        const { message } = await signUp(email, password, username);
        setShowVerificationAlert(true);
        resetForm();
      } else {
        console.log("Attempting sign in...");
        const { user, error: signInError } = await signIn(email, password);
        
        if (signInError) throw signInError;
        
        if (user) {
          console.log("Sign in successful:", user);
          setUser(user);
        } else {
          throw new Error('Sign in failed');
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
      if (error.message.includes('Email not confirmed')) {
        setError("Please verify your email address before signing in.");
        setShowVerificationAlert(true);
      } else if (error.message.includes('Invalid login credentials')) {
        setError("Invalid email or password.");
      } else if (error.message.includes('duplicate key value')) {
        setError("An account with this email already exists. Try signing in instead.");
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    resetForm();
    setShowVerificationAlert(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <img 
            src={logo} 
            alt="Favorant Logo" 
            className="h-8 w-auto mb-8"
          />

          {showVerificationAlert && (
            <AlertDialog open={showVerificationAlert} onOpenChange={setShowVerificationAlert}>
              <AlertDialogContent className="bg-emerald-50 border-emerald-200">
                <div className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertDialogDescription className="text-emerald-600 ml-2">
                    Please check your email to verify your account.
                  </AlertDialogDescription>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            {isSignUp ? 'Create an Account' : 'Welcome Back'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSignUp 
              ? 'Sign up to start managing your restaurant lists' 
              : 'Please sign in to your account'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="h-11"
              />
            </div>
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11"
                />
              </div>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full h-11"
            disabled={loading}
          >
            {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </Button>
        </form>

        <div className="text-center">
          <Button 
            variant="link" 
            onClick={toggleMode}
            className="text-sm"
            disabled={loading}
          >
            {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
          </Button>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;