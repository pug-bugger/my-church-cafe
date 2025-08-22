import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WebSocketProvider } from "@/context/WebSocketContext";
import { Toaster } from "@/components/ui/sonner";
import { Navigation } from "@/components/Navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Church Cafe",
  description: "Church Cafe Order Management System",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16" },
      { url: "/favicon.ico", type: "image/png" },
    ],
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WebSocketProvider>
          <div className="min-h-screen bg-background flex flex-col">
            <Navigation />
            <main className="flex-1">{children}</main>
          </div>
          <Toaster />
        </WebSocketProvider>
      </body>
    </html>
  );
}
