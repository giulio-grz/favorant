import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Edit, Trash2, Star } from 'lucide-react';

const RestaurantCard = ({ restaurant, handleEditRestaurant, deleteRestaurant }) => {
  const getEmoji = (type) => {
    const emojiMap = {
      'Italian': '🍕', 'Japanese': '🍣', 'Mexican': '🌮', 'Chinese': '🥡',
      'Indian': '🍛', 'American': '🍔', 'French': '🥐', 'Thai': '🍜',
      'Greek': '🥙', 'Spanish': '🥘',
    };
    return emojiMap[type] || '🍴';
  };

  const getCityEmoji = (city) => {
    const cityEmojiMap = {
      'New York': '🗽', 'Los Angeles': '🌴', 'Chicago': '🌭', 'Houston': '🤠',
      'Phoenix': '🏜️', 'Philadelphia': '🔔', 'San Antonio': '🌵', 'San Diego': '🏖️',
      'Dallas': '🐎', 'San Jose': '💻',
    };
    return cityEmojiMap[city] || '🏙️';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="mb-4 overflow-hidden hover:shadow-md transition-shadow duration-300">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">{restaurant.name}</h3>
            {restaurant.to_try ? (
              <span className="bg-blue-100 text-blue-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full">
                To Try
              </span>
            ) : (
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={i < restaurant.rating ? 'text-yellow-400' : 'text-gray-200'}
                    size={16}
                    fill={i < restaurant.rating ? 'currentColor' : 'none'}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center text-sm text-gray-600 mb-4">
            <span className="mr-2">{getEmoji(restaurant.restaurant_types.name)}</span>
            <span className="mr-4">{restaurant.restaurant_types.name}</span>
            <span className="mr-2">{getCityEmoji(restaurant.cities.name)}</span>
            <span>{restaurant.cities.name}</span>
          </div>
          <div className="flex justify-end space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleEditRestaurant(restaurant)}
              className="text-blue-500 hover:text-blue-700"
            >
              <Edit size={14} className="mr-1" /> Edit
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => deleteRestaurant(restaurant.id)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 size={14} className="mr-1" /> Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default RestaurantCard;