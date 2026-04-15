'use client';

import type { PropertyByIdMap } from '@/app/hooks/useMyTripsCatalog';
import { primaryPropertyId } from '@/app/lib/myTrips/formatting';
import type { BookingListItem } from '@/app/lib/types/booking';
import Stack from '@mui/material/Stack';

import BookingCard from '@/components/traveler/BookingCard';

interface BookingListProps {
  bookings: BookingListItem[];
  propertyById: PropertyByIdMap;
}

export default function BookingList({ bookings, propertyById }: BookingListProps) {
  return (
    <Stack spacing={3}>
      {bookings.map((b) => {
        const pid = primaryPropertyId(b);
        const prop = pid ? propertyById[pid] : null;
        return <BookingCard key={b.id} booking={b} property={prop ?? undefined} />;
      })}
    </Stack>
  );
}
