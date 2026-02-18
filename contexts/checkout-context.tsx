import { useCart } from '@/contexts/cart-context';
import type { DeliveryAddress, DeliveryContact, DeliveryQuoteResponse } from '@/lib/types/orders';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export interface CheckoutState {
  fulfillmentType: 'pickup' | 'delivery';
  pickupEtaMessage?: string;
  pickupWindowStart?: string;
  pickupWindowEnd?: string;
  notes?: string;
  deliveryAddress: DeliveryAddress | null;
  deliveryContact: DeliveryContact | null;
  deliveryQuote: DeliveryQuoteResponse | null;
  saveAddressToProfile: boolean;
}

interface CheckoutContextType {
  state: CheckoutState;
  patchCheckout: (patch: Partial<CheckoutState>) => void;
  resetCheckout: () => void;
}

const DEFAULT_CHECKOUT_STATE: CheckoutState = {
  fulfillmentType: 'pickup',
  pickupEtaMessage: 'Ready within about 15 minutes once the store confirms your order.',
  pickupWindowStart: undefined,
  pickupWindowEnd: undefined,
  notes: undefined,
  deliveryAddress: null,
  deliveryContact: null,
  deliveryQuote: null,
  saveAddressToProfile: false,
};

const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined);

export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CheckoutState>(DEFAULT_CHECKOUT_STATE);
  const { state: cartState } = useCart();

  useEffect(() => {
    if (cartState.items.length === 0) {
      setState(DEFAULT_CHECKOUT_STATE);
    }
  }, [cartState.items.length]);

  function patchCheckout(patch: Partial<CheckoutState>) {
    setState((previous) => ({ ...previous, ...patch }));
  }

  function resetCheckout() {
    setState(DEFAULT_CHECKOUT_STATE);
  }

  const value = useMemo(
    () => ({
      state,
      patchCheckout,
      resetCheckout,
    }),
    [state]
  );

  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}

export function useCheckout() {
  const context = useContext(CheckoutContext);
  if (!context) {
    throw new Error('useCheckout must be used within CheckoutProvider');
  }
  return context;
}
