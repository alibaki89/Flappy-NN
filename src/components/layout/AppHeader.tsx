"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Vs CPU" },
  { href: "/about", label: "About" },
];

export default function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="app-header">
      <Link href="/" className="app-brand" aria-label="Go to Vs CPU">
        <span>ABProjects</span>
        <strong>Flappy NN</strong>
      </Link>

      <nav className="mode-switcher" aria-label="Game modes">
        {tabs.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`mode-tab ${active ? "active" : ""}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
