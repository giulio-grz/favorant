import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardContent, CardFooter } from '../../../components/ui/card';
import { Edit, Trash2, MapPin, UtensilsCrossed, ClipboardCheck, Star, Euro } from 'lucide-react';

/**
 * RestaurantDetails component
 * Displays detailed information about a single restaurant
 */
const RestaurantDetails = ({ restaurants, onEdit, onDelete, currentUserId }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const restaurant = restaurants.find(r => r.id.toString() === id);

  if (!restaurant) {
    return <div>Restaurant not found</div>;
  }

  const PriceDisplay = ({ price }) => (
    <div className="inline-flex">
      <span className="text-black">€</span>
      <span className={price >= 2 ? "text-black" : "text-gray-300"}>€</span>
      <span className={price >= 3 ? "text-black" : "text-gray-300"}>€</span>
    </div>
  );

  const RatingStars = ({ rating }) => {
    const starCount = Math.round((rating / 10) * 5);
    return (
      <div className="flex">
        {[...Array(5)].map((_, index) => (
          <Star
            key={index}
            size={16}
            className={index < starCount ? "text-yellow-400 fill-current" : "text-gray-200"}
          />
        ))}
      </div>
    );
  };

  const isOwner = restaurant.user_id === currentUserId;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <h2 className="text-2xl font-bold">{restaurant.name}</h2>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <UtensilsCrossed className="mr-2" />
            <span>{restaurant.restaurant_types?.name}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="mr-2" />
            <span>{restaurant.cities?.name}</span>
          </div>
          <div className="flex items-center">
            <Euro className="mr-2" />
            <PriceDisplay price={restaurant.price} />
          </div>
          <div className="flex items-center">
            <Star className="mr-2" />
            {restaurant.to_try ? 'To Try' : <RatingStars rating={restaurant.rating} />}
          </div>
        </div>
        {restaurant.notes && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Notes:</h3>
            <p>{restaurant.notes}</p>
          </div>
        )}
      </CardContent>
      {isOwner && (
        <CardFooter className="flex justify-end space-x-2">
          <Button onClick={() => onEdit(restaurant)} variant="outline">
            <Edit className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button onClick={() => {
            onDelete(restaurant.id);
            navigate('/');
          }} variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default RestaurantDetails;