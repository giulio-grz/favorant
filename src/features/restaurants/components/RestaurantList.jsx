import React from 'react';
import { Badge } from "@/components/ui/badge";
import { formatRating } from "@/lib/utils";

const RestaurantList = ({ restaurants, onRestaurantClick }) => {
  return (
    <div className="space-y-4">
      {restaurants.map((restaurant) => (
        <div 
          key={restaurant.id} 
          className="cursor-pointer"
          onClick={() => onRestaurantClick(restaurant.id)}
        >
          <div className="flex items-start pb-4 pt-4 relative">
            <div className="h-16 w-16 bg-slate-100 hover:bg-slate-200 transition-colors rounded-lg flex items-center justify-center text-xl font-semibold text-slate-500 relative">
              {restaurant.name.substring(0, 2).toUpperCase()}
              {restaurant.is_to_try && (
                <div className="absolute -bottom-2 -right-2">
                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px] px-1 py-0.5 leading-normal rounded-full">
                    To Try
                  </Badge>
                </div>
              )}
              {!restaurant.is_to_try && restaurant.user_rating && (
                <div className="absolute -bottom-2 -right-2 bg-white rounded-full px-2 py-0.5 text-sm border">
                  {formatRating(restaurant.user_rating)}
                </div>
              )}
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-semibold">{restaurant.name}</h3>
              <div className="text-sm text-gray-500 space-y-0.5">
                <div>{restaurant.restaurant_types?.name}</div>
                <div>{restaurant.cities?.name}</div>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              {'€'.repeat(restaurant.price || 0)}
            </div>
          </div>
        </div>
      ))}

      {restaurants.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No restaurants found
        </div>
      )}
    </div>
  );
};

export default RestaurantList;