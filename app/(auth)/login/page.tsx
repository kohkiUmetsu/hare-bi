import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-server';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(user.role === 'admin' ? '/projects' : '/sections');
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Amateras（アマテラス）</h1>
        <p className="text-sm text-neutral-500">
          複数媒体の広告データを自動で集約・可視化する集計プラットフォームです
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
