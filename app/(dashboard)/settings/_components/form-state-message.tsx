'use client';

import type { SettingsActionState } from '../actions';

interface FormStateMessageProps {
  state: SettingsActionState;
}

export function FormStateMessage({ state }: FormStateMessageProps) {
  if (!state.message || !state.status) {
    return null;
  }

  const isSuccess = state.status === 'success';
  const baseClass =
    'px-3 py-2 text-sm ' +
    (isSuccess
      ? 'border border-green-200 bg-green-50 text-green-800'
      : 'border border-red-200 bg-red-50 text-red-700');

  return <p className={baseClass}>{state.message}</p>;
}
