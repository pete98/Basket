import React, { createContext, ReactNode, useContext, useMemo, useState } from 'react';

export interface LocationOption {
  id: string;
  label: string;
  address: string;
  zip: string;
}

const LOCATION_OPTIONS: LocationOption[] = [
  {
    id: 'home',
    label: 'Home',
    address: '1570 Washington St, Boston, MA',
    zip: '02118',
  },
  {
    id: 'work',
    label: 'Work',
    address: '25 Main St, Cambridge, MA',
    zip: '02139',
  },
  {
    id: 'farmers-market',
    label: 'Farmers Market',
    address: '88 South Park Ave, Brookline, MA',
    zip: '02445',
  },
];

interface LocationContextType {
  selectedLocation: LocationOption;
  savedLocations: LocationOption[];
  selectLocation: (location: LocationOption) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [selectedLocation, setSelectedLocation] = useState<LocationOption>(LOCATION_OPTIONS[0]);
  const savedLocations = useMemo(() => LOCATION_OPTIONS, []);

  const selectLocation = (location: LocationOption) => {
    setSelectedLocation(location);
  };

  return (
    <LocationContext.Provider
      value={{
        selectedLocation,
        savedLocations,
        selectLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within LocationProvider');
  }
  return context;
}
