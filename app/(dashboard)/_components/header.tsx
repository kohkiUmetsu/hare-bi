import { signOut } from '@/lib/auth/actions';

interface HeaderProps {
  userEmail: string | null;
  userRole: 'admin' | 'agent';
}

export function Header({ userEmail, userRole }: HeaderProps) {
  return (
    <header className="bg-[var(--white)] shadow-sm">
      <div className="flex items-center justify-between px-4 py-4 sm:px-6">
        <div className="text-xl font-semibold text-neutral-900">Amateras</div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm font-medium text-neutral-900">
              {userEmail ?? "未設定"}
            </div>
            <div className="text-xs text-neutral-500">
              {userRole === "admin" ? "管理者" : "代理店"}
            </div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
            >
              ログアウト
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
