import React from 'react';
import { Label } from "./label";
import { Input } from "./input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Button } from "./button";
import { MapPin, Plus } from 'lucide-react';
import { cn } from "@/lib/utils";

const AddressSection = ({ 
  address, 
  setAddress, 
  cities, 
  onAddCity, 
  onRecalculateCoordinates,
  className,
  showCoordinates = true,
  disabled = false
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <Label>Street Address</Label>
        <Input
          value={address.street || ''}
          onChange={(e) => setAddress(prev => ({
            ...prev,
            street: e.target.value
          }))}
          placeholder="Enter street address"
          disabled={disabled}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Postal Code</Label>
          <Input
            value={address.postalCode || ''}
            onChange={(e) => setAddress(prev => ({
              ...prev,
              postalCode: e.target.value
            }))}
            placeholder="Enter postal code"
            disabled={disabled}
          />
        </div>
        
        <div>
          <Label>City</Label>
          <Select
            value={address.cityId?.toString() || ''}
            onValueChange={(value) => {
              if (value === 'new') {
                onAddCity?.();
              } else {
                setAddress(prev => ({
                  ...prev,
                  cityId: parseInt(value)
                }));
              }
            }}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select city" />
            </SelectTrigger>
            <SelectContent>
              {cities?.map(city => (
                <SelectItem key={city.id} value={city.id.toString()}>
                  {city.name}
                </SelectItem>
              ))}
              {onAddCity && (
                <SelectItem value="new" className="text-primary">
                  <Plus className="inline-block w-4 h-4 mr-2" />
                  Add new city
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {onRecalculateCoordinates && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onRecalculateCoordinates}
          disabled={disabled || !address.street || !address.cityId}
        >
          <MapPin className="mr-2 h-4 w-4" />
          Find Coordinates
        </Button>
      )}

      {showCoordinates && address.latitude && address.longitude && (
        <div className="text-sm text-muted-foreground">
          <p>Coordinates: {address.latitude}, {address.longitude}</p>
        </div>
      )}
    </div>
  );
};

export { AddressSection };