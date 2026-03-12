import type { Metadata } from "next";
import { Google_Sans, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppProviders from "@/providers/app-providers";
import "./globals.css";

const googleSans = Google_Sans({
  variable: "--font-google-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TaskHub",
  description: "Internal micro-task platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${googleSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppProviders>
          <TooltipProvider delay={200}>
            {children}
          </TooltipProvider>
        </AppProviders>
      </body>
    </html>
  );
}
