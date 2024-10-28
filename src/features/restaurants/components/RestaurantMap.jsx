import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from '@/assets/marker-icon.png';
import { debounce } from 'lodash';

// Create custom icon
const customIcon = new L.Icon({
  iconUrl: markerIcon,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 31],
  iconAnchor: [12.5, 31],
  popupAnchor: [1, -31],
  shadowSize: [31, 31]
});

const geocodeAddress = async (address, city) => {
  try {
    const searchQuery = `${address}, ${city}`;
    const encodedQuery = encodeURIComponent(searchQuery);
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=1`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'RestaurantApp/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      const { lat, lon } = data[0];
      return { lat: parseFloat(lat), lon: parseFloat(lon) };
    }
    
    throw new Error('Location not found');
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
};

const RestaurantMap = ({ address, city, latitude, longitude, updateCoordinates }) => {
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [map, setMap] = useState(null);
  const mountedRef = useRef(true);
  const geocodingInProgressRef = useRef(false);

  // Memoize the debounced geocoding function
  const debouncedGeocode = useMemo(
    () => debounce(async (searchAddress, searchCity) => {
      if (geocodingInProgressRef.current) return;
      
      try {
        geocodingInProgressRef.current = true;
        const coords = await geocodeAddress(searchAddress, searchCity);
        
        if (mountedRef.current) {
          setPosition([coords.lat, coords.lon]);
          if (updateCoordinates) {
            await updateCoordinates(coords.lat, coords.lon);
          }
        }
      } catch (error) {
        if (mountedRef.current) {
          setError(error.message);
        }
      } finally {
        geocodingInProgressRef.current = false;
      }
    }, 1000),
    [updateCoordinates]
  );

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

        // Only attempt geocoding if we have both address and city
        if (address && city) {
          await debouncedGeocode(address, city);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err.message);
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
      debouncedGeocode.cancel();
    };
  }, [address, city, latitude, longitude, debouncedGeocode]);

  useEffect(() => {
    if (map && position) {
      map.setView(position, 15);
    }
  }, [map, position]);

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
        style={{ height: '100%', width: '100%' }}
        ref={setMap}
        zoomControl={false}
      >
        <ZoomControl 
          position="bottomright"
          className="border border-slate-200 shadow-lg rounded-lg overflow-hidden mr-4 mb-4"
          zoomInText="+"
          zoomOutText="−"
          zoomInTitle="Zoom in"
          zoomOutTitle="Zoom out"
        />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <Marker position={position} icon={customIcon}>
          <Popup>
            <div className="text-sm">
              <strong>{address}</strong>
              <br />
              {city}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default React.memo(RestaurantMap);