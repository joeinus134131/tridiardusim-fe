import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const inter = localFont({
  src: "./fonts/Inter-latin.woff2",
  weight: "100 900",
  variable: "--font-geist-sans",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: "./fonts/JetBrainsMono-latin.woff2",
  weight: "100 800",
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NEXFLUX Lab 3D — 3D Arduino Simulator",
  description:
    "The easiest and most visual Arduino simulator on the web. Drag components, connect wires, write code, and run simulations in your browser.",
  keywords: [
    "Arduino",
    "simulator",
    "3D",
    "electronics",
    "IoT",
    "ESP32",
    "breadboard",
    "circuit",
    "education",
  ],
  authors: [{ name: "NEXFLUX" }],
  openGraph: {
    title: "NEXFLUX Lab 3D — 3D Arduino Simulator",
    description:
      "Drag-and-drop Arduino simulator with 3D visualization. Build circuits, write code, simulate electronics — all in your browser.",
    type: "website",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="h-full overflow-hidden antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
