import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { StructuredData } from "@/components/structured-data";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, websiteStructuredData } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Online Creative Tools for Screenshots, Collages, and GIFs | Tools",
    template: "%s | Tools",
  },
  applicationName: SITE_NAME,
  description: SITE_DESCRIPTION,
  keywords: [
    "online image tools",
    "screenshot editor",
    "App Store screenshot maker",
    "photo collage maker",
    "device mockup generator",
    "GIF maker",
    "social media image exporter",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "Online Creative Tools for Screenshots, Collages, and GIFs | Tools",
    description: SITE_DESCRIPTION,
    url: "/",
    images: [{
      url: "/assets/branding/tools-black-logo-text.png",
      width: 2092,
      height: 522,
      alt: "Tools",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Online Creative Tools | Tools",
    description: SITE_DESCRIPTION,
    images: ["/assets/branding/tools-black-logo-text.png"],
  },
  icons: {
    icon: "/assets/branding/favicon.png",
    shortcut: "/assets/branding/favicon.png",
    apple: "/assets/branding/favicon.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <StructuredData data={websiteStructuredData} />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="tools-theme">
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
