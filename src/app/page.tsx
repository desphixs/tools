import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { tools } from "@/lib/tools";

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-12 sm:px-8 sm:pt-16">
        <div className="max-w-xl">
          <h1 className="mb-8 text-2xl font-semibold tracking-tight sm:text-3xl">
            Choose a tool to get started.
          </h1>
        </div>

        <section aria-label="Available tools" className="grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {tools.filter((tool) => tool.status === "available").map((tool) => {
            const Thumbnail = tool.thumbnail;
            return (
              <Link
                key={tool.id}
                href={tool.href}
                className="tool-card-surface group flex aspect-[1.16] min-w-0 flex-col rounded-[var(--radius-tool-card)] bg-card p-[2%] no-underline transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <div className="tool-card-thumbnail relative aspect-[1.9] w-full shrink-0 overflow-hidden rounded-[var(--radius-tool-thumbnail)] bg-muted">
                  <Thumbnail />
                </div>
                <div className="px-[5%] pb-[4%] pt-[8%]">
                  <h2 className="font-heading text-[clamp(1.125rem,1.55vw,1.35rem)] font-semibold leading-tight tracking-tight text-card-foreground">
                    {tool.name}
                  </h2>
                  <p className="mt-2 line-clamp-1 text-[clamp(0.875rem,1.05vw,1rem)] leading-snug text-muted-foreground/80">
                    {tool.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </section>
      </main>
    </div>
  );
}
