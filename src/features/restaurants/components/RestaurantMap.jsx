import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerIcon from '@/assets/marker-icon.png';

// Create custom icon
const customIcon = new L.Icon({
  iconUrl: MarkerIcon,
  iconSize: [25, 31],
  iconAnchor: [12.5, 31],
  popupAnchor: [1, -31],
  shadowSize: [31, 31]
});

// RecenterAutomatically component to handle map view updates
const RecenterAutomatically = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

const RestaurantMap = ({ 
  address, 
  city, 
  latitude, 
  longitude, 
  updateCoordinates = null 
}) => {
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [map, setMap] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    const initializeMap = async () => {
      try {
        setLoading(true);
        setError(null);

        // If we already have valid coordinates, use them
        if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
          setPosition([latitude, longitude]);
          setLoading(false);
          return;
        }

        // Fallback to geocoding if coordinates aren't available
        if (address && city) {
          const searchQuery = `${address}, ${city}, Italy`;
          
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&countrycodes=it`,
            {
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'RestaurantApp/1.0'
              }
            }
          );

          if (!response.ok) {
            throw new Error('Geocoding failed');
          }

          const data = await response.json();
          
          if (data && data.length > 0) {
            const { lat, lon } = data[0];
            if (mountedRef.current) {
              setPosition([parseFloat(lat), parseFloat(lon)]);
            }
          } else {
            throw new Error('Location not found');
          }
        }
      } catch (error) {
        console.error('Map error:', error);
        if (mountedRef.current) {
          setError(error.message);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    initializeMap();

    return () => {
      mountedRef.current = false;
    };
  }, [address, city, latitude, longitude]);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg">
        <div className="text-slate-500">Loading map...</div>
      </div>
    );
  }

  if (error || !position) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg">
        <div className="text-slate-500">
          {error || 'Location unavailable'}
        </div>
      </div>
    );
  }

  return (
    <div className="h-64 rounded-lg overflow-hidden">
      <MapContainer
        center={position}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        ref={setMap}
        zoomControl={true}
        onClick={updateCoordinates ? (e) => {
          const { lat, lng } = e.latlng;
          updateCoordinates(lat, lng);
        } : undefined}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <Marker 
          position={position} 
          icon={customIcon}
        >
          <Popup>
            <div className="text-sm">
              <strong>{address}</strong>
              <br />
              {city}
            </div>
          </Popup>
        </Marker>
        <RecenterAutomatically lat={position[0]} lng={position[1]} />
      </MapContainer>
    </div>
  );
};

export default React.memo(RestaurantMap);