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
  panelBorderColor?: string | null;
}

export function PlatformFilterForm({
  projectOptions,
  platforms,
  selectedProjectId,
  selectedSectionId,
  selectedPlatformId,
  startDate,
  endDate,
  panelBorderColor,
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
  const borderStyle = panelBorderColor
    ? { borderColor: panelBorderColor, borderWidth: 6, borderStyle: 'solid' }
    : undefined;

  return (
    <section
      className="bg-white px-8 py-8 shadow-sm border w-full"
      style={borderStyle}
    >
      <form className="flex flex-col gap-5" method="get">
          <div className="flex w-full flex-col gap-2">
            <label htmlFor="projectId" className="text-sm font-bold text-neutral-900">
              プロジェクト
            </label>
            <div className="relative">
              <select
                id="projectId"
                name="projectId"
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className="h-11 w-full appearance-none border border-neutral-300 bg-white px-4 pr-10 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)]"
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
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-600">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2">
            <label htmlFor="sectionId" className="text-sm font-bold text-neutral-900">
              セクション
            </label>
            <div className="relative">
              <select
                id="sectionId"
                name="sectionId"
                value={sectionId}
                onChange={(event) => setSectionId(event.target.value)}
                className="h-11 w-full appearance-none border border-neutral-300 bg-white px-4 pr-10 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)]"
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
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-600">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2">
            <label htmlFor="platformId" className="text-sm font-bold text-neutral-900">
              プラットフォーム
            </label>
            <div className="relative">
              <select
                id="platformId"
                name="platformId"
                value={platformId}
                onChange={(event) => setPlatformId(event.target.value)}
                className="h-11 w-full appearance-none border border-neutral-300 bg-white px-4 pr-10 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)]"
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
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-600">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          <DateRangePicker startDate={startDate} endDate={endDate} />

          <button
            type="submit"
            className="h-12 w-full bg-[var(--accent-color)] px-4 text-sm font-semibold text-white transition-colors hover:opacity-90"
            disabled={projectDisabled || sectionDisabled || platformDisabled}
          >
            表示
          </button>
      </form>
    </section>
  );
}
