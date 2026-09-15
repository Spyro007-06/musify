interface ArtistPageProps {
  params: Promise<{ id: string }>;
}

export default async function ArtistPage({ params }: ArtistPageProps) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-white">Artist Profile</h1>
      <p className="text-neutral-400">Viewing artist ID: {id}</p>
    </div>
  );
}
