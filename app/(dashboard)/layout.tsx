import type { ReactNode } from "react";
import Link from "next/link";
import { NavLink } from "./_components/nav-link";

const navigation = [
  { href: "/projects", label: "プロジェクト" },
  { href: "/sections", label: "セクション" },
  { href: "/platforms", label: "プラットフォーム" },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-64">
          <Link
            href="/projects"
            className="block pb-4 text-center text-2xl font-semibold lg:pb-6 lg:text-left"
          >
            Amateras
          </Link>
          <nav className="flex flex-wrap justify-center gap-2 lg:flex-col lg:items-stretch lg:justify-start">
            {navigation.map((item) => (
              <NavLink key={item.href} href={item.href}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
