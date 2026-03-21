import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WebSocketProvider } from "@/context/WebSocketContext";
import { Toaster } from "@/components/ui/sonner";
import { Navigation } from "@/components/Navigation";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={inter.className}>
        <ThemeProvider>
          <WebSocketProvider>
            <div className="min-h-screen bg-background flex flex-col overflow-hidden">
              <Navigation />
              <main className="flex-1 overflow-hidden relative">{children}</main>
            </div>
            <Toaster />
          </WebSocketProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
