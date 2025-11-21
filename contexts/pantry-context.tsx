import { PANTRY_STORAGE_KEY } from '@/constants/pantry';
import { PantryCategory, PantryItem, PantryItemStatus, PantryState } from '@/lib/types/pantry';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useReducer } from 'react';

type PantryAction =
  | { type: 'ADD_ITEM'; payload: Omit<PantryItem, 'id' | 'addedDate' | 'status'> }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_ITEM'; payload: PantryItem }
  | { type: 'SET_CATEGORY'; payload: PantryCategory }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'LOAD_ITEMS'; payload: PantryItem[] };

interface PantryContextType {
  state: PantryState;
  addItem: (item: Omit<PantryItem, 'id' | 'addedDate' | 'status'>) => void;
  removeItem: (id: string) => void;
  updateItem: (item: PantryItem) => void;
  setCategory: (category: PantryCategory) => void;
  setSearchQuery: (query: string) => void;
}

const PantryContext = createContext<PantryContextType | undefined>(undefined);

function calculateStatus(item: Omit<PantryItem, 'status'>): PantryItemStatus {
  if (!item.expiryDate) return 'fresh';

  const expiryDate = new Date(item.expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);

  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 3) return 'expiring';
  if (item.quantity <= 2) return 'low';
  return 'fresh';
}

function pantryReducer(state: PantryState, action: PantryAction): PantryState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const newItem: PantryItem = {
        ...action.payload,
        id: `pantry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        addedDate: new Date().toISOString(),
        status: calculateStatus(action.payload),
      };
      return {
        ...state,
        items: [...state.items, newItem],
      };
    }

    case 'REMOVE_ITEM': {
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
      };
    }

    case 'UPDATE_ITEM': {
      const updatedItem = {
        ...action.payload,
        status: calculateStatus(action.payload),
      };
      return {
        ...state,
        items: state.items.map((item) => (item.id === action.payload.id ? updatedItem : item)),
      };
    }

    case 'SET_CATEGORY': {
      return {
        ...state,
        selectedCategory: action.payload,
      };
    }

    case 'SET_SEARCH_QUERY': {
      return {
        ...state,
        searchQuery: action.payload,
      };
    }

    case 'LOAD_ITEMS': {
      return {
        ...state,
        items: action.payload,
      };
    }

    default:
      return state;
  }
}

const initialState: PantryState = {
  items: [],
  selectedCategory: 'All',
  searchQuery: '',
};

export function PantryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(pantryReducer, initialState);

  // Load items from storage on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const available = await SecureStore.isAvailableAsync();
        if (!available) return;

        const raw = await SecureStore.getItemAsync(PANTRY_STORAGE_KEY);
        if (raw && isMounted) {
          const items: PantryItem[] = JSON.parse(raw);
          // Recalculate statuses for all items based on current date
          const itemsWithUpdatedStatus = items.map((item) => ({
            ...item,
            status: calculateStatus(item),
          }));
          dispatch({ type: 'LOAD_ITEMS', payload: itemsWithUpdatedStatus });
        }
      } catch (error) {
        console.warn('[PantryContext] Failed to load items:', error);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Save items to storage whenever items change
  useEffect(() => {
    (async () => {
      try {
        const available = await SecureStore.isAvailableAsync();
        if (!available) return;

        await SecureStore.setItemAsync(PANTRY_STORAGE_KEY, JSON.stringify(state.items));
      } catch (error) {
        console.warn('[PantryContext] Failed to save items:', error);
      }
    })();
  }, [state.items]);

  const addItem = useCallback((item: Omit<PantryItem, 'id' | 'addedDate' | 'status'>) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  }, []);

  const removeItem = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id });
  }, []);

  const updateItem = useCallback((item: PantryItem) => {
    dispatch({ type: 'UPDATE_ITEM', payload: item });
  }, []);

  const setCategory = useCallback((category: PantryCategory) => {
    dispatch({ type: 'SET_CATEGORY', payload: category });
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  }, []);

  return (
    <PantryContext.Provider value={{ state, addItem, removeItem, updateItem, setCategory, setSearchQuery }}>
      {children}
    </PantryContext.Provider>
  );
}

export function usePantry() {
  const context = useContext(PantryContext);
  if (context === undefined) {
    throw new Error('usePantry must be used within a PantryProvider');
  }
  return context;
}

