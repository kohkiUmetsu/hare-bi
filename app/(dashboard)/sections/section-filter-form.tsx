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
    <section className="bg-white px-8 py-8 shadow-sm max-w-3xl">
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
                sectionsForProject.map((section) => (
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

        <DateRangePicker startDate={startDate} endDate={endDate} />

        <button
          type="submit"
          className="h-12 w-full bg-[var(--accent-color)] px-4 text-sm font-semibold text-white transition-colors hover:opacity-90"
          disabled={projectDisabled || sectionDisabled}
        >
          表示
        </button>
      </form>
    </section>
  );
}
