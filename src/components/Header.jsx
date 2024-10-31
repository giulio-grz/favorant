import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { PlusCircle, Filter, Settings, Shield, User } from 'lucide-react';
import UserMenu from './UserMenu';
import UserSearch from './UserSearch';
import MobileMenu from '../features/restaurants/MobileMenu';
import logo from '../assets/favorant-logo.svg';

const Header = ({ user, setUser }) => {
  const navigate = useNavigate();

  const handleUserSelect = (selectedUser) => {
    navigate(`/user/${selectedUser.id}`);
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
        <div className="hidden md:flex items-center space-x-4">
          <UserSearch onUserSelect={handleUserSelect} currentUserId={user.id}>
            <Button size="sm" variant="outline">
              Search Users
            </Button>
          </UserSearch>
          <Button onClick={() => navigate(`/user/${user.id}`)} size="sm" variant="outline">
            <User className="mr-2 h-4 w-4" />
            Profile
          </Button>
          <Button onClick={() => navigate('/add')} size="sm" variant="outline">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New
          </Button>
          <Button onClick={() => navigate('/filter')} size="sm" variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          {user.profile.is_admin && (
            <Button onClick={() => navigate('/admin')} size="sm" variant="outline">
              <Shield className="mr-2 h-4 w-4" />
              Admin
            </Button>
          )}
          <UserMenu user={user} setUser={setUser} />
        </div>
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