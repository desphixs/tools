import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { tools } from "@/lib/tools";

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-12 sm:px-8 sm:pt-16">
        <div className="mb-8 max-w-xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Tools</h1>
          <p className="mt-2 text-base text-muted-foreground">Choose a tool to get started.</p>
        </div>

        <section aria-label="Available tools" className="grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
          {tools.filter((tool) => tool.status === "available").map((tool) => {
            const Thumbnail = tool.thumbnail;
            return (
              <article
                key={tool.id}
                className="tool-card-surface group flex aspect-[1.04] min-w-0 flex-col rounded-[var(--radius-tool-card)] bg-card p-[2%] transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <div className="tool-card-thumbnail relative aspect-[1.9] w-full shrink-0 overflow-hidden rounded-[var(--radius-tool-thumbnail)] bg-muted">
                  <Thumbnail />
                </div>
                <div className="flex min-h-0 flex-1 flex-col px-[5%] pb-[4%] pt-[6%]">
                  <h2 className="font-heading text-[clamp(1.125rem,1.55vw,1.35rem)] font-semibold leading-tight tracking-tight text-card-foreground">
                    {tool.name}
                  </h2>
                  <p className="mt-2 line-clamp-1 text-[clamp(0.875rem,1.05vw,1rem)] leading-snug text-muted-foreground/80">
                    {tool.description}
                  </p>
                  <Link
                    href={tool.href}
                    className="tool-card-action mt-auto inline-flex h-8 w-fit min-w-[5.5rem] items-center justify-center rounded-full px-4 text-sm font-semibold focus-visible:outline-none"
                  >
                    {tool.buttonText ?? "Use tool"}
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
