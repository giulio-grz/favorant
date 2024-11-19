import React, { useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MapPin, Star, ArrowLeft } from 'lucide-react';
import * as L from 'leaflet';
import MarkerIcon from '@/assets/marker-icon.png';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

const customIcon = new L.Icon({
  iconUrl: MarkerIcon,
  iconSize: [25, 31],
  iconAnchor: [12.5, 31],
  popupAnchor: [1, -31],
  shadowSize: [31, 31]
});

const InfoBox = ({ data, onRestaurantClick, onCityClick }) => {
  if (!data) return null;

  if ('restaurants' in data) {
    // City InfoBox
    return (
      <div 
        className="bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-lg border cursor-pointer hover:bg-accent/90 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onCityClick(data.name);
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">{data.name}</h3>
          <Badge variant="secondary">
            {data.restaurants.length} restaurant{data.restaurants.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Click to view all restaurants in {data.name}
        </p>
      </div>
    );
  }

  // Restaurant InfoBox
  return (
    <div
      className="bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-lg border cursor-pointer hover:bg-accent/90 transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        onRestaurantClick(data.id);
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-sm font-medium">{data.name}</h3>
        {data.is_to_try ? (
          <Badge variant="secondary">To Try</Badge>
        ) : data.user_rating ? (
          <div className="flex items-center">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
            <span className="text-xs font-medium">
              {data.user_rating.toFixed(1)}
            </span>
          </div>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground mb-2">{data.address}</p>
      <div className="flex items-center gap-2">
        {data.restaurant_types?.name && (
          <span className="text-xs text-muted-foreground">{data.restaurant_types.name}</span>
        )}
        {data.restaurant_types?.name && data.price && (
          <span className="text-xs text-muted-foreground">·</span>
        )}
        {data.price && (
          <span className="text-xs text-muted-foreground">{'€'.repeat(data.price)}</span>
        )}
      </div>
    </div>
  );
};

const MapController = ({ selectedCity, cities }) => {
  const map = useMap();

  React.useEffect(() => {
    if (selectedCity) {
      const cityRestaurants = cities[selectedCity]?.restaurants || [];
      if (cityRestaurants.length > 0) {
        const bounds = cityRestaurants
          .filter(r => r.latitude && r.longitude)
          .map(r => [parseFloat(r.latitude), parseFloat(r.longitude)]);
        
        if (bounds.length > 0) {
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    } else {
      const allCoordinates = Object.values(cities)
        .flatMap(city => city.restaurants)
        .filter(r => r.latitude && r.longitude)
        .map(r => [parseFloat(r.latitude), parseFloat(r.longitude)]);

      if (allCoordinates.length > 0) {
        map.fitBounds(allCoordinates, { padding: [50, 50] });
      } else {
        map.setView([41.9028, 12.4964], 6);
      }
    }
  }, [selectedCity, cities, map]);

  return null;
};

const CityMap = ({ 
  restaurants, 
  onRestaurantClick,
  className 
}) => {
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [showCityDialog, setShowCityDialog] = useState(false);

  const cities = useMemo(() => {
    const grouped = {};
    restaurants.forEach(restaurant => {
      if (restaurant.cities?.id && restaurant.latitude && restaurant.longitude) {
        if (!grouped[restaurant.cities.name]) {
          grouped[restaurant.cities.name] = {
            id: restaurant.cities.id,
            restaurants: []
          };
        }
        grouped[restaurant.cities.name].restaurants.push(restaurant);
      }
    });
    return grouped;
  }, [restaurants]);

  // Sort cities by number of restaurants
  const sortedCities = useMemo(() => {
    return Object.entries(cities)
      .sort(([, a], [, b]) => b.restaurants.length - a.restaurants.length)
      .map(([cityName, data]) => ({
        name: cityName,
        ...data
      }));
  }, [cities]);

  const handleCityClick = useCallback((cityName) => {
    setSelectedCity(cityName);
    setSelectedMarker(null);
    setShowCityDialog(true);
  }, []);

  const handleMarkerClick = useCallback((item, event) => {
    event.originalEvent.stopPropagation();
    setSelectedMarker(item);
  }, []);

  const handleMapClick = useCallback(() => {
    setSelectedMarker(null);
  }, []);

  const handleDialogClose = useCallback(() => {
    setShowCityDialog(false);
    setSelectedMarker(null);
  }, []);

  if (Object.keys(cities).length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-4">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedCity(null);
              setShowCityDialog(true);
            }}
            className="flex-shrink-0 whitespace-nowrap"
            size="sm"
          >
            <MapPin className="mr-2 h-4 w-4" />
            All cities
          </Button>
          {sortedCities.map((city) => (
            <Button
              key={city.name}
              variant="outline"
              onClick={() => handleCityClick(city.name)}
              className="flex-shrink-0 whitespace-nowrap"
              size="sm"
            >
              <MapPin className="mr-2 h-4 w-4" />
              {city.name} ({city.restaurants.length})
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <Dialog
        open={showCityDialog}
        onOpenChange={handleDialogClose}
      >
        <DialogContent className="max-w-[95vw] h-[90vh] p-0 overflow-hidden">
          <VisuallyHidden asChild>
            <DialogTitle>
              {selectedCity ? selectedCity : 'All Cities'}
            </DialogTitle>
          </VisuallyHidden>
          <div className="relative h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-background">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCity(null)}
                className={cn(
                  "p-0 h-4 hover:bg-transparent",
                  !selectedCity && "invisible"
                )}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Overview
              </Button>
              <div className="w-[52px]" /> {/* Spacer for centering */}
            </div>
            {/* Map Container */}
            <div className="relative flex-1">
              <MapContainer
                center={[41.9028, 12.4964]}
                zoom={6}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
                onClick={handleMapClick}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                {selectedCity ? (
                  // City detail view
                  cities[selectedCity]?.restaurants.map((restaurant) => (
                    <Marker
                      key={restaurant.id}
                      position={[parseFloat(restaurant.latitude), parseFloat(restaurant.longitude)]}
                      icon={customIcon}
                      eventHandlers={{
                        click: (e) => handleMarkerClick(restaurant, e)
                      }}
                    />
                  ))
                ) : (
                  // Overview mode
                  sortedCities.map((city) => (
                    <Marker
                      key={city.name}
                      position={[
                        parseFloat(city.restaurants[0].latitude),
                        parseFloat(city.restaurants[0].longitude)
                      ]}
                      icon={customIcon}
                      eventHandlers={{
                        click: (e) => handleMarkerClick({
                          name: city.name,
                          restaurants: city.restaurants
                        }, e)
                      }}
                    />
                  ))
                )}
                <MapController
                  selectedCity={selectedCity}
                  cities={cities}
                />
              </MapContainer>
              {selectedMarker && (
                <div className="absolute bottom-4 left-4 right-4 mx-auto max-w-md z-10 info-box">
                  <InfoBox
                    data={selectedMarker}
                    onRestaurantClick={onRestaurantClick}
                    onCityClick={handleCityClick}
                  />
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CityMap;