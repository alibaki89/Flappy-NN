import type { Metadata, Viewport } from "next";
import BackgroundSceneGate from "@/components/background/BackgroundSceneGate";
import AppHeader from "@/components/layout/AppHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flappy NN",
  description: "A flying game where players compete with a neural network.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <BackgroundSceneGate />
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
