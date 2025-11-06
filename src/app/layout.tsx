import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BrandProvider } from "@/lib/BrandContext";
import RuntimeBridge from "@/lib/RuntimeBridge";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Diversity matrix",
  description: "Diversity matrix — creative planning tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* App header visible across all pages */}
        <header className="w-full bg-neutral-950/80 border-b border-neutral-900">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <h1 className="text-lg font-semibold text-neutral-100">Diversity matrix</h1>
          </div>
        </header>
        <BrandProvider>
          <RuntimeBridge />
          {children}
        </BrandProvider>
      </body>
    </html>
  );
}
