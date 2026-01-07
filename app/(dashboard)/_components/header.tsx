import { signOut } from '@/lib/auth/actions';

interface HeaderProps {
  userEmail: string | null;
  userRole: 'admin' | 'agent';
}

export function Header({ userEmail, userRole }: HeaderProps) {
  return (
    <header className="bg-[var(--accent-color-600)] shadow-sm">
      <div className="flex items-center justify-between px-4 py-4 sm:px-6">
        <div className="text-xl font-semibold text-white">Amateras</div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 text-right text-sm font-medium text-white">
            <span>{userEmail ?? "未設定"}</span>
            <span className="bg-white px-2 py-0.5 text-[var(--accent-color-600)]">
              {userRole === "admin" ? "管理者" : "代理店"}
            </span>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md bg-[var(--accent-color-500)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              ログアウト
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
