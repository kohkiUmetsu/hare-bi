'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PlatformOption } from '@/lib/metrics';
import { toProjectKey } from '@/lib/filter-options';
import { DateRangePicker } from '../_components/date-range-picker';

type ProjectFilterOption = {
  id: string;
  label: string;
};

interface PlatformFilterFormProps {
  projectOptions: ProjectFilterOption[];
  platforms: PlatformOption[];
  selectedProjectId: string | null;
  selectedSectionId: string | null;
  selectedPlatformId: string | null;
  startDate: string;
  endDate: string;
}

export function PlatformFilterForm({
  projectOptions,
  platforms,
  selectedProjectId,
  selectedSectionId,
  selectedPlatformId,
  startDate,
  endDate,
}: PlatformFilterFormProps) {
  const initialProjectId = useMemo(
    () => selectedProjectId ?? projectOptions[0]?.id ?? '',
    [projectOptions, selectedProjectId]
  );
  const [projectId, setProjectId] = useState(initialProjectId);
  useEffect(() => {
    setProjectId(initialProjectId);
  }, [initialProjectId]);

  const sectionOptions = useMemo(() => {
    if (!projectId) {
      return [];
    }

    const map = new Map<string, string>();

    platforms.forEach((platform) => {
      if (toProjectKey(platform.projectId) !== projectId) {
        return;
      }

      if (!platform.sectionId) {
        return;
      }

      if (!map.has(platform.sectionId)) {
        map.set(platform.sectionId, platform.sectionLabel ?? platform.sectionId);
      }
    });

    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ja'));
  }, [platforms, projectId]);

  const derivedSectionId = useMemo(() => {
    if (selectedSectionId && sectionOptions.some((option) => option.id === selectedSectionId)) {
      return selectedSectionId;
    }
    return sectionOptions[0]?.id ?? '';
  }, [sectionOptions, selectedSectionId]);
  const [sectionId, setSectionId] = useState(derivedSectionId);
  useEffect(() => {
    setSectionId(derivedSectionId);
  }, [derivedSectionId]);

  useEffect(() => {
    if (sectionOptions.length === 0) {
      setSectionId('');
      return;
    }

    setSectionId((prev) => {
      if (prev && sectionOptions.some((option) => option.id === prev)) {
        return prev;
      }

      return sectionOptions[0].id;
    });
  }, [sectionOptions]);

  const filteredPlatforms = useMemo(() => {
    if (!sectionId) {
      return [];
    }

    return platforms.filter((platform) => platform.sectionId === sectionId);
  }, [platforms, sectionId]);

  const derivedPlatformId = useMemo(() => {
    if (
      selectedPlatformId &&
      filteredPlatforms.some((platform) => platform.id === selectedPlatformId)
    ) {
      return selectedPlatformId;
    }

    return filteredPlatforms[0]?.id ?? '';
  }, [filteredPlatforms, selectedPlatformId]);
  const [platformId, setPlatformId] = useState(derivedPlatformId);
  useEffect(() => {
    setPlatformId(derivedPlatformId);
  }, [derivedPlatformId]);

  useEffect(() => {
    if (filteredPlatforms.length === 0) {
      setPlatformId('');
      return;
    }

    setPlatformId((prev) => {
      if (prev && filteredPlatforms.some((platform) => platform.id === prev)) {
        return prev;
      }

      return filteredPlatforms[0].id;
    });
  }, [filteredPlatforms]);

  const projectDisabled = projectOptions.length === 0;
  const sectionDisabled = sectionOptions.length === 0;
  const platformDisabled = filteredPlatforms.length === 0;

  return (
    <section className="rounded-lg bg-white px-4 py-4 shadow-sm">
      <form className="flex flex-wrap items-end gap-4" method="get">
        <div className="flex w-full flex-col gap-1 sm:w-64">
          <label htmlFor="projectId" className="text-xs font-medium text-neutral-600">
            プロジェクト
          </label>
          <select
            id="projectId"
            name="projectId"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="h-10 rounded-md bg-neutral-50 px-3 text-sm text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
            disabled={projectDisabled}
          >
            {projectDisabled ? (
              <option value="">プロジェクトがありません</option>
            ) : (
              projectOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex w-full flex-col gap-1 sm:w-64">
          <label htmlFor="sectionId" className="text-xs font-medium text-neutral-600">
            セクション
          </label>
          <select
            id="sectionId"
            name="sectionId"
            value={sectionId}
            onChange={(event) => setSectionId(event.target.value)}
            className="h-10 rounded-md bg-neutral-50 px-3 text-sm text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
            disabled={sectionDisabled}
          >
            {sectionDisabled ? (
              <option value="">セクションがありません</option>
            ) : (
              sectionOptions.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.label}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex w-full flex-col gap-1 sm:w-80">
          <label htmlFor="platformId" className="text-xs font-medium text-neutral-600">
            プラットフォーム
          </label>
          <select
            id="platformId"
            name="platformId"
            value={platformId}
            onChange={(event) => setPlatformId(event.target.value)}
            className="h-10 rounded-md bg-neutral-50 px-3 text-sm text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
            disabled={platformDisabled}
          >
            {platformDisabled ? (
              <option value="">プラットフォームがありません</option>
            ) : (
              filteredPlatforms.map((platform) => (
                <option key={platform.id} value={platform.id}>
                  {platform.label}
                </option>
              ))
            )}
          </select>
        </div>

        <DateRangePicker startDate={startDate} endDate={endDate} />

        <button
          type="submit"
          className="h-10 w-full rounded-md bg-[var(--accent-color)] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:opacity-90 sm:w-auto"
          disabled={projectDisabled || sectionDisabled || platformDisabled}
        >
          表示
        </button>
      </form>
    </section>
  );
}
