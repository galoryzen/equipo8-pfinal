import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getPropertyDetail } from '@src/features/catalog/catalog-service';
import { useAuth } from '@src/services/auth-context';
import {
  ActiveCartConflictError,
  InventoryUnavailableError,
  RateUnavailableError,
  cancelCartBooking,
  createCartBooking,
  getBookingDetail,
  listMyBookings,
} from '@src/services/booking-service';
import type { CartExtras, CartSnapshot, CreateCartBookingPayload } from '@src/types/booking';

const CART_KEY = 'travelhub.cart';

interface CartState {
  cart: CartSnapshot | null;
  loading: boolean;
  hasActiveCart: boolean;
  createCart: (payload: CreateCartBookingPayload, extras: CartExtras) => Promise<void>;
  cancelCart: () => Promise<void>;
  replaceCart: (payload: CreateCartBookingPayload, extras: CartExtras) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartState | null>(null);

function isTerminalStatus(status: string | undefined): boolean {
  if (!status) return true;
  return status === 'CANCELLED' || status === 'EXPIRED' || status === 'REJECTED';
}

async function readCartFromStorage(): Promise<CartSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartSnapshot) : null;
  } catch {
    return null;
  }
}

async function writeCartToStorage(cart: CartSnapshot | null): Promise<void> {
  if (cart) {
    await AsyncStorage.setItem(CART_KEY, JSON.stringify(cart));
  } else {
    await AsyncStorage.removeItem(CART_KEY);
  }
}

/**
 * Booking only stores IDs; when we rescue a cart from the server (no local
 * snapshot), ask Catalog for the property + room_type names + hero image so
 * the UI can render something human-readable (conflict modal, Trips "in
 * progress" card). Failures fall back to empty extras.
 */
async function resolveExtrasFromCatalog(
  propertyId: string,
  roomTypeId: string,
): Promise<CartExtras> {
  try {
    const { detail } = await getPropertyDetail(propertyId);
    const room = detail.room_types.find((rt) => rt.id === roomTypeId);
    const heroImage = room?.images
      ? [...room.images].sort((a, b) => a.display_order - b.display_order)[0]
      : undefined;
    return {
      property_name: detail.name,
      room_name: room?.name ?? '',
      image_url: heroImage?.url,
    };
  } catch {
    return { property_name: '', room_name: '' };
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn, loading: authLoading } = useAuth();
  const [cart, setCart] = useState<CartSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  // Guards against concurrent re-syncs triggered by hydration + AppState + deps.
  const syncingRef = useRef<boolean>(false);

  const persistAndSetCart = useCallback(async (next: CartSnapshot | null) => {
    setCart(next);
    await writeCartToStorage(next);
  }, []);

  const clearCart = useCallback(async () => {
    await persistAndSetCart(null);
  }, [persistAndSetCart]);

  /**
   * Re-sync the cached cart with the backend. Silent on 404/401 (treat as
   * cleared); on any other failure keep the cached snapshot so the user still
   * sees their cart — the server state will reconcile next time.
   */
  const resync = useCallback(
    async (cached: CartSnapshot): Promise<void> => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      try {
        const fresh = await getBookingDetail(cached.id);
        if (isTerminalStatus(fresh.status)) {
          await clearCart();
          return;
        }
        await persistAndSetCart({
          ...cached,
          ...fresh,
          // Preserve local extras (property_name/room_name/image_url).
          property_name: cached.property_name,
          room_name: cached.room_name,
          image_url: cached.image_url,
        });
      } catch (err) {
        if (axios.isAxiosError(err) && (err.response?.status === 404 || err.response?.status === 401)) {
          await clearCart();
        }
        // otherwise: keep cached snapshot, retry on next AppState change.
      } finally {
        syncingRef.current = false;
      }
    },
    [clearCart, persistAndSetCart],
  );

  // Hidratación: esperar a que auth termine, luego si hay sesión cargar y resyncar.
  // Si no hay snapshot local (ej. tras logout+login o kill de app en otro device),
  // consultar al server si el user tiene un CART activo y rescatarlo.
  useEffect(() => {
    if (authLoading) return;
    (async () => {
      if (!isLoggedIn) {
        setCart(null);
        setLoading(false);
        return;
      }
      const cached = await readCartFromStorage();
      if (cached) {
        setCart(cached);
        setLoading(false);
        await resync(cached);
        return;
      }
      // No local snapshot — try to rescue an active cart from the server.
      try {
        const mine = await listMyBookings();
        const activeCart = mine.find((b) => b.status === 'CART');
        if (activeCart) {
          const detail = await getBookingDetail(activeCart.id);
          if (!isTerminalStatus(detail.status)) {
            const extras = await resolveExtrasFromCatalog(
              detail.property_id,
              detail.room_type_id,
            );
            await persistAndSetCart({ ...detail, ...extras });
          }
        }
      } catch {
        // Silencioso: si algo falla, arrancamos sin cart. El 409 al crear nuevo
        // cubrirá el caso residual.
      }
      setLoading(false);
    })();
  }, [authLoading, isLoggedIn, persistAndSetCart, resync]);

  // Limpiar cart cuando el user hace logout (isLoggedIn: true -> false).
  const prevLoggedInRef = useRef<boolean>(isLoggedIn);
  useEffect(() => {
    if (prevLoggedInRef.current && !isLoggedIn) {
      void clearCart();
    }
    prevLoggedInRef.current = isLoggedIn;
  }, [isLoggedIn, clearCart]);

  // Re-sync al volver a foreground.
  useEffect(() => {
    if (!cart) return;
    const handler = (state: AppStateStatus) => {
      if (state === 'active') void resync(cart);
    };
    const sub = AppState.addEventListener('change', handler);
    return () => sub.remove();
  }, [cart, resync]);

  const createCart = useCallback(
    async (payload: CreateCartBookingPayload, extras: CartExtras): Promise<void> => {
      try {
        const booking = await createCartBooking(payload);
        await persistAndSetCart({ ...booking, ...extras });
      } catch (err) {
        // Server says the user already has another active cart (possibly from
        // a previous session). Recover it into local state with extras fetched
        // from Catalog so the UI can show hotel + room names in the conflict
        // modal / Trips card, then propagate.
        if (err instanceof ActiveCartConflictError) {
          try {
            const existing = await getBookingDetail(err.existingBookingId);
            const extras = await resolveExtrasFromCatalog(
              existing.property_id,
              existing.room_type_id,
            );
            await persistAndSetCart({ ...existing, ...extras });
          } catch {
            // Best effort — propagate the original conflict either way.
          }
        }
        throw err;
      }
    },
    [persistAndSetCart],
  );

  const cancelCart = useCallback(async (): Promise<void> => {
    if (!cart) return;
    try {
      await cancelCartBooking(cart.id);
    } catch (err) {
      // 409 means it's already non-CART on the server (e.g. expired) — still clear locally.
      if (!axios.isAxiosError(err) || err.response?.status !== 409) throw err;
    }
    await clearCart();
  }, [cart, clearCart]);

  const replaceCart = useCallback(
    async (payload: CreateCartBookingPayload, extras: CartExtras): Promise<void> => {
      await cancelCart();
      await createCart(payload, extras);
    },
    [cancelCart, createCart],
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        hasActiveCart: cart !== null,
        createCart,
        cancelCart,
        replaceCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

export { ActiveCartConflictError, InventoryUnavailableError, RateUnavailableError };
