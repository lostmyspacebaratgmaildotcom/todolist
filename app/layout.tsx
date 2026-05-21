import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CleaningAppProvider } from "@/lib/useCleaningApp";

export const metadata: Metadata = {
  title: "Apartment Reset",
  description: "A calm mobile-first cleaning routine for apartment living.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#022c22",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><CleaningAppProvider>{children}</CleaningAppProvider></body>
    </html>
  );
}
