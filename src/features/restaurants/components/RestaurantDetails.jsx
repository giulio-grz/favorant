import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../../../components/ui/dropdown-menu';
import { Edit, Trash2, MoreVertical, ArrowLeft, Star } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import LoadingSpinner from '../../../components/LoadingSpinner';

const RestaurantDetails = ({ user, updateLocalRestaurant, deleteLocalRestaurant }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRestaurant = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select(`*, restaurant_types(*), cities(*)`)
          .eq('id', id)
          .single();

        if (error) throw error;
        setRestaurant(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-center text-red-500">Error: {error}</div>;
  if (!restaurant) return <div className="text-center">Restaurant not found</div>;

  const isOwner = restaurant.user_id === user.id;

  const handleEdit = () => navigate(`/edit/${restaurant.id}`);
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this restaurant?')) {
      try {
        await deleteLocalRestaurant(restaurant.id);
        navigate('/');
      } catch (error) {
        alert('Failed to delete restaurant');
      }
    }
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const PriceDisplay = ({ price }) => (
    <span className="text-sm font-semibold">
      {[1, 2, 3].map((value) => (
        <span 
          key={value} 
          className={value <= price ? 'text-black' : 'text-gray-300'}
        >
          €
        </span>
      ))}
    </span>
  );

  const RatingStars = ({ rating }) => {
    const starCount = Math.round((rating / 10) * 5);
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, index) => (
          <Star
            key={index}
            className={`h-5 w-5 ${index < starCount ? "text-yellow-400 fill-current" : "text-gray-300"}`}
          />
        ))}
        <span className="ml-2 text-sm font-semibold">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-4 hover:bg-transparent p-0"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      <div className="bg-white p-6">
        <div className="flex items-center mb-4">
          <div className="h-16 w-16 bg-gray-200 rounded-md flex items-center justify-center text-2xl font-bold mr-4">
            {getInitials(restaurant.name)}
          </div>
          <div className="flex-grow">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{restaurant.name}</h2>
                <div className="flex items-center mt-1">
                  <PriceDisplay price={restaurant.price} />
                  {restaurant.to_try ? (
                    <Badge className="ml-2 bg-blue-100 text-blue-800">To Try</Badge>
                  ) : restaurant.rating ? (
                    <div className="ml-2">
                      <RatingStars rating={restaurant.rating} />
                    </div>
                  ) : (
                    <span className="ml-2 text-sm text-gray-500">No reviews</span>
                  )}
                </div>
              </div>
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleEdit}>
                      <Edit className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-md font-medium">🍽️ {restaurant.restaurant_types?.name}</p>
          <p className="text-sm text-gray-600">📍 {restaurant.cities?.name}</p>
        </div>
        {restaurant.notes && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Notes</h3>
            <p className="text-gray-700 bg-gray-50 p-3 rounded-md">{restaurant.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantDetails;