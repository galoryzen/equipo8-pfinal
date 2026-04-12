export type StatusPresentation = {
  label: string;
  color: 'success' | 'warning' | 'error' | 'default' | 'info';
};

export function getBookingStatusPresentation(status: string): StatusPresentation {
  switch (status) {
    case 'CONFIRMED':
      return { label: 'Confirmed', color: 'success' };
    case 'PENDING_PAYMENT':
      return { label: 'Payment pending', color: 'warning' };
    case 'PENDING_CONFIRMATION':
      return { label: 'Pending confirmation', color: 'warning' };
    case 'CART':
      return { label: 'Cart', color: 'default' };
    case 'CANCELLED':
      return { label: 'Cancelled', color: 'default' };
    case 'REJECTED':
      return { label: 'Rejected', color: 'error' };
    case 'EXPIRED':
      return { label: 'Expired', color: 'default' };
    default:
      return { label: status.replace(/_/g, ' '), color: 'info' };
  }
}

/** For MUI Chip `color` prop compatibility */
export function statusChipProps(status: string) {
  const { label, color } = getBookingStatusPresentation(status);
  return { label, color } as const;
}
