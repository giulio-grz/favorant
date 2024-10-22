import React from 'react';
import { Badge } from '@/components/ui/badge';

const RestaurantList = ({ restaurants, onRestaurantClick, currentUserId }) => {
  return (
    <div className="space-y-4">
      {restaurants.map((restaurant) => (
        <div 
          key={restaurant.id} 
          className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
          onClick={() => onRestaurantClick(restaurant.id)}
        >
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-semibold">{restaurant.name}</h3>
            {restaurant.bookmarks && restaurant.bookmarks.some(b => b.type === 'to_try') && (
              <Badge variant="secondary">To Try</Badge>
            )}
          </div>
          <p>{restaurant.restaurant_types?.name}</p>
          <p>{restaurant.cities?.name}</p>
          {restaurant.aggregate_rating > 0 && (
            <p>Rating: {restaurant.aggregate_rating.toFixed(1)}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default RestaurantList;