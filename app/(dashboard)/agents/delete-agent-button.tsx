'use client';

import { useTransition } from 'react';
import { deleteAgent } from './actions';

interface DeleteAgentButtonProps {
  agentId: string;
  email: string;
}

export function DeleteAgentButton({ agentId, email }: DeleteAgentButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    const confirmed = window.confirm(`${email} を削除しますか？`);

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteAgent(agentId);
      } catch (error) {
        const message = error instanceof Error ? error.message : '代理店の削除に失敗しました。';
        // eslint-disable-next-line no-alert
        alert(message);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? '削除中...' : '削除'}
    </button>
  );
}
