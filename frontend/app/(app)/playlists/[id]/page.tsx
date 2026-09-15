interface PlaylistPageProps {
  params: Promise<{ id: string }>;
}

export default async function PlaylistPage({ params }: PlaylistPageProps) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-white">Playlist</h1>
      <p className="text-neutral-400">Viewing playlist ID: {id}</p>
    </div>
  );
}
