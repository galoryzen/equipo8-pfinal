interface Props {
  params: Promise<{ id: string }>;
}

export default async function ManagerHotelPage({ params }: Props) {
  const { id } = await params;
  return <h1>Manager — Hotel {id}</h1>;
}
