import Image from "next/image";
import Link from "next/link";
import type { MouseEventHandler } from "react";

export function BrandLogo({
  onClick,
}: {
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}) {
  return (
    <Link
      href="/"
      onClick={onClick}
      aria-label="Tools home"
      className="inline-flex shrink-0 items-center justify-center rounded-[var(--radius-control)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
    >
      <Image
        src="/assets/branding/tools-black-logo-text.png"
        alt=""
        width={2092}
        height={522}
        className="h-7 w-auto dark:hidden"
      />
      <Image
        src="/assets/branding/tools-white-logo-text.png"
        alt=""
        width={2092}
        height={522}
        className="hidden h-7 w-auto dark:block"
      />
    </Link>
  );
}
