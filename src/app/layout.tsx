import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ArduSim — 3D Arduino Simulator",
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
  authors: [{ name: "ArduSim" }],
  openGraph: {
    title: "ArduSim — 3D Arduino Simulator",
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
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="h-full overflow-hidden antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
