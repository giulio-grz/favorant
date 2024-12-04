import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { PlusCircle, Filter, Settings, Shield, User, LogOut, Users, Search, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { supabase, signOut, getPendingCounts } from '../supabaseClient';
import logo from '../assets/Kravemark-logo-full.svg';

const Header = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    let channel;
      
    const loadPendingCounts = async () => {
      if (user?.profile?.is_admin && mounted) {
        try {
          const counts = await getPendingCounts();
          if (mounted) {
            setPendingCount(counts.total);
          }
        } catch (error) {
          console.error('Error loading pending counts:', error);
        }
      }
    };
  
    if (user?.profile?.is_admin) {
      loadPendingCounts();
      
      channel = supabase
        .channel('db-changes')
        // Listen for new pending items
        .on(
          'postgres_changes',
          { 
            event: 'INSERT',
            schema: 'public',
            table: 'restaurants',
            filter: 'status=eq.pending'
          },
          (payload) => {
            loadPendingCounts();
          }
        )
        // Listen for ANY update/delete of restaurants
        .on(
          'postgres_changes',
          { 
            event: 'UPDATE',
            schema: 'public',
            table: 'restaurants'
          },
          (payload) => {
            loadPendingCounts();
          }
        )
        .on(
          'postgres_changes',
          { 
            event: 'DELETE',
            schema: 'public',
            table: 'restaurants'
          },
          (payload) => {
            loadPendingCounts();
          }
        )
        // Same pattern for cities
        .on(
          'postgres_changes',
          { 
            event: 'INSERT',
            schema: 'public',
            table: 'cities',
            filter: 'status=eq.pending'
          },
          (payload) => {
            loadPendingCounts();
          }
        )
        .on(
          'postgres_changes',
          { 
            event: 'UPDATE',
            schema: 'public',
            table: 'cities'
          },
          (payload) => {
            loadPendingCounts();
          }
        )
        .on(
          'postgres_changes',
          { 
            event: 'DELETE',
            schema: 'public',
            table: 'cities'
          },
          (payload) => {
            loadPendingCounts();
          }
        )
        // And types
        .on(
          'postgres_changes',
          { 
            event: 'INSERT',
            schema: 'public',
            table: 'restaurant_types',
            filter: 'status=eq.pending'
          },
          (payload) => {
            loadPendingCounts();
          }
        )
        .on(
          'postgres_changes',
          { 
            event: 'UPDATE',
            schema: 'public',
            table: 'restaurant_types'
          },
          (payload) => {
            loadPendingCounts();
          }
        )
        .on(
          'postgres_changes',
          { 
            event: 'DELETE',
            schema: 'public',
            table: 'restaurant_types'
          },
          (payload) => {
            loadPendingCounts();
          }
        )
        .subscribe((status) => {
        });
    }
  
    return () => {
      mounted = false;
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [user?.profile?.is_admin]);

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    navigate('/auth');
  };

  return (
    <header className="bg-background pt-3 pb-3 mb-8 border-b">
      <div className="max-w-full px-[5vw] sm:px-[10vw] lg:px-[16vw] py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/" className="flex items-center">
            <img 
              src={logo} 
              alt="Kravemark Logo" 
              className="h-6 w-auto"
            />
          </Link>
        </div>
        
        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-4">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => navigate('/search')}
          >
            <Search className="mr-2 h-4 w-4" />
            Search Users
          </Button>
          <Button onClick={() => navigate('/feed')} size="sm" variant="outline">
            <Users className="mr-2 h-4 w-4" />
            Activity
          </Button>
          {user?.profile?.is_admin && (
            <div className="relative">
              <Button onClick={() => navigate('/admin')} size="sm" variant="outline">
                <Shield className="mr-2 h-4 w-4" />
                Admin
              </Button>
              {pendingCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user.profile?.username || user.email}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate(`/profile/${user.id}`)}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] p-0">
              <div className="flex flex-col h-full pt-14">
                <div className="px-4 pb-6 border-b">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-sm font-medium">{(user.profile?.username || user.email)[0].toUpperCase()}</span>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.profile?.username || user.email}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </div>
                <nav className="flex-grow overflow-y-auto">
                  <ul className="space-y-2 p-4">
                    <li>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start" 
                        onClick={() => {
                          navigate('/search');
                          setIsSheetOpen(false);
                        }}
                      >
                        <Search className="mr-2 h-4 w-4" />
                        Search Users
                      </Button>
                    </li>
                    <li>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start" 
                        onClick={() => {
                          navigate('/feed');
                          setIsSheetOpen(false);
                        }}
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Activity Feed
                      </Button>
                    </li>
                    <li>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start" 
                        onClick={() => {
                          navigate(`/profile/${user.id}`);
                          setIsSheetOpen(false);
                        }}
                      >
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Button>
                    </li>
                    <li>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start" 
                        onClick={() => {
                          navigate('/settings');
                          setIsSheetOpen(false);
                        }}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Button>
                    </li>
                    {user?.profile?.is_admin && (
                      <li>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start relative" 
                          onClick={() => {
                            navigate('/admin');
                            setIsSheetOpen(false);
                          }}
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Admin
                          {pendingCount > 0 && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                              {pendingCount}
                            </span>
                          )}
                        </Button>
                      </li>
                    )}
                  </ul>
                </nav>
                <div className="p-4 border-t">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-red-500 hover:text-red-500"
                    onClick={() => {
                      handleSignOut();
                      setIsSheetOpen(false);
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;