"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import Image from "next/image";
import { Building2, ListOrdered, RefreshCw, Settings } from "lucide-react";

const iconMap = {
  Project: "/icons/project.svg",
  Section: "/icons/section.svg",
  Platform: "/icons/platform.svg",
  AdRanking: ListOrdered,
  Building2,
  RefreshCw,
  Settings,
};

export type NavLinkIcon = keyof typeof iconMap;

interface NavLinkProps {
  href: string;
  children: ReactNode;
  icon?: NavLinkIcon;
  navToggleId?: string;
}

export function NavLink({ href, children, icon, navToggleId }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  const iconValue = icon ? iconMap[icon] : null;
  const isSvgIcon = typeof iconValue === "string";
  const LucideIcon = !isSvgIcon && iconValue ? iconValue : null;

  const baseClasses =
    "flex w-full flex-col items-center justify-center gap-1.5 py-4 text-sm font-medium transition-colors";
  const activeClasses = "bg-[var(--accent-color-400)] text-white shadow-sm";
  const inactiveClasses = "text-white/80 hover:bg-white/10 hover:text-white px-2";

  useEffect(() => {
    if (!navToggleId) {
      return;
    }
    const toggle = document.getElementById(navToggleId) as HTMLInputElement | null;
    if (toggle?.checked) {
      toggle.checked = false;
    }
  }, [pathname, navToggleId]);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
      onClick={() => {
        if (!navToggleId) {
          return;
        }
        const toggle = document.getElementById(navToggleId) as HTMLInputElement | null;
        if (toggle?.checked) {
          toggle.checked = false;
        }
      }}
    >
      {isSvgIcon && iconValue && (
        <Image src={iconValue} alt={children as string} width={24} height={24} />
      )}
      {LucideIcon && <LucideIcon className="h-6 w-6" />}
      <span className="text-sm leading-tight">{children}</span>
    </Link>
  );
}
