import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/lib/auth-context";
import { LanguageProvider } from "@/lib/language-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DebtTracker",
  description: "Track credit card debt between you and the people you share cards with.",
};

export const viewport: Viewport = {
  // A custom `viewport` export replaces Next's automatic
  // `width=device-width, initial-scale=1` entirely, so it has to be repeated
  // here — omitting it left mobile browsers rendering at desktop width.
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* overflow-x-hidden: app-wide guard so no element — native form
          controls on mobile in particular — can ever force the page to
          scroll/shift horizontally. */}
      <body className="min-h-full flex flex-col overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <LanguageProvider>{children}</LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
