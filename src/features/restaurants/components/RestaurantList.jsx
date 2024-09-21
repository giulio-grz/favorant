import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Star, Heart } from 'lucide-react';

/**
 * RestaurantList Component
 * 
 * Displays a list of restaurants with basic information and navigation to details
 * 
 * @param {Object} props
 * @param {Array} props.restaurants - Array of restaurant objects to display
 * @param {Function} props.onLoadMore - Function to call when loading more restaurants
 * @param {number} props.totalCount - Total number of restaurants available
 * @param {boolean} props.loading - Whether the component is in a loading state
 * @param {string} props.currentUserId - ID of the current user
 * @param {Function} props.onLike - Function to call when liking a restaurant
 * @param {Function} props.onUnlike - Function to call when unliking a restaurant
 */
const RestaurantList = ({ restaurants, onLoadMore, totalCount, loading, currentUserId, onLike, onUnlike }) => {
  const PriceDisplay = ({ price }) => (
    <div className="inline-flex text-sm">
      <span className="text-black">€</span>
      <span className={price >= 2 ? "text-black" : "text-gray-300"}>€</span>
      <span className={price >= 3 ? "text-black" : "text-gray-300"}>€</span>
    </div>
  );

  const renderStars = (rating) => {
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

  const handleLikeClick = (e, restaurant) => {
    e.preventDefault();
    e.stopPropagation();
    if (restaurant.isLiked) {
      onUnlike(restaurant.id);
    } else {
      onLike(restaurant.id);
    }
  };

  return (
    <div className="space-y-4">
      {restaurants.map((restaurant) => (
        <motion.div
          key={restaurant.id}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3 }}
        >
          <Link to={`/restaurant/${restaurant.id}`}>
            <Card className={`mb-4 overflow-hidden hover:shadow-md transition-shadow duration-300 cursor-pointer w-full ${restaurant.isLiked ? 'border-primary' : ''}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    <h3 className="text-lg font-semibold">{restaurant.name}</h3>
                    {restaurant.user_id !== currentUserId && (
                      <Heart 
                        className={`ml-2 cursor-pointer w-4 h-4 ${
                          restaurant.isLiked ? "text-red-500 fill-current" : "text-gray-300"
                        }`}
                        onClick={(e) => handleLikeClick(e, restaurant)}
                      />
                    )}
                  </div>
                  <div className="flex flex-col items-end">
                    {restaurant.to_try ? (
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                        To Try
                      </span>
                    ) : (
                      renderStars(restaurant.rating)
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600 mt-2">
                  <div className="flex items-center">
                    <span className="mr-2">{restaurant.restaurant_types?.name}</span>
                    <span>{restaurant.cities?.name}</span>
                  </div>
                  <PriceDisplay price={restaurant.price} />
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      ))}
      {totalCount > restaurants.length && (
        <Button 
          onClick={onLoadMore}
          className="w-full" 
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Load More'}
        </Button>
      )}
    </div>
  );
};

export default RestaurantList;