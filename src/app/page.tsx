import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ToolThumbnail } from "@/components/tool-thumbnails";
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
                  <ToolThumbnail toolId={tool.id} />
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
