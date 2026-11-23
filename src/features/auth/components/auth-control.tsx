"use client";

import { useState } from "react";
import { ArrowRight, LoaderCircle, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { authClient } from "@/features/auth/client/auth-client";
import { safeReturnTo } from "@/features/auth/lib/return-to";

type AuthControlProps = {
  initialOpen?: boolean;
  initialError?: boolean;
  returnTo?: string;
};

export function AuthControl({
  initialOpen = false,
  initialError = false,
  returnTo,
}: AuthControlProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [open, setOpen] = useState(initialOpen);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    initialError ? "Google sign-in didn’t complete. Try again." : "",
  );

  const callbackURL = safeReturnTo(returnTo ?? pathname);

  async function continueWithGoogle() {
    setBusy(true);
    setError("");

    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL,
        errorCallbackURL: `/?authError=1&next=${encodeURIComponent(callbackURL)}`,
      });

      if (result.error) {
        setError(result.error.message || "Google sign-in couldn’t start. Try again.");
        setBusy(false);
      }
    } catch {
      setError("Google sign-in couldn’t start. Check your connection and try again.");
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setError("You couldn’t be signed out. Try again.");
        setOpen(true);
        setBusy(false);
        return;
      }
      router.replace("/");
    } catch {
      setError("You couldn’t be signed out. Check your connection and try again.");
      setOpen(true);
      setBusy(false);
    }
  }

  const user = session?.user;

  return (
    <>
      {user ? (
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="hidden max-w-40 truncate text-sm text-muted-foreground sm:inline"
            title={user.name || user.email}
          >
            {user.name || user.email}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={signOut}
            aria-label="Sign out"
          >
            <LogOut data-icon="inline-start" aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setError("");
            setOpen(true);
          }}
          disabled={isPending}
        >
          {isPending ? "Loading…" : "Sign in"}
        </Button>
      )}

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (busy) return;
          setOpen(nextOpen);
          if (!nextOpen && initialOpen) router.replace("/", { scroll: false });
        }}
      >
        <DialogContent className="gap-5 p-6 sm:max-w-md">
          <DialogHeader className="gap-2 pr-8">
            <DialogTitle className="text-lg">Sign in to Tools</DialogTitle>
            <DialogDescription>
              Continue with your Google account to open the tools.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full"
              onClick={continueWithGoogle}
              disabled={busy}
            >
              {busy ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <ArrowRight aria-hidden="true" />
              )}
              {busy ? "Connecting to Google…" : "Continue with Google"}
            </Button>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
