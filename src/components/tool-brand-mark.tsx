import Image from "next/image";

export function ToolBrandMark({ className = "h-5" }: { className?: string }) {
  return (
    <span className="inline-flex shrink-0 items-center" aria-hidden="true">
      <Image
        src="/assets/branding/tools-black-logo.png"
        alt=""
        width={747}
        height={522}
        className={`${className} w-auto dark:hidden`}
      />
      <Image
        src="/assets/branding/tools-white-logo.png"
        alt=""
        width={747}
        height={522}
        className={`${className} hidden w-auto dark:block`}
      />
    </span>
  );
}
