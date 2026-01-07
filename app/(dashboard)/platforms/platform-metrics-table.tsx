'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DailyMetricRow, PlatformOption } from '@/lib/metrics';
import { formatMetric } from '@/lib/format';
import { useServerActionState } from '@/components/use-server-action-state';
import { updatePlatformActualCv, type PlatformMetricsActionState } from './actions';

interface PlatformMetricsTableProps {
  metrics: DailyMetricRow[];
  platform: PlatformOption;
  actualCvEdits?: Record<string, boolean>;
}

const initialState: PlatformMetricsActionState = { status: null };
const countFormatter = new Intl.NumberFormat('ja-JP');

function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function PlatformMetricsTable({
  metrics,
  platform,
  actualCvEdits,
}: PlatformMetricsTableProps) {
  const [state, formAction] = useServerActionState<PlatformMetricsActionState>(
    updatePlatformActualCv,
    initialState
  );
  const [editingRow, setEditingRow] = useState<DailyMetricRow | null>(null);
  const [actualCvInput, setActualCvInput] = useState<string>('0');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<PlatformMetricsActionState>({ status: null });
  const router = useRouter();

  const showPerformanceFee = useMemo(
    () => metrics.some((row) => row.performanceBasedFee !== null && row.performanceBasedFee !== undefined),
    [metrics]
  );

  const openEditor = useCallback(
    (row: DailyMetricRow) => {
      setEditingRow(row);
      setActualCvInput(String(row.actualCv ?? 0));
      setRequestId(generateRequestId());
    },
    []
  );

  const closeEditor = useCallback(() => {
    setEditingRow(null);
    setRequestId(null);
    setIsSubmitting(false);
  }, []);

  useEffect(() => {
    if (!requestId) {
      return;
    }
    if (state.requestId !== requestId) {
      return;
    }

    if (state.status === 'success') {
      setToast(state);
      closeEditor();
      router.refresh();
    }
  }, [state, requestId, closeEditor, router]);

  const errorMessage =
    requestId && state.requestId === requestId && state.status === 'error'
      ? state.message
      : null;

  const parsedActualCv = Number(actualCvInput);
  const currentValue = editingRow?.actualCv ?? 0;
  const isActualCvValid = Number.isFinite(parsedActualCv) && parsedActualCv >= 0;
  const deltaValue = isActualCvValid ? parsedActualCv - currentValue : 0;
  const hasChanges = isActualCvValid && parsedActualCv !== currentValue;

  const adjustActualCv = (delta: number) => {
    setActualCvInput((prev) => {
      const value = Number(prev);
      const base = Number.isFinite(value) ? value : 0;
      return String(Math.max(0, base + delta));
    });
  };

  const handleAction = async (formData: FormData) => {
    if (!editingRow || !requestId) {
      return;
    }
    setIsSubmitting(true);
    try {
      await formAction(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearToast = () => setToast({ status: null });

  if (!metrics.length) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      {toast.status && toast.message ? (
        <div
          className={`flex items-center justify-between rounded-md border px-4 py-2 text-sm ${
            toast.status === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            className="ml-4 text-xs font-semibold text-current"
            onClick={clearToast}
          >
            閉じる
          </button>
        </div>
      ) : null}

      <p className="text-sm text-neutral-500">
        各行をクリックすると、対象日の実CVを直接編集できます。
      </p>

      <section className="overflow-x-auto rounded-lg border border-neutral-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-neutral-200 text-xs sm:text-sm">
          <thead className="bg-neutral-50 text-left text-[11px] uppercase tracking-wider text-neutral-500 sm:text-xs">
            <tr>
              <th className="px-4 py-3">日付</th>
              <th className="px-4 py-3">広告費</th>
              <th className="px-4 py-3">表示回数</th>
              <th className="px-4 py-3">クリック</th>
              <th className="px-4 py-3">MSP CV</th>
              <th className="px-4 py-3">実CV</th>
              <th className="px-4 py-3">媒体CV</th>
              <th className="px-4 py-3">CPA</th>
              <th className="px-4 py-3">CPC</th>
              <th className="px-4 py-3">CVR</th>
              <th className="px-4 py-3">mCV</th>
              <th className="px-4 py-3">mCVR</th>
              <th className="px-4 py-3">mCPA</th>
              <th className="px-4 py-3">CPM</th>
              {showPerformanceFee ? <th className="px-4 py-3">成果報酬費</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {metrics.map((row) => (
              <tr
                key={row.date}
                tabIndex={0}
                onClick={() => openEditor(row)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openEditor(row);
                  }
                }}
                className="whitespace-nowrap cursor-pointer transition-colors hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400"
              >
                <td className="px-4 py-3 text-neutral-700">{row.date}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.actualAdCost)}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.impressions)}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.clicks)}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.mspCv)}</td>
                <td
                  className={`px-4 py-3 ${
                    actualCvEdits?.[row.date] ? 'text-amber-600' : 'text-neutral-900'
                  }`}
                >
                  {formatMetric(row.actualCv)}
                </td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.platformCv)}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.cpa, 'decimal')}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.cpc, 'decimal')}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.cvr, 'percent')}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.mCv)}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.mCvr, 'percent')}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.mCpa, 'decimal')}</td>
                <td className="px-4 py-3 text-neutral-900">{formatMetric(row.cpm, 'decimal')}</td>
                {showPerformanceFee ? (
                  <td className="px-4 py-3 text-neutral-900">{formatMetric(row.performanceBasedFee)}</td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {editingRow ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={closeEditor}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase text-neutral-500">編集対象</p>
                <h3 className="text-xl font-semibold text-neutral-900">{platform.label}</h3>
                <p className="text-sm text-neutral-500">{editingRow.date}</p>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-full px-3 py-1 text-sm text-neutral-500 hover:bg-neutral-100"
              >
                閉じる
              </button>
            </div>

            <p className="mt-4 text-sm text-neutral-600">
              実CVのみ編集可能です。入力または下のボタンで値を調整して保存してください。
            </p>

            <form action={handleAction} className="mt-4 flex flex-col gap-4">
              <input type="hidden" name="platform_id" value={platform.id} />
              <input type="hidden" name="platform_label" value={platform.label} />
              <input type="hidden" name="section_id" value={platform.sectionId ?? ''} />
              <input type="hidden" name="project_id" value={platform.projectId ?? ''} />
              <input type="hidden" name="target_date" value={editingRow.date} />
              <input type="hidden" name="request_id" value={requestId ?? ''} />

              <div>
                <label htmlFor="actual_cv" className="text-sm font-medium text-neutral-700">
                  実CV
                </label>
                <input
                  id="actual_cv"
                  name="actual_cv"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-lg font-semibold text-neutral-900 focus:border-neutral-500 focus:outline-none"
                  value={actualCvInput}
                  onChange={(event) => setActualCvInput(event.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {[-10, -1, +1, +10].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => adjustActualCv(value)}
                    className="rounded-md border border-neutral-300 px-3 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    {value > 0 ? `+${value}` : value}
                  </button>
                ))}
              </div>

              <div className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
                <p>
                  現在: <span className="font-semibold text-neutral-900">{countFormatter.format(currentValue)}</span>
                </p>
                <p>
                  変更後:{' '}
                  <span className="font-semibold text-neutral-900">
                    {isActualCvValid ? countFormatter.format(parsedActualCv) : '—'}
                  </span>
                </p>
                <p>
                  差分:{' '}
                  <span
                    className={
                      deltaValue === 0
                        ? 'text-neutral-500'
                        : deltaValue > 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }
                  >
                    {isActualCvValid
                      ? `${deltaValue > 0 ? '+' : ''}${countFormatter.format(deltaValue)}`
                      : '—'}
                  </span>
                </p>
              </div>

              {errorMessage ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorMessage}
                </p>
              ) : null}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                  onClick={closeEditor}
                  disabled={isSubmitting}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!isActualCvValid || !hasChanges || isSubmitting}
                >
                  {isSubmitting ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
