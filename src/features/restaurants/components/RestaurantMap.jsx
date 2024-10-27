import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from '@/assets/marker-icon.png';

// Create custom icon
const customIcon = new L.Icon({
  iconUrl: markerIcon,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 31],     // Reduced from 33x41 to about 75%
  iconAnchor: [12.5, 31], // Half the new width, full new height
  popupAnchor: [1, -31],  // Adjusted for new height
  shadowSize: [31, 31]    // Reduced shadow to match
});

const RestaurantMap = ({ address, city, latitude, longitude, updateCoordinates }) => {
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [map, setMap] = useState(null);
  const [hasAttemptedGeocoding, setHasAttemptedGeocoding] = useState(false);

  useEffect(() => {
    const geocodeAddress = async () => {
      try {
        setLoading(true);
        setError(null);

        // If we already have valid coordinates, use them
        if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
          setPosition([latitude, longitude]);
          setLoading(false);
          return;
        }

        // Skip if we've already attempted geocoding or don't have address/city
        if (hasAttemptedGeocoding || !address || !city) {
          setLoading(false);
          return;
        }

        // Mark that we've attempted geocoding
        setHasAttemptedGeocoding(true);

        const searchQuery = `${address}, ${city}`;
        const encodedQuery = encodeURIComponent(searchQuery);

        // Add a delay to respect rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

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
          const newLat = parseFloat(lat);
          const newLon = parseFloat(lon);
          
          setPosition([newLat, newLon]);
          
          // Only update coordinates if they're not already set
          if (updateCoordinates && (!latitude || !longitude)) {
            await updateCoordinates(newLat, newLon);
          }
        } else {
          throw new Error('Location not found');
        }
      } catch (err) {
        console.error('Geocoding error:', err);
        setError(err.message || 'Failed to load map location');
      } finally {
        setLoading(false);
      }
    };

    geocodeAddress();
  }, [address, city, latitude, longitude, updateCoordinates, hasAttemptedGeocoding]);

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

export default RestaurantMap;