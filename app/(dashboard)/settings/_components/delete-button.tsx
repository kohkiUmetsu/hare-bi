'use client';

import { useTransition } from 'react';

interface SettingsDeleteButtonProps {
  onDelete: () => Promise<void>;
  confirmMessage: string;
  label?: string;
}

export function SettingsDeleteButton({ onDelete, confirmMessage, label = '削除' }: SettingsDeleteButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      try {
        await onDelete();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '削除処理に失敗しました。もう一度お試しください。';
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
      {isPending ? '削除中...' : label}
    </button>
  );
}
