import type { ReactNode } from "react";
import { requireAuth } from "@/lib/auth-server";
import { NavLink, type NavLinkIcon } from "./_components/nav-link";
import { Header } from "./_components/header";
import { signOut } from "@/lib/auth/actions";
import { LogOut } from "lucide-react";

type NavigationItem = {
  href: string;
  label: string;
  icon: NavLinkIcon;
};

const adminNavigation: NavigationItem[] = [
  { href: "/projects", label: "Projects", icon: "Project" },
  { href: "/sections", label: "Sections", icon: "Section" },
  { href: "/platforms", label: "Platforms", icon: "Platform" },
  { href: "/agents", label: "Agents", icon: "Building2" },
  { href: "/data-updates", label: "Updates", icon: "RefreshCw" },
  { href: "/settings", label: "Settings", icon: "Settings" },
];
const agentNavigation: NavigationItem[] = [
  { href: "/sections", label: "Sections", icon: "Section" },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const user = await requireAuth();
  const navigation = user.role === "admin" ? adminNavigation : agentNavigation;
  const navToggleId = "dashboard-nav-toggle";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--primary-color)] text-neutral-900">
      <Header userEmail={user.email} userRole={user.role} navToggleId={navToggleId} />
      <div className="relative flex w-full flex-1 flex-col lg:flex-row">
        <input id={navToggleId} type="checkbox" className="peer sr-only" />
        <label
          htmlFor={navToggleId}
          className="fixed inset-0 z-30 hidden bg-black/40 peer-checked:block lg:hidden"
          aria-hidden="true"
        />
        <aside className="fixed inset-y-0 right-0 left-auto z-40 w-64 translate-x-full origin-right bg-[var(--accent-color-500)] shadow-lg transition-transform duration-200 peer-checked:translate-x-0 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-28 lg:translate-x-0 lg:shadow-none">
          <nav className="flex h-full flex-col items-stretch pt-20 lg:pt-0">
            {navigation.map((item) => (
              <NavLink key={item.href} href={item.href} icon={item.icon} navToggleId={navToggleId}>
                {item.label}
              </NavLink>
            ))}
            <form action={signOut} className="mt-auto pb-6 lg:hidden">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
              >
                <LogOut className="h-4 w-4" />
                LOGOUT
              </button>
            </form>
          </nav>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
