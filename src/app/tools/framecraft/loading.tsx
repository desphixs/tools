export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="h-16 border-b border-border" />
      <div className="grid flex-1 md:grid-cols-[minmax(0,1fr)_370px]">
        <div className="flex min-h-[50vh] items-center justify-center bg-muted/40 p-8">
          <div className="aspect-video w-full max-w-4xl animate-pulse rounded-[var(--radius-card)] bg-muted" />
        </div>
        <div className="animate-pulse border-l border-border p-5">
          <div className="mb-6 h-8 rounded-[var(--radius-control)] bg-muted" />
          <div className="space-y-5">{[1, 2, 3, 4].map((item) => <div key={item} className="h-9 rounded-[var(--radius-control)] bg-muted" />)}</div>
        </div>
      </div>
    </main>
  );
}
