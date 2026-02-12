import { Geist, Geist_Mono } from "next/font/google";
import { QueryProvider } from "@/providers/query-provider";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { DirectionProvider } from "@/components/ui/direction";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <DirectionProvider direction="ltr" dir="ltr">
            {children}
          </DirectionProvider>
        </QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
