import { signOut } from '@/lib/auth/actions';

export function SignOutButton() {
  return (
    <form action={signOut} className="mt-4">
      <button
        type="submit"
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
      >
        ログアウト
      </button>
    </form>
  );
}
