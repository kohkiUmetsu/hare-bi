import type { ReactNode } from "react";
import { requireAuth } from "@/lib/auth-server";
import { NavLink } from "./_components/nav-link";
import { Header } from "./_components/header";

const adminNavigation = [
  { href: "/projects", label: "Projects", icon: "FolderKanban" },
  { href: "/sections", label: "Sections", icon: "Layout" },
  { href: "/platforms", label: "Platforms", icon: "Monitor" },
  { href: "/agents", label: "Agents", icon: "Building2" },
  { href: "/data-updates", label: "Updates", icon: "RefreshCw" },
  { href: "/settings", label: "Settings", icon: "Settings" },
];

const agentNavigation = [{ href: "/sections", label: "Sections", icon: "Layout" }];

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const user = await requireAuth();
  const navigation = user.role === "admin" ? adminNavigation : agentNavigation;

  return (
    <div className="min-h-screen bg-[var(--primary-color)] text-neutral-900">
      <Header userEmail={user.email} userRole={user.role} />
      <div className="flex w-full flex-col lg:flex-row">
        <aside className="w-full shrink-0 bg-[var(--accent-color)] px-2 py-4 sm:px-3 sm:py-6 lg:w-28">
          <nav className="flex flex-wrap justify-center gap-2 lg:flex-col lg:items-stretch lg:justify-start">
            {navigation.map((item) => (
              <NavLink key={item.href} href={item.href} icon={item.icon}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
