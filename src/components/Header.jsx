// src/components/Header.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { PlusCircle, Filter, Settings, Shield, User, LogOut, Activity, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import UserSearch from './UserSearch';
import { signOut } from '../supabaseClient';
import logo from '../assets/favorant-logo.svg';

const Header = ({ user, setUser }) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    navigate('/auth');
  };

  const handleUserSelect = (selectedUser) => {
    navigate(`/profile/${selectedUser.id}`);
    // Close sheet if it's open
    const sheetCloseButton = document.querySelector('[data-radix-collection-item]');
    if (sheetCloseButton) sheetCloseButton.click();
  };

  return (
    <header className="bg-background pt-3 pb-3 mb-4">
      <div className="max-w-full px-[5vw] sm:px-[10vw] lg:px-[16vw] py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/" className="flex items-center">
            <img 
              src={logo} 
              alt="Favorant Logo" 
              className="h-8 w-auto"
            />
          </Link>
        </div>
        
        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-4">
          <UserSearch onUserSelect={handleUserSelect} currentUserId={user.id}>
            <Button size="sm" variant="outline">
              Search Users
            </Button>
          </UserSearch>
          <Button onClick={() => navigate('/feed')} size="sm" variant="outline">
            <Activity className="mr-2 h-4 w-4" />
            Activity
          </Button>
          {user?.profile?.is_admin && (
            <Button onClick={() => navigate('/admin')} size="sm" variant="outline">
              <Shield className="mr-2 h-4 w-4" />
              Admin
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatars/01.png" alt={user.email} />
                  <AvatarFallback>{user.email[0].toUpperCase()}</AvatarFallback>
                </Avatar>
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
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" className="p-0">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatars/01.png" alt={user.email} />
                  <AvatarFallback>{user.email[0].toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] p-0">
              <div className="flex flex-col h-full pt-14">
                <div className="px-4 pb-4 border-b space-y-4">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.profile?.username || user.email}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <UserSearch 
                    onUserSelect={handleUserSelect} 
                    currentUserId={user.id}
                  >
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                      size="sm"
                    >
                      <Search className="mr-2 h-4 w-4" />
                      Search Users
                    </Button>
                  </UserSearch>
                </div>
                <nav className="flex-grow overflow-y-auto">
                  <ul className="space-y-2 p-4">
                    <li>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start" 
                        onClick={() => navigate('/feed')}
                      >
                        <Activity className="mr-2 h-4 w-4" />
                        Activity Feed
                      </Button>
                    </li>
                    <li>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start" 
                        onClick={() => navigate(`/profile/${user.id}`)}
                      >
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Button>
                    </li>
                    <li>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start" 
                        onClick={() => navigate('/settings')}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Button>
                    </li>
                    {user?.profile?.is_admin && (
                      <li>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start" 
                          onClick={() => navigate('/admin')}
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Admin
                        </Button>
                      </li>
                    )}
                  </ul>
                </nav>
                <div className="p-4 border-t">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-red-500 hover:text-red-500"
                    onClick={handleSignOut}
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