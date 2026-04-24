import HotelDetailView from './HotelDetailView';

// Required by output: 'export'. Data is fetched client-side by HotelDetailView.
export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function HotelDetailPage({ params }: Props) {
  const { id } = await params;
  return <HotelDetailView hotelId={id} />;
}
