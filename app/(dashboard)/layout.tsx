import type { ReactNode } from "react";
import Link from "next/link";
import { requireAuth } from "@/lib/auth-server";
import { NavLink } from "./_components/nav-link";
import { SignOutButton } from "./_components/sign-out-button";

const adminNavigation = [
  { href: "/projects", label: "プロジェクト" },
  { href: "/sections", label: "セクション" },
  { href: "/platforms", label: "プラットフォーム" },
  { href: "/agents", label: "代理店管理" },
  { href: "/data-updates", label: "データ更新設定" },
  { href: "/settings", label: "設定" },
];

const agentNavigation = [{ href: "/sections", label: "セクション" }];

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const user = await requireAuth();
  const navigation = user.role === "admin" ? adminNavigation : agentNavigation;

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-64">
          <Link
            href={user.role === "admin" ? "/projects" : "/sections"}
            className="block pb-4 text-center text-2xl font-semibold lg:pb-6 lg:text-left"
          >
            Amateras
          </Link>

          <div className="rounded-lg border border-neutral-200 bg-white px-4 py-4 shadow-sm">
            <div className="text-sm text-neutral-500">ログイン中のユーザー</div>
            <div className="mt-1 text-base font-medium text-neutral-900">
              {user.email ?? "未設定"}
            </div>
            <div className="text-xs text-neutral-500">
              権限: {user.role === "admin" ? "管理者" : "代理店"}
            </div>
            <SignOutButton />
          </div>

          <nav className="mt-6 flex flex-wrap justify-center gap-2 lg:flex-col lg:items-stretch lg:justify-start">
            {navigation.map((item) => (
              <NavLink key={item.href} href={item.href}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
