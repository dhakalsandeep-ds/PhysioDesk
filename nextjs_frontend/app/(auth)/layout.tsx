import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import Providers  from "@/lib/providers";
import "../globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",  
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "PhysioDesk - Sign In",
  description: "Sign in to your clinic dashboard",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${ibmPlexMono.variable}`}>
      <body className="font-body bg-background text-text-primary antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
