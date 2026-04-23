import { MOCK_HOTELS } from '../_data';
import HotelDetailView from './HotelDetailView';

export function generateStaticParams() {
  return MOCK_HOTELS.map((hotel) => ({ id: hotel.id }));
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function HotelDetailPage({ params }: Props) {
  const { id } = await params;
  return <HotelDetailView hotelId={id} />;
}
