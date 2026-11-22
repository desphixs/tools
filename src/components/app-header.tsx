import Link from "next/link";
import { Frame } from "lucide-react";
import type { MouseEventHandler } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppHeader({ showToolsLink = false, onHomeClick }: { showToolsLink?: boolean; onHomeClick?: MouseEventHandler<HTMLAnchorElement> }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border/80 px-5 sm:px-8">
      <Link href="/" onClick={onHomeClick} className="inline-flex items-center gap-2.5 rounded-[var(--radius-control)] font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
        <span className="flex size-8 items-center justify-center rounded-[var(--radius-control)] bg-primary text-primary-foreground">
          <Frame className="size-4" aria-hidden="true" />
        </span>
        <span>Tools</span>
      </Link>
      <div className="flex items-center gap-2">
        {showToolsLink && (
          <Link href="/" onClick={onHomeClick} className="hidden rounded-[var(--radius-control)] px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:inline-flex">
            All tools
          </Link>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
