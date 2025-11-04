"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface NavLinkProps {
  href: string;
  children: ReactNode;
}

export function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  const baseClasses =
    "flex w-full items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors lg:justify-start";
  const activeClasses = "bg-neutral-900 text-white shadow-sm";
  const inactiveClasses = "text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900";

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
    >
      {children}
    </Link>
  );
}
