import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { PlusCircle, Filter, Settings, Shield, User, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import UserSearch from './UserSearch';
import MobileMenu from '../features/restaurants/MobileMenu';
import logo from '../assets/favorant-logo.svg';

const Header = ({ user, setUser }) => {
  const navigate = useNavigate();

  const handleUserSelect = (selectedUser) => {
    navigate(`/profile/${selectedUser.id}`);
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    navigate('/auth');
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
          <Button onClick={() => navigate('/add')} size="sm" variant="outline">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New
          </Button>
          <Button onClick={() => navigate('/filter')} size="sm" variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
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
                  <p className="text-sm font-medium leading-none">{user.email}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.profile?.username || user.email}
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
          <MobileMenu
            onAddClick={() => navigate('/add')}
            onFilterClick={() => navigate('/filter')}
            onUserSelect={handleUserSelect}
            currentUserId={user.id}
            user={user}
            setUser={setUser}
            canAdd={true}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;