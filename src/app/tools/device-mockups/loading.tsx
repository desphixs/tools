export default function DeviceMockupsLoading() {
  return (
    <main className="grid min-h-screen grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
      <aside className="order-1 border-b border-border p-4 xl:border-r xl:border-b-0">
        <div className="mb-4 h-5 w-24 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <div className="aspect-[16/10] animate-pulse rounded-[var(--radius-card)] bg-muted" />
          <div className="aspect-[16/10] animate-pulse rounded-[var(--radius-card)] bg-muted" />
        </div>
      </aside>
      <section className="order-2 min-h-[48vh] animate-pulse bg-muted xl:min-h-screen" aria-label="Loading mockup preview" />
      <aside className="order-3 min-h-80 animate-pulse border-t border-border bg-muted/40 xl:border-t-0 xl:border-l" />
    </main>
  );
}
