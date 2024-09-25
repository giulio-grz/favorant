import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { PlusCircle, Filter, Settings } from 'lucide-react';
import UserMenu from './UserMenu';
import UserSearch from './UserSearch';
import MobileMenu from '../features/restaurants/MobileMenu';

const Header = ({ user, setUser }) => {
  const navigate = useNavigate();

  const handleUserSelect = (selectedUser) => {
    navigate(`/user/${selectedUser.id}`);
  };

  return (
    <header className="bg-background mt-8 mb-8">
      <div className="max-w-full px-4 sm:px-6 lg:px-44 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-2xl font-bold">
            Favorants
          </Link>
        </div>
        <div className="hidden md:flex items-center space-x-4">
            <UserSearch onUserSelect={handleUserSelect} currentUserId={user.id} />
          <Button onClick={() => navigate('/add')} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Restaurant
          </Button>
          <Button onClick={() => navigate('/filter')} size="sm" variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button onClick={() => navigate('/settings')} size="sm" variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
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