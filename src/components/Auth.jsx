import React, { useState } from 'react';
import { signUp, signIn } from '../supabaseClient';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';

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
        setUser(user);
      }
    } catch (error) {
      console.error("Auth error:", error);
      setError(error.message);
      // If it's a duplicate key error, it might mean the user already exists
      if (error.message.includes('duplicate key value')) {
        setError("An account with this email already exists. Try signing in instead.");
      }
    }
  };

  return (
    <Card className="w-[350px] mx-auto mt-10">
      <CardHeader>
        <CardTitle>{isSignUp ? 'Sign Up' : 'Sign In'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
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
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          )}
          <Button type="submit" className="w-full">
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <Button variant="link" onClick={() => setIsSignUp(!isSignUp)} className="w-full">
          {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
        </Button>
      </CardFooter>
      {error && <p className="text-red-500 text-center mt-2">{error}</p>}
    </Card>
  );
};

export default Auth;