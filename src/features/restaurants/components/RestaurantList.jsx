const RestaurantList = ({ restaurants, onRestaurantClick }) => {
  return (
    <div className="space-y-4">
      {restaurants.map((restaurant) => (
        <div 
          key={restaurant.id} 
          className="cursor-pointer hover:bg-slate-50 transition-all"
          onClick={() => handleRestaurantClick(restaurant.id)}
        >
          <div className="flex items-start p-4 relative">
            <div className="h-16 w-16 bg-slate-100 rounded-lg flex items-center justify-center text-xl font-semibold text-slate-500 relative">
              {restaurant.name.substring(0, 2).toUpperCase()}
              {restaurant.is_to_try && (
                <div className="absolute -bottom-2 -right-2">
                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px] px-1 py-0.5 leading-normal rounded-full">
                    To Try
                  </Badge>
                </div>
              )}
              {!restaurant.is_to_try && restaurant.aggregate_rating && (
                <div className="absolute -bottom-2 -right-2 bg-white rounded-full px-2 py-0.5 text-sm border">
                  {restaurant.aggregate_rating.toFixed(1)}
                </div>
              )}
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-semibold">{restaurant.name}</h3>
              <div className="text-sm text-gray-500 space-y-0.5">
                {restaurant.restaurant_types?.name && (
                  <div>{restaurant.restaurant_types.name}</div>
                )}
                <div>
                  {restaurant.address}
                  {restaurant.cities?.name && `, ${restaurant.cities.name}`}
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              {'€'.repeat(restaurant.price || 0)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RestaurantList;