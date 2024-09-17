import React from 'react';
import { SimpleDialog } from '../../../components/ui/SimpleDialog';
import { Button } from '../../../components/ui/button';
import { Edit, Trash2, MapPin, UtensilsCrossed, Euro, ClipboardCheck, Star } from 'lucide-react';

const PriceIndicator = ({ price }) => {
  const maxPrice = 3;
  return (
    <div className="flex">
      {[...Array(maxPrice)].map((_, index) => (
        <Euro
          key={index}
          size={14}
          className={index < price ? "text-emerald-500 fill-current" : "text-gray-200"}
        />
      ))}
    </div>
  );
};

const RatingStars = ({ rating }) => {
  const starCount = Math.round((rating / 10) * 5);
  return (
    <div className="flex">
      {[...Array(5)].map((_, index) => (
        <Star
          key={index}
          size={14}
          className={index < starCount ? "text-amber-400 fill-current" : "text-gray-200"}
        />
      ))}
    </div>
  );
};

const InfoItem = ({ icon: Icon, label, children }) => (
  <div className="bg-gray-50 rounded-lg p-3 flex items-center space-x-3">
    <Icon size={16} className="text-gray-400 flex-shrink-0" />
    <div className="flex-1 min-w-0">
      <span className="text-xs text-gray-500 block">{label}</span>
      <div className="font-medium text-gray-900 text-sm truncate">{children}</div>
    </div>
  </div>
);

const RestaurantPopup = ({ restaurant, isOpen, onClose, onEdit, onDelete }) => {
  if (!restaurant) return null;

  return (
    <SimpleDialog isOpen={isOpen} onClose={onClose} title={
      <div className="flex items-center">
        <span className="mr-2">{restaurant.name}</span>
        {restaurant.to_try && (
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
            To Try
          </span>
        )}
      </div>
    }>
      <div className="space-y-4 mt-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoItem icon={UtensilsCrossed} label="Cuisine">
            {restaurant.restaurant_types.name}
          </InfoItem>
          <InfoItem icon={MapPin} label="Location">
            {restaurant.cities.name}
          </InfoItem>
          <InfoItem icon={Euro} label="Price">
            <PriceIndicator price={restaurant.price || 0} />
          </InfoItem>
          <InfoItem icon={Star} label="Rating">
            {restaurant.to_try ? (
              <span className="text-gray-500 text-sm">No reviews yet</span>
            ) : (
              <div className="flex items-center space-x-2">
                <RatingStars rating={restaurant.rating} />
                <span className="text-gray-600 text-xs">({restaurant.rating}/10)</span>
              </div>
            )}
          </InfoItem>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            <ClipboardCheck size={16} className="mr-2 text-gray-400" />
            Notes
          </h4>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">
            {restaurant.notes || 'No notes yet'}
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
          <Button onClick={() => onEdit(restaurant)} variant="outline" size="sm" className="text-gray-600 border-gray-300 hover:bg-gray-50">
            <Edit size={14} className="mr-2" /> Edit
          </Button>
          <Button onClick={() => onDelete(restaurant.id)} variant="destructive" size="sm" className="bg-red-500 hover:bg-red-600">
            <Trash2 size={14} className="mr-2" /> Delete
          </Button>
        </div>
      </div>
    </SimpleDialog>
  );
};

export default RestaurantPopup;