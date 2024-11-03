import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Map, Star } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import * as L from 'leaflet';
import MarkerIcon from '@/assets/marker-icon.png';

const customIcon = new L.Icon({
  iconUrl: MarkerIcon,
  iconSize: [25, 31],
  iconAnchor: [12.5, 31],
  popupAnchor: [1, -31],
  shadowSize: [31, 31]
});

const InfoBox = ({ restaurant, onRestaurantClick }) => (
  <div 
    onClick={() => onRestaurantClick(restaurant.id)}
    className="bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-lg border cursor-pointer hover:bg-accent transition-colors"
  >
    <h3 className="font-medium mb-1">{restaurant.name}</h3>
    <p className="text-sm text-muted-foreground mb-2">{restaurant.address}</p>
    <div className="flex items-center gap-2">
      {restaurant.is_to_try ? (
        <Badge variant="secondary">To Try</Badge>
      ) : restaurant.user_rating ? (
        <div className="flex items-center">
          <StarIcon className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
          <span className="text-sm font-medium">
            {restaurant.user_rating.toFixed(1)}
          </span>
        </div>
      ) : null}
    </div>
  </div>
);

const MapDialog = ({ isOpen, onClose, children, title }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className={cn(
      "max-w-[95vw] h-[90vh] p-0",
      "gap-0 overflow-hidden"
    )}>
      <DialogHeader className="px-4 py-2 border-b flex justify-between items-center h-12">
        <DialogTitle>Restaurants in {title}</DialogTitle>
      </DialogHeader>
      {children}
    </DialogContent>
  </Dialog>
);

const CityMap = ({ 
  restaurants, 
  onRestaurantClick,
  className 
}) => {
  const [selectedCity, setSelectedCity] = useState(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(null);
  
  const restaurantsByCity = useMemo(() => {
    const grouped = {};
    restaurants.forEach(restaurant => {
      if (restaurant.cities?.id && restaurant.latitude && restaurant.longitude) {
        if (!grouped[restaurant.cities.id]) {
          grouped[restaurant.cities.id] = {
            cityName: restaurant.cities.name,
            restaurants: []
          };
        }
        grouped[restaurant.cities.id].restaurants.push(restaurant);
      }
    });
    return grouped;
  }, [restaurants]);

  const centerCoordinates = useMemo(() => {
    if (!selectedCity || !restaurantsByCity[selectedCity]?.restaurants.length) {
      return [41.9028, 12.4964];
    }

    const cityRestaurants = restaurantsByCity[selectedCity].restaurants;
    const validRestaurants = cityRestaurants.filter(r => r.latitude && r.longitude);
    
    if (!validRestaurants.length) return [41.9028, 12.4964];

    const totalLat = validRestaurants.reduce((sum, r) => sum + parseFloat(r.latitude), 0);
    const totalLng = validRestaurants.reduce((sum, r) => sum + parseFloat(r.longitude), 0);
    
    return [
      totalLat / validRestaurants.length,
      totalLng / validRestaurants.length
    ];
  }, [selectedCity, restaurantsByCity]);

  const availableCities = useMemo(() => {
    return Object.entries(restaurantsByCity)
      .filter(([_, data]) => data.restaurants.some(r => r.latitude && r.longitude))
      .map(([cityId, data]) => ({
        id: parseInt(cityId),
        name: data.cityName,
        count: data.restaurants.length
      }));
  }, [restaurantsByCity]);

  if (availableCities.length === 0) {
    return null;
  }

  const handleCitySelect = (cityId) => {
    setSelectedCity(cityId);
    setIsMapOpen(true);
    setSelectedMarker(null);
  };

  const handleMarkerClick = (restaurant, event) => {
    event.originalEvent.stopPropagation();
    setSelectedMarker(restaurant);
  };

  const selectedCityName = restaurantsByCity[selectedCity]?.cityName;

  return (
    <div className={cn("space-y-4", className)}>
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-4">
          {availableCities.map((city) => (
            <Button
              key={city.id}
              variant={selectedCity === city.id ? "default" : "outline"}
              onClick={() => handleCitySelect(city.id)}
              className="flex-shrink-0 whitespace-nowrap"
              size="sm"
            >
              <Map className="mr-2 h-4 w-4" />
              {city.name} ({city.count})
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <MapDialog 
        isOpen={isMapOpen} 
        onClose={() => {
          setIsMapOpen(false);
          setSelectedMarker(null);
        }}
        title={selectedCityName}
      >
        <div className="relative flex-1 h-[calc(90vh-60px)]">
          <MapContainer
            center={centerCoordinates}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            key={`map-${selectedCity}`}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            {restaurantsByCity[selectedCity]?.restaurants
              .filter(r => r.latitude && r.longitude)
              .map((restaurant) => (
                <Marker
                  key={restaurant.id}
                  position={[restaurant.latitude, restaurant.longitude]}
                  icon={customIcon}
                  eventHandlers={{
                    click: (e) => handleMarkerClick(restaurant, e)
                  }}
                />
            ))}
          </MapContainer>
          {selectedMarker && (
          <div className="absolute bottom-4 left-4 right-4 mx-auto max-w-md z-[1000]">
            <div 
              onClick={() => onRestaurantClick(selectedMarker.id)}
              className="bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-lg border cursor-pointer hover:bg-accent transition-colors"
            >
              <h3 className="font-medium mb-1">{selectedMarker.name}</h3>
              <p className="text-sm text-muted-foreground mb-2">{selectedMarker.address}</p>
              <div className="flex items-center gap-2">
                {selectedMarker.is_to_try ? (
                  <Badge variant="secondary">To Try</Badge>
                ) : selectedMarker.user_rating ? (
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                    <span className="text-sm font-medium">
                      {selectedMarker.user_rating.toFixed(1)}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
        </div>
      </MapDialog>
    </div>
  );
};

export default CityMap;