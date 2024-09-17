import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../../../components/ui/card';
import { Star } from 'lucide-react';

const RestaurantCard = ({ restaurant, onClick }) => {
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

  const renderStars = (rating) => {
    const starCount = Math.round((rating / 10) * 5);
    return (
      <div className="flex">
        {[...Array(5)].map((_, index) => (
          <Star
            key={index}
            size={16}
            className={index < starCount ? "text-yellow-400 fill-current" : "text-gray-300"}
          />
        ))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
    >
      <Card className="mb-4 overflow-hidden hover:shadow-md transition-shadow duration-300 cursor-pointer">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{restaurant.name}</h3>
            {restaurant.to_try ? (
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                To Try
              </span>
            ) : (
              renderStars(restaurant.rating)
            )}
          </div>
          <div className="flex items-center text-sm text-gray-600 mt-2">
            <span className="mr-2">{getEmoji(restaurant.restaurant_types.name)}</span>
            <span className="mr-4">{restaurant.restaurant_types.name}</span>
            <span className="mr-2">{getCityEmoji(restaurant.cities.name)}</span>
            <span>{restaurant.cities.name}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default RestaurantCard;