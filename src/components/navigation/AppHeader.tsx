"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    label: "Vs CPU",
    href: "/",
  },
  {
    label: "About",
    href: "/about",
  },
];

export default function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <nav className="tabs">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              className={isActive ? "tab active" : "tab"}
              href={tab.href}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
