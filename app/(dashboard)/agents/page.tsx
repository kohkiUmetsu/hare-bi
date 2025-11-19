import { requireAdmin } from '@/lib/auth-server';
import { listAgents } from '@/lib/agents';
import { listSections } from '@/lib/metrics';
import { formatDate } from '@/lib/format';
import { CreateAgentForm } from './create-agent-form';

export default async function AgentsPage() {
  await requireAdmin();
  const [sections, agents] = await Promise.all([listSections(), listAgents()]);

  const sectionMap = new Map(sections.map((section) => [section.id, section]));

  function renderSection(sectionId: string | null) {
    if (!sectionId) {
      return '未設定';
    }

    const section = sectionMap.get(sectionId);

    if (!section) {
      return sectionId;
    }

    return section.projectName ? `${section.label}（${section.projectName}）` : section.label;
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">代理店アカウント管理</h1>
        <p className="text-sm text-neutral-500">
          管理者のみが代理店アカウントを作成できます。各代理店は1つのセクションしか閲覧できません。
        </p>
      </header>

      <section className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">新規代理店の作成</h2>
        <p className="mt-1 text-sm text-neutral-500">指定したメールに初期パスワードを共有してください。</p>
        <div className="mt-6">
          <CreateAgentForm sections={sections} />
        </div>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">登録済み代理店</h2>
        {agents.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">登録済みの代理店アカウントはまだありません。</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <th className="px-3 py-2">メールアドレス</th>
                  <th className="px-3 py-2">セクション</th>
                  <th className="px-3 py-2">作成日</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {agents.map((agent) => (
                  <tr key={agent.id}>
                    <td className="px-3 py-2 font-medium text-neutral-900">{agent.email}</td>
                    <td className="px-3 py-2">{renderSection(agent.sectionId ?? null)}</td>
                    <td className="px-3 py-2 text-neutral-500">
                      {formatDate(agent.createdAt ?? null)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
