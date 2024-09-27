import React, { useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Copy } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';

const RestaurantItem = memo(({ 
  restaurant, 
  onRestaurantClick, 
  showCopyButton, 
  onCopy,
  currentUserId
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
    <span className="text-sm font-medium">
      {[1, 2, 3].map((value) => (
        <span 
          key={value} 
          className={value <= price ? 'text-black' : 'text-slate-300'}
        >
          €
        </span>
      ))}
    </span>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="flex items-center p-2 hover:bg-gray-50 transition-colors duration-200 rounded-lg"
      onClick={() => onRestaurantClick(restaurant.id)}
    >
      <div className="relative h-24 w-24 mr-4 bg-slate-300 rounded-lg overflow-hidden">
        {restaurant.imageUrl ? (
          <LazyLoadImage
            alt={restaurant.name}
            src={restaurant.imageUrl}
            effect="blur"
            className="w-full h-full object-cover"
            threshold={300}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl font-semibold text-white">
            {getInitials(restaurant.name)}
          </div>
        )}
        <div className="absolute bottom-1 left-1">
          {restaurant.to_try ? (
            <Badge className="bg-green-400 text-black font-bold text-[0.5rem] w-12 h-5 rounded shadow">To Try</Badge>
          ) : restaurant.rating ? (
            <div className="bg-white text-black text-xs font-bold rounded px-1 py-0.5 flex items-center shadow">
              {restaurant.rating === 10 ? '10' : restaurant.rating.toFixed(1)}
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex-grow min-w-0">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold truncate">{restaurant.name}</h3>
        </div>
        <PriceDisplay price={restaurant.price} />
        <p className="text-sm text-black truncate">{restaurant.restaurant_types?.name}</p>
        <p className="text-sm text-slate-500 truncate">{restaurant.cities?.name}</p>
      </div>
      {showCopyButton && restaurant.user_id !== currentUserId && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onCopy(restaurant.id);
          }}
          className="transition-colors duration-200 ml-2 text-gray-400 hover:text-gray-500"
        >
          <Copy className="h-5 w-5" />
        </Button>
      )}
    </motion.div>
  );
});

const RestaurantList = ({ 
  restaurants, 
  totalCount, 
  loading, 
  currentUserId, 
  onCopy,
  onRestaurantClick,
  showCopyButton
}) => {
  const handleRestaurantClick = useCallback((id) => {
    onRestaurantClick(id);
  }, [onRestaurantClick]);

  const handleCopy = useCallback((id) => {
    onCopy(id);
  }, [onCopy]);

  return (
    <div className="space-y-4">
      {restaurants.map((restaurant) => (
        <RestaurantItem
          key={restaurant.id}
          restaurant={restaurant}
          onRestaurantClick={handleRestaurantClick}
          showCopyButton={showCopyButton}
          onCopy={handleCopy}
          currentUserId={currentUserId}
        />
      ))}
      {loading && <p>Loading more restaurants...</p>}
    </div>
  );
};

export default memo(RestaurantList);