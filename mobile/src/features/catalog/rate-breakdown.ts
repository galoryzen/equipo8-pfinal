import type { NightPrice } from '@src/types/catalog';

const MS_PER_DAY = 86_400_000;

export function calculateNights(checkin: string, checkout: string): number {
  const [yi, mi, di] = checkin.split('-').map(Number);
  const [yo, mo, dou] = checkout.split('-').map(Number);
  if (!yi || !mi || !di || !yo || !mo || !dou) return 0;
  const a = Date.UTC(yi, mi - 1, di);
  const b = Date.UTC(yo, mo - 1, dou);
  return Math.max(0, Math.round((b - a) / MS_PER_DAY));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface RateBreakdown {
  pricePerNight: number;
  nights: number;
  subtotal: number;
  taxes: number;
  serviceFee: number;
  total: number;
  originalPricePerNight?: number;
  originalSubtotal?: number;
  discount?: number;
}

/** Server-computed fees from the catalog/booking response. */
export interface BreakdownFees {
  taxes: number;
  serviceFee: number;
}

/**
 * Build a breakdown from authoritative per-night pricing returned by the
 * catalog. The subtotal is the exact sum of per-night prices, so a 2-night
 * stay at $140 + $150 totals $290 (not 2 × average). ``pricePerNight`` is the
 * average — used by the panel to show "$X × N nights" without a wall of dates.
 *
 * ``fees`` come from the server so every surface (search/detail/cart/payment)
 * shows the same total — see backend ``shared.pricing.compute_fees``. When
 * absent (legacy rows), fees default to 0.
 */
export function buildBreakdownFromNights(
  nights: NightPrice[],
  fees?: BreakdownFees,
): RateBreakdown {
  const count = nights.length;
  const prices = nights.map((n) => round2(Number(n.price)));
  const originalPrices = nights.map((n) =>
    n.original_price != null ? round2(Number(n.original_price)) : undefined,
  );
  const subtotal = round2(prices.reduce((acc, p) => acc + p, 0));
  const hasDiscount = originalPrices.some((p) => p != null);
  const originalSubtotal = round2(
    originalPrices.reduce<number>((acc, op, i) => acc + (op ?? prices[i]), 0),
  );
  const taxes = round2(fees?.taxes ?? 0);
  const serviceFee = round2(fees?.serviceFee ?? 0);
  const total = round2(subtotal + taxes + serviceFee);
  const pricePerNight = count > 0 ? round2(subtotal / count) : 0;

  const result: RateBreakdown = {
    pricePerNight,
    nights: count,
    subtotal,
    taxes,
    serviceFee,
    total,
  };
  if (hasDiscount && originalSubtotal > subtotal) {
    result.originalSubtotal = originalSubtotal;
    result.discount = round2(originalSubtotal - subtotal);
    if (count > 0) {
      result.originalPricePerNight = round2(originalSubtotal / count);
    }
  }
  return result;
}
