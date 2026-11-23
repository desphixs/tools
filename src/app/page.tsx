import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { StructuredData } from "@/components/structured-data";
import {
  HeaderEntrance,
  IntroEntrance,
  ToolCardEntrance,
} from "@/components/page-entrance-motion";
import { tools } from "@/lib/tools";
import { toolDirectoryStructuredData } from "@/lib/seo";
import { safeReturnTo } from "@/features/auth/lib/return-to";

type HomeSearchParams = {
  next?: string | string[];
  authError?: string | string[];
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  return (
      <div className="min-h-screen bg-white dark:bg-black">
        <StructuredData data={toolDirectoryStructuredData} />
        <HeaderEntrance>
          <Suspense fallback={<AppHeader />}>
            <HomeHeader searchParams={searchParams} />
          </Suspense>
        </HeaderEntrance>
        <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-12 sm:px-8 sm:pt-16">
          <IntroEntrance>
            <div className="max-w-xl">
              <h1 className="mb-8 text-2xl font-semibold tracking-tight sm:text-3xl">
                Choose a tool to get started.
              </h1>
            </div>
          </IntroEntrance>

          <section aria-label="Available tools" className="grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {tools.filter((tool) => tool.status === "available").map((tool, index) => {
              const Thumbnail = tool.thumbnail;
              return (
                <ToolCardEntrance key={tool.id} index={index}>
                  <Link
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
                </ToolCardEntrance>
              );
            })}
          </section>
        </main>
      </div>
  );
}

async function HomeHeader({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  const params = await searchParams;
  const requestedReturnTo = safeReturnTo(first(params.next));

  return (
    <AppHeader
      authDialogOpen={first(params.authError) === "1"}
      authDialogError={first(params.authError) === "1"}
      authReturnTo={requestedReturnTo}
    />
  );
}
