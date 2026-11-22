import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { tools } from "@/lib/tools";

export default function Home() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-12 sm:px-8 sm:pt-16">
        <div className="mb-8 max-w-xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Tools</h1>
          <p className="mt-2 text-base text-muted-foreground">Choose a tool to get started.</p>
        </div>

        <section aria-label="Available tools" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tools.filter((tool) => tool.status === "available").map((tool) => {
            const Icon = tool.icon;
            return (
              <Card key={tool.id} className="group transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                <CardHeader className="pb-3">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-[var(--radius-control)] bg-accent text-primary">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{tool.category}</span>
                  </div>
                  <CardTitle className="text-lg">{tool.name}</CardTitle>
                  <CardDescription className="text-sm leading-6">{tool.description}</CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <div aria-hidden="true" className="relative flex h-36 items-center justify-center overflow-hidden rounded-[calc(var(--radius-card)-0.2rem)] bg-[radial-gradient(ellipse_at_15%_15%,#d8cbff_0,transparent_44%),radial-gradient(ellipse_at_85%_88%,#f0c9ba_0,transparent_44%),linear-gradient(135deg,#f1edff,#f8f5f1)] dark:bg-[radial-gradient(ellipse_at_15%_15%,#58438a_0,transparent_44%),radial-gradient(ellipse_at_85%_88%,#68483f_0,transparent_44%),linear-gradient(135deg,#292339,#312d2e)]">
                    <div className="absolute h-24 w-40 rotate-[-8deg] rounded-[var(--radius-card)] bg-white/50 shadow-[var(--shadow-card)] ring-1 ring-black/5 dark:bg-white/10" />
                    <div className="relative flex h-24 w-40 rotate-[4deg] items-center justify-center rounded-[var(--radius-card)] bg-white p-2 shadow-[var(--shadow-popover)] ring-1 ring-black/10 dark:bg-zinc-900">
                      <div className="h-full w-full rounded-[var(--radius-control)] bg-[linear-gradient(145deg,#ece6ff,#f8ede7)] dark:bg-[linear-gradient(145deg,#39314d,#473a39)]" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="justify-end border-t-0 bg-transparent pt-0">
                  <Link href={tool.href} className={buttonVariants({ size: "sm", className: "gap-1.5" })}>
                    Open tool <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </section>
      </main>
    </div>
  );
}
