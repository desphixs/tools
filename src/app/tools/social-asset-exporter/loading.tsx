export default function SocialAssetExporterLoading() {
  return (
    <main className="min-h-screen bg-background">
      <div className="h-16 border-b border-border" />
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        <div className="mb-5 h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-h-[55vh] animate-pulse rounded-[var(--radius-card)] bg-muted" />
          <div className="space-y-3">
            <div className="h-72 animate-pulse rounded-[var(--radius-card)] bg-muted" />
            <div className="h-96 animate-pulse rounded-[var(--radius-card)] bg-muted" />
          </div>
        </div>
      </div>
    </main>
  );
}
