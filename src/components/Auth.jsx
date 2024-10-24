import React, { useState } from 'react';
import { signUp, signIn } from '../supabaseClient';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';

/**
 * Auth Component
 * 
 * This component handles user authentication, including both sign-up and sign-in functionality.
 * It provides a full-page layout that's consistent with shadcn UI styling principles.
 * 
 * @param {Object} props
 * @param {Function} props.setUser - Function to update the user state in the parent component
 */
const Auth = ({ setUser }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isSignUp) {
        console.log("Attempting sign up...");
        const { user, error } = await signUp(email, password, username);
        if (error) throw error;
        console.log("Sign up successful:", user);
        setUser(user);
      } else {
        console.log("Attempting sign in...");
        const { user, error } = await signIn(email, password);
        if (error) throw error;
        console.log("Sign in successful:", user);
        // Make sure profile is attached
        if (!user.profile) {
          console.log("No profile found, fetching...");
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          user.profile = profile;
        }
        setUser(user);
      }
    } catch (error) {
      console.error("Auth error:", error);
      setError(error.message);
      if (error.message.includes('duplicate key value')) {
        setError("An account with this email already exists. Try signing in instead.");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight">
            {isSignUp ? 'Create an Account' : 'Sign In'}
          </h2>
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
                />
              </div>
            )}
          </div>

          <Button type="submit" className="w-full">
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </Button>
        </form>

        <div className="text-center">
          <Button 
            variant="link" 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm"
          >
            {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive text-center mt-4">{error}</p>
        )}
      </div>
    </div>
  );
};

export default Auth;