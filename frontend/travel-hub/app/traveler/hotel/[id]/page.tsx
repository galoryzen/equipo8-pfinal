export async function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TravelerHotelDetailPage({ params }: Props) {
  const { id } = await params;
  return <h1>Traveler — Hotel {id}</h1>;
}
