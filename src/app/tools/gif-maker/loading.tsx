export default function GifMakerLoading() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 h-8 w-40 animate-pulse rounded bg-muted" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-h-[28rem] animate-pulse rounded-[var(--radius-card)] bg-muted" />
        <div className="min-h-[34rem] animate-pulse rounded-[var(--radius-card)] bg-muted" />
      </div>
    </main>
  );
}
