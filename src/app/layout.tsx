import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { WebSocketProvider } from "@/context/WebSocketContext";
import { Toaster } from "@/components/ui/sonner";
import { Navigation } from "@/components/Navigation";
import { ThemeProvider } from "@/components/theme-provider";

const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Church Cafe",
  description: "Church Cafe Order Management System",
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={manrope.variable}>
      <head />
      <body className="font-sans">
        <ThemeProvider>
          <WebSocketProvider>
            <div className="flex min-h-screen flex-col overflow-hidden bg-background">
              <Navigation />
              <main className="relative flex-1 overflow-hidden">{children}</main>
            </div>
            <Toaster />
          </WebSocketProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
