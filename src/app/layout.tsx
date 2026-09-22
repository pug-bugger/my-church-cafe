import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { WebSocketProvider } from "@/context/WebSocketContext";
import { Toaster } from "@/components/ui/sonner";
import { Navigation } from "@/components/Navigation";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider, languageInitScript } from "@/i18n";
import { paletteInitScript } from "@/lib/themes";

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
      <head>
        {/* Applies the saved palette before first paint, so a reload never
            flashes the default one. next-themes does the same for the mode. */}
        <script dangerouslySetInnerHTML={{ __html: paletteInitScript }} />
        {/* Puts the saved language on <html lang> before first paint, so
            hyphenation and screen-reader pronunciation are right immediately.
            The strings themselves are swapped by React on mount. */}
        <script dangerouslySetInnerHTML={{ __html: languageInitScript }} />
      </head>
      <body className="font-sans">
        <ThemeProvider>
          <LanguageProvider>
            <WebSocketProvider>
              <div className="flex min-h-screen flex-col overflow-hidden bg-background">
                <Navigation />
                <main className="relative flex-1 overflow-hidden">
                  {children}
                </main>
              </div>
              <Toaster />
            </WebSocketProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
