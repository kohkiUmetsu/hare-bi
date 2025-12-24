"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { FolderKanban, Layout, Monitor, Building2, RefreshCw, Settings } from "lucide-react";

const iconMap = {
  FolderKanban,
  Layout,
  Monitor,
  Building2,
  RefreshCw,
  Settings,
};

interface NavLinkProps {
  href: string;
  children: ReactNode;
  icon?: keyof typeof iconMap;
}

export function NavLink({ href, children, icon }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  const Icon = icon ? iconMap[icon] : null;

  const baseClasses =
    "flex w-full flex-col items-center justify-center gap-1.5 rounded-md px-2 py-2.5 text-sm font-medium transition-colors";
  const activeClasses = "bg-[var(--accent-color)]/20 text-white shadow-sm";
  const inactiveClasses = "text-white/80 hover:bg-white/10 hover:text-white";

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
    >
      {Icon && <Icon className="h-6 w-6" />}
      <span className="text-[10px] leading-tight">{children}</span>
    </Link>
  );
}
