const MS_PER_DAY = 86_400_000;

export function calculateNights(checkin: string, checkout: string): number {
  const [yi, mi, di] = checkin.split('-').map(Number);
  const [yo, mo, dou] = checkout.split('-').map(Number);
  if (!yi || !mi || !di || !yo || !mo || !dou) return 0;
  const a = Date.UTC(yi, mi - 1, di);
  const b = Date.UTC(yo, mo - 1, dou);
  return Math.max(0, Math.round((b - a) / MS_PER_DAY));
}

const TAX_RATE = 0.1;
const SERVICE_FEE_RATE = 0.05;

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

export function buildBreakdown(
  unitPrice: number,
  nights: number,
  originalUnitPrice?: number,
): RateBreakdown {
  const n = Math.max(0, nights);
  const subtotal = round2(unitPrice * n);
  const taxes = round2(subtotal * TAX_RATE);
  const serviceFee = round2(subtotal * SERVICE_FEE_RATE);
  const total = round2(subtotal + taxes + serviceFee);
  const result: RateBreakdown = {
    pricePerNight: unitPrice,
    nights: n,
    subtotal,
    taxes,
    serviceFee,
    total,
  };
  if (originalUnitPrice != null && originalUnitPrice > unitPrice) {
    const originalSubtotal = round2(originalUnitPrice * n);
    result.originalPricePerNight = originalUnitPrice;
    result.originalSubtotal = originalSubtotal;
    result.discount = round2(originalSubtotal - subtotal);
  }
  return result;
}
