const RestaurantList = ({ restaurants, onRestaurantClick }) => {
  return (
    <div className="space-y-4">
      {restaurants.map((restaurant) => (
        <div 
          key={restaurant.id} 
          className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
          onClick={() => onRestaurantClick(restaurant.id)}
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold">{restaurant.name}</h3>
              <div className="text-sm text-gray-500">
                <p>{restaurant.restaurant_types?.name}</p>
                <p>{restaurant.cities?.name}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {(restaurant.is_to_try || restaurant.to_try || restaurant.bookmarkType === 'to_try') && (
                <Badge variant="secondary">To Try</Badge>
              )}
              {restaurant.has_user_review && restaurant.user_rating && (
                <Badge variant="secondary">{restaurant.user_rating.toFixed(1)}</Badge>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RestaurantList;