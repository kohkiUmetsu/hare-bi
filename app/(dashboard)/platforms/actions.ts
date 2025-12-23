'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth-server';
import { updatePlatformActualCvValue } from '@/lib/platform-metrics';

export type PlatformMetricsActionState = {
  status: 'success' | 'error' | null;
  message?: string;
  requestId?: string;
};

const integerFormatter = new Intl.NumberFormat('ja-JP');

function formatCount(value: number): string {
  return integerFormatter.format(value);
}

function success(message: string, requestId?: string): PlatformMetricsActionState {
  return { status: 'success', message, requestId };
}

function failure(message: string, requestId?: string): PlatformMetricsActionState {
  return { status: 'error', message, requestId };
}

function readRequiredString(formData: FormData, key: string, label: string): string {
  const value = String(formData.get(key) ?? '').trim();
  if (!value) {
    throw new Error(`${label}を入力してください。`);
  }
  return value;
}

function readOptionalString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

function parseActualCv(formData: FormData): number {
  const raw = readRequiredString(formData, 'actual_cv', '実CV');
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error('実CVは数値で入力してください。');
  }
  if (value < 0) {
    throw new Error('実CVは0以上の値を入力してください。');
  }
  if (!Number.isInteger(value)) {
    throw new Error('実CVは整数で入力してください。');
  }
  return value;
}

function validateIsoDate(value: string, label: string): void {
  const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoPattern.test(value)) {
    throw new Error(`${label}の形式が不正です。`);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label}の日付が不正です。`);
  }
}

export async function updatePlatformActualCv(
  _prevState: PlatformMetricsActionState,
  formData: FormData
): Promise<PlatformMetricsActionState> {
  await requireAdmin();
  const requestId = String(formData.get('request_id') ?? '').trim() || undefined;

  try {
    const platformId = readRequiredString(formData, 'platform_id', 'プラットフォームID');
    const platformLabel = readRequiredString(formData, 'platform_label', 'プラットフォーム名');
    const sectionId = readOptionalString(formData, 'section_id') || null;
    const projectId = readOptionalString(formData, 'project_id') || null;
    const targetDate = readRequiredString(formData, 'target_date', '対象日');
    validateIsoDate(targetDate, '対象日');
    const newActualCv = parseActualCv(formData);

    const result = await updatePlatformActualCvValue({
      platformId,
      sectionId,
      projectId,
      targetDate,
      newActualCv,
    });

    await Promise.all([
      revalidatePath('/platforms', 'page'),
      revalidatePath('/projects', 'page'),
      revalidatePath('/sections', 'page'),
    ]);

    if (result.delta === 0) {
      return success('指定された値は既に反映済みです。', requestId);
    }

    const message = `${targetDate} の ${platformLabel} の実CVを ${formatCount(result.previousActualCv)} → ${formatCount(result.newActualCv)} に更新しました。`;
    return success(message, requestId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '実CVの更新に失敗しました。';
    return failure(message, requestId);
  }
}

