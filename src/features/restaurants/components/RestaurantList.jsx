import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '../../../components/ui/badge';

const RestaurantList = ({ 
  restaurants, 
  onLoadMore, 
  totalCount, 
  loading, 
  currentUserId, 
  onLike,
  onUnlike,
  onRestaurantClick
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
          onClick={() => onRestaurantClick(restaurant.id)}
          className="flex items-center p-2 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
        >
          <div className="h-12 w-12 mr-4 bg-gray-200 rounded-md flex items-center justify-center text-lg font-bold">
            {getInitials(restaurant.name)}
          </div>
          <div className="flex-grow">
            <div className="flex items-center">
              <h3 className="text-lg font-semibold">{restaurant.name}</h3>
              <PriceDisplay price={restaurant.price} />
            </div>
            <p className="text-sm font-medium">{restaurant.restaurant_types?.name}</p>
            <p className="text-sm text-gray-600">{restaurant.cities?.name}</p>
          </div>
          <div className="flex-shrink-0 ml-4 text-right">
            {restaurant.to_try ? (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">To Try</Badge>
            ) : restaurant.rating ? (
              <div className="text-lg font-bold">{restaurant.rating.toFixed(1)}</div>
            ) : (
              <span className="text-sm text-gray-500">No reviews</span>
            )}
          </div>
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