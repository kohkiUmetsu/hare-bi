import { LogOut, Menu } from 'lucide-react';
import Image from 'next/image';
import { signOut } from '@/lib/auth/actions';

interface HeaderProps {
  userEmail: string | null;
  userRole: 'admin' | 'agent';
  navToggleId: string;
}

export function Header({ userEmail, userRole, navToggleId }: HeaderProps) {
  return (
    <header className="bg-[var(--accent-color-600)] shadow-sm">
      <div className="px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Image src="/hare-logo.svg" alt="Hare Logo" width={36} height={36} priority />
            <div className="text-lg font-semibold text-white sm:text-xl">Amateras</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden flex-wrap items-center justify-end gap-2 text-sm font-medium text-white lg:flex lg:gap-3">
              <span className="max-w-[220px] truncate sm:max-w-none">
                {userEmail ?? "未設定"}
              </span>
              <span className="bg-white px-2 py-0.5 text-[11px] font-semibold text-[var(--accent-color-600)]">
                {userRole === "admin" ? "管理者" : "代理店"}
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-md bg-[var(--accent-color-500)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  <LogOut className="h-4 w-4" />
                  LOGOUT
                </button>
              </form>
            </div>
            <label
              htmlFor={navToggleId}
              className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--accent-color-500)] text-white lg:hidden"
              aria-label="メニューを開く"
            >
              <Menu className="h-5 w-5" />
            </label>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 text-sm font-medium text-white lg:hidden">
          <span className="max-w-[220px] truncate sm:max-w-none">
            {userEmail ?? "未設定"}
          </span>
          <span className="bg-white px-2 py-0.5 text-[11px] font-semibold text-[var(--accent-color-600)]">
            {userRole === "admin" ? "管理者" : "代理店"}
          </span>
        </div>
      </div>
    </header>
  );
}
