'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SectionOption } from '@/lib/metrics';
import { toProjectKey } from '@/lib/filter-options';
import { DateRangePicker } from '../_components/date-range-picker';

type ProjectFilterOption = {
  id: string;
  label: string;
};

interface SectionFilterFormProps {
  projectOptions: ProjectFilterOption[];
  sections: SectionOption[];
  selectedProjectId: string | null;
  selectedSectionId: string | null;
  startDate: string;
  endDate: string;
}

export function SectionFilterForm({
  projectOptions,
  sections,
  selectedProjectId,
  selectedSectionId,
  startDate,
  endDate,
}: SectionFilterFormProps) {
  const initialProjectId = useMemo(
    () => selectedProjectId ?? projectOptions[0]?.id ?? '',
    [projectOptions, selectedProjectId]
  );
  const [projectId, setProjectId] = useState(initialProjectId);
  useEffect(() => {
    setProjectId(initialProjectId);
  }, [initialProjectId]);

  const sectionsForProject = useMemo(() => {
    if (!projectId) {
      return [];
    }

    return sections.filter((section) => toProjectKey(section.projectId) === projectId);
  }, [projectId, sections]);

  const initialSectionId = useMemo(() => {
    if (selectedSectionId && sectionsForProject.some((section) => section.id === selectedSectionId)) {
      return selectedSectionId;
    }

    return sectionsForProject[0]?.id ?? '';
  }, [sectionsForProject, selectedSectionId]);

  const [sectionId, setSectionId] = useState(initialSectionId);

  useEffect(() => {
    if (sectionsForProject.length === 0) {
      setSectionId('');
      return;
    }

    if (!sectionId || !sectionsForProject.some((section) => section.id === sectionId)) {
      setSectionId(sectionsForProject[0].id);
    }
  }, [sectionsForProject, sectionId]);

  const projectDisabled = projectOptions.length === 0;
  const sectionDisabled = sectionsForProject.length === 0;

  return (
    <section className="bg-white px-4 py-4 shadow-sm">
      <form className="flex flex-wrap items-end gap-4" method="get">
        <div className="flex w-full flex-col gap-1 sm:w-72">
          <label htmlFor="projectId" className="text-xs font-medium text-neutral-600">
            プロジェクト
          </label>
          <select
            id="projectId"
            name="projectId"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="h-10 bg-neutral-50 px-3 text-sm text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
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

        <div className="flex w-full flex-col gap-1 sm:w-72">
          <label htmlFor="sectionId" className="text-xs font-medium text-neutral-600">
            セクション
          </label>
          <select
            id="sectionId"
            name="sectionId"
            value={sectionId}
            onChange={(event) => setSectionId(event.target.value)}
            className="h-10 bg-neutral-50 px-3 text-sm text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
            disabled={sectionDisabled}
          >
            {sectionDisabled ? (
              <option value="">セクションがありません</option>
            ) : (
              sectionsForProject.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.label}
                </option>
              ))
            )}
          </select>
        </div>

        <DateRangePicker startDate={startDate} endDate={endDate} />

        <button
          type="submit"
          className="h-10 w-full rounded-md bg-[var(--accent-color)] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:opacity-90 sm:w-auto"
          disabled={projectDisabled || sectionDisabled}
        >
          表示
        </button>
      </form>
    </section>
  );
}
