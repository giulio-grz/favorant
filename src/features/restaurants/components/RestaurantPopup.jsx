import React from 'react';
import { Button } from '../../../components/ui/button';
import { Edit, Trash2, MapPin, UtensilsCrossed, ClipboardCheck, Star, Euro } from 'lucide-react';

const PriceDisplay = ({ price }) => {
  return (
    <div className="inline-flex">
      <span className="text-black">€</span>
      <span className={price >= 2 ? "text-black" : "text-gray-300"}>€</span>
      <span className={price >= 3 ? "text-black" : "text-gray-300"}>€</span>
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
          size={16}
          className={index < starCount ? "text-yellow-400 fill-current" : "text-gray-200"}
        />
      ))}
    </div>
  );
};

const InfoItem = ({ icon: Icon, label, children }) => (
  <div className="bg-gray-50 rounded-lg p-3">
    <div className="flex items-center space-x-3 mb-1">
      <Icon size={18} className="text-gray-400 flex-shrink-0" />
      <span className="text-xs text-gray-500">{label}</span>
    </div>
    <div className="font-medium text-gray-900 text-sm">{children}</div>
  </div>
);

const RestaurantPopup = ({ restaurant, onClose, onEdit, onDelete, currentUserId }) => {
  if (!restaurant) return null;

  const isOwner = restaurant.user_id === currentUserId;
  const isLikedOnly = restaurant.isLiked && !isOwner;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <InfoItem icon={UtensilsCrossed} label="Type">
          {restaurant.restaurant_types?.name}
        </InfoItem>
        <InfoItem icon={MapPin} label="City">
          {restaurant.cities?.name}
        </InfoItem>
        <InfoItem icon={Euro} label="Price">
          <PriceDisplay price={restaurant.price} />
        </InfoItem>
        <InfoItem icon={Star} label="Rating">
          {restaurant.to_try ? 'To Try' : <RatingStars rating={restaurant.rating} />}
        </InfoItem>
      </div>
      {restaurant.notes && (
        <InfoItem icon={ClipboardCheck} label="Notes">
          {restaurant.notes}
        </InfoItem>
      )}
      {(isOwner || isLikedOnly) && (
        <div className="flex justify-end space-x-2 mt-4">
          {isOwner && (
            <>
              <Button onClick={() => onEdit(restaurant)} variant="outline" size="sm">
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
              <Button onClick={() => onDelete(restaurant.id)} variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </>
          )}
          {isLikedOnly && (
            <Button variant="secondary" size="sm" disabled>
              Liked Restaurant (View Only)
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default RestaurantPopup;