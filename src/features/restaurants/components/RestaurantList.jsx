import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Heart } from 'lucide-react';
import { cn } from '../../../lib/utils';

const RestaurantList = ({ 
  restaurants, 
  onLoadMore, 
  totalCount, 
  loading, 
  currentUserId, 
  onLike,
  onUnlike,
  onRestaurantClick,
  showLikeButtons
}) => {
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const PriceDisplay = ({ price }) => (
    <span className="text-sm font-medium ml-2">
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

  return (
    <div className="space-y-4">
      {restaurants.map((restaurant) => (
        <motion.div
          key={restaurant.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="flex items-center p-2 hover:bg-gray-50 transition-colors duration-200 rounded-lg"
          onClick={() => onRestaurantClick(restaurant.id)}
        >
          <div className="relative h-24 w-24 mr-4 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center text-2xl font-bold text-gray-600">
            {getInitials(restaurant.name)}
            <div className="absolute bottom-1 left-1">
              {restaurant.to_try ? (
                <Badge className="bg-blue-500 text-white text-[0.5rem] w-12 h-5 rounded">To Try</Badge>
              ) : restaurant.rating ? (
                <div className="bg-white text-black text-xs font-bold rounded w-6 h-5 flex items-center justify-center shadow">
                  {restaurant.rating.toFixed(1)}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex-grow min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold truncate">{restaurant.name}</h3>
              <PriceDisplay price={restaurant.price} />
            </div>
            <p className="text-sm text-gray-600 truncate">{restaurant.restaurant_types?.name}</p>
            <p className="text-sm text-gray-500 truncate">{restaurant.cities?.name}</p>
          </div>
          {showLikeButtons && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                restaurant.isLiked ? onUnlike(restaurant.id) : onLike(restaurant.id);
              }}
              className={cn(
                "transition-colors duration-200 ml-2",
                restaurant.isLiked ? "text-red-500 hover:text-red-600" : "text-gray-400 hover:text-gray-500"
              )}
            >
              <Heart className={cn("h-5 w-5", restaurant.isLiked && "fill-current")} />
            </Button>
          )}
        </motion.div>
      ))}
      {totalCount > restaurants.length && (
        <button 
          onClick={onLoadMore}
          className="w-full mt-4 py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
};

export default RestaurantList;