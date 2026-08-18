import { Geist, Geist_Mono, Noto_Sans_Thai, Noto_Sans_Thai_Looped, Itim } from "next/font/google";
import localFont from "next/font/local";
import AppLayoutWrapper from "@/components/AppLayoutWrapper";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import "./globals.css";

// 1. Setup fonts
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const googleSans = localFont({
  src: [
    {
      path: "../../public/fonts/GoogleSans-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/GoogleSans-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-google-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ["latin", "thai"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-th",
  display: "swap",
});

// Setup Noto Sans Thai Looped
const notoSansThaiLooped = Noto_Sans_Thai_Looped({
  subsets: ["latin", "thai"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-th-looped",
  display: "swap",
});
const itim = Itim({
  subsets: ["latin", "thai"],
  weight: "400",
  variable: "--font-itim",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        geist.variable,
        googleSans.variable,
        geistMono.variable,
        notoSansThai.variable,
        notoSansThaiLooped.variable,
        itim.variable
      )}
    >
      <body className="font-mono antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AppLayoutWrapper>{children}</AppLayoutWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}