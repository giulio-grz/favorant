import React, { useState, useEffect } from 'react';
import { signUp, signIn, resetPassword } from '../supabaseClient';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { AlertDialog, AlertDialogContent, AlertDialogDescription } from './ui/alert-dialog';
import { CheckCircle2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import logo from '../assets/Kravemark-logo.svg';

const Auth = ({ setUser }) => {
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerificationAlert, setShowVerificationAlert] = useState(false);
  const [showResetAlert, setShowResetAlert] = useState(false);

  // Check for password reset flag in URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('reset') === 'true') {
      setShowResetAlert(true);
    }
  }, [location]);

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

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await resetPassword(email);
      setShowVerificationAlert(true);
      setIsForgotPassword(false);
    } catch (error) {
      console.error("Password reset error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    resetForm();
    setShowVerificationAlert(false);
    setIsForgotPassword(false);
  };

  if (isForgotPassword) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center">
            <img 
              src={logo} 
              alt="Kravemark Logo" 
              className="h-8 w-auto mb-8"
            />
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              Reset Password
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your email address and we'll send you a reset link
            </p>
          </div>

          <form onSubmit={handlePasswordReset} className="mt-8 space-y-6">
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
            </div>

            <Button 
              type="submit" 
              className="w-full h-11"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>

            <div className="text-center">
              <Button 
                variant="link" 
                onClick={() => setIsForgotPassword(false)}
                className="text-sm"
                disabled={loading}
              >
                Back to Sign In
              </Button>
            </div>
          </form>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md text-center">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <img 
            src={logo} 
            alt="Kravemark Logo" 
            className="h-8 w-auto mb-8"
          />

          {showVerificationAlert && (
            <AlertDialog open={showVerificationAlert} onOpenChange={setShowVerificationAlert}>
              <AlertDialogContent className="bg-emerald-50 border-emerald-200">
                <div className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertDialogDescription className="text-emerald-600 ml-2">
                    {isSignUp ? 
                      "Please check your email to verify your account." :
                      "Please check your email for password reset instructions."
                    }
                  </AlertDialogDescription>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {showResetAlert && (
            <AlertDialog open={showResetAlert} onOpenChange={setShowResetAlert}>
              <AlertDialogContent className="bg-emerald-50 border-emerald-200">
                <div className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertDialogDescription className="text-emerald-600 ml-2">
                    You can now sign in with your new password.
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
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
                {!isSignUp && (
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 h-auto font-normal text-sm text-muted-foreground"
                    onClick={() => setIsForgotPassword(true)}
                    disabled={loading}
                  >
                    Forgot Password?
                  </Button>
                )}
              </div>
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