import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Map } from 'lucide-react';
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

const MapDialog = ({ isOpen, onClose, children, title }) => (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "max-w-[95vw] h-[90vh] p-0",
        "gap-0 overflow-hidden"
      )}>
        <DialogHeader className="px-4 py-2 border-b flex justify-between items-center h-12">
          <DialogTitle className="text-base">
            Restaurants in {title}
          </DialogTitle>
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
  const [hoveredRestaurant, setHoveredRestaurant] = useState(null);
  
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
  };

  const handleMarkerClick = (e, restaurant) => {
    e.originalEvent.stopPropagation();
    onRestaurantClick(restaurant.id);
    setIsMapOpen(false); // Close map after clicking
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
        onClose={setIsMapOpen}
        title={selectedCityName || 'Selected City'}
        >
        <div className="relative flex-1 h-[calc(90vh-60px)]">
          <MapContainer
            center={centerCoordinates}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            key={`map-${selectedCity}`}
            className="z-0" // Ensure map stays below popups
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
                    click: (e) => handleMarkerClick(e, restaurant),
                    mouseover: () => setHoveredRestaurant(restaurant),
                    mouseout: () => setHoveredRestaurant(null)
                  }}
                >
                  <Popup>
                    <div className="p-2 min-w-[200px]">
                      <h3 className="font-medium mb-1">{restaurant.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{restaurant.address}</p>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={(e) => handleMarkerClick(e, restaurant)}
                      >
                        View Details
                      </Button>
                    </div>
                  </Popup>
                </Marker>
            ))}
          </MapContainer>
          {hoveredRestaurant && (
            <div className="absolute bottom-4 left-4 right-4 mx-auto max-w-md bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border z-[400]">
              <h3 className="font-medium">{hoveredRestaurant.name}</h3>
              <p className="text-sm text-muted-foreground">{hoveredRestaurant.address}</p>
            </div>
          )}
        </div>
      </MapDialog>
    </div>
  );
};

export default CityMap;