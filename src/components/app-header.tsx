import Link from "next/link";
import type { MouseEventHandler } from "react";
import { AppHeaderNavigation } from "@/components/app-header-navigation";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthControl } from "@/features/auth/components/auth-control";

export function AppHeader({
  showToolsLink = false,
  onHomeClick,
  authDialogOpen = false,
  authDialogError = false,
  authReturnTo,
}: {
  showToolsLink?: boolean;
  onHomeClick?: MouseEventHandler<HTMLAnchorElement>;
  authDialogOpen?: boolean;
  authDialogError?: boolean;
  authReturnTo?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[1680px] px-5 sm:px-8">
      <header className="app-header-surface relative z-40 flex h-14 w-full items-center justify-between rounded-b-2xl border-x border-b px-3.5 sm:px-4">
        <BrandLogo onClick={onHomeClick} />

        <AppHeaderNavigation>
          {showToolsLink && (
            <Link href="/" onClick={onHomeClick} className="app-header-link sm:hidden">
              All tools
            </Link>
          )}
          <Link href="/pricing" className="app-header-link">
            Pricing
          </Link>
          <div className="app-header-auth">
            <AuthControl
              key={`${authDialogOpen}-${authDialogError}-${authReturnTo ?? ""}`}
              initialOpen={authDialogOpen}
              initialError={authDialogError}
              returnTo={authReturnTo}
            />
          </div>
          <div className="app-header-theme">
            <span className="sm:hidden">Theme</span>
            <ThemeToggle />
          </div>
        </AppHeaderNavigation>
      </header>
    </div>
  );
}
