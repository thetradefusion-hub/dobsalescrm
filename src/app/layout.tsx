import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import {
  BRAND_APPLE_TOUCH,
  BRAND_DESCRIPTION,
  BRAND_FAVICON,
  BRAND_ICON,
  BRAND_ICON_512,
  BRAND_NAME,
  BRAND_SHORT_NAME,
} from "@/lib/brand";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemedToaster } from "@/components/themed-toaster";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: BRAND_NAME,
    template: `%s | ${BRAND_NAME}`,
  },
  description: BRAND_DESCRIPTION,
  robots: {
    index: false,
    follow: false,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: BRAND_SHORT_NAME,
  },
  icons: {
    icon: [
      { url: BRAND_FAVICON, sizes: "32x32", type: "image/x-icon" },
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: BRAND_ICON, sizes: "192x192", type: "image/png" },
      { url: BRAND_ICON_512, sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: BRAND_APPLE_TOUCH, sizes: "180x180", type: "image/png" }],
    shortcut: [BRAND_FAVICON],
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F0F2F5" },
    { media: "(prefers-color-scheme: dark)", color: "#111B21" },
  ],
  colorScheme: "light dark",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-wa-deep text-wa-text font-sans">
        <ThemeProvider>
          {children}
          <ThemedToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
