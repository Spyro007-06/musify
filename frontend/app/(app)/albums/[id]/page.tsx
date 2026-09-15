interface AlbumPageProps {
  params: Promise<{ id: string }>;
}

export default async function AlbumPage({ params }: AlbumPageProps) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-white">Album</h1>
      <p className="text-neutral-400">Viewing album ID: {id}</p>
    </div>
  );
}
