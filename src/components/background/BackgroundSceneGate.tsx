"use client";

import { usePathname } from "next/navigation";
import BackgroundScene from "./BackgroundScene";

export default function BackgroundSceneGate() {
  const pathname = usePathname();

  // The game page needs stable FPS more than decorative background animation.
  // Keep the animated background on About/other pages.
  if (pathname === "/") {
    return null;
  }

  return <BackgroundScene />;
}
