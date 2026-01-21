'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ProjectOption } from '@/lib/metrics';
import { DateRangePicker } from '../_components/date-range-picker';

interface ProjectFilterFormProps {
  projects: ProjectOption[];
  selectedProjectId: string | null;
  startDate: string;
  endDate: string;
  panelBorderColor?: string | null;
}

export function ProjectFilterForm({
  projects,
  selectedProjectId,
  startDate,
  endDate,
  panelBorderColor,
}: ProjectFilterFormProps) {
  const initialProjectId = useMemo(
    () => selectedProjectId ?? projects[0]?.id ?? '',
    [projects, selectedProjectId]
  );
  const [projectId, setProjectId] = useState(initialProjectId);
  useEffect(() => {
    setProjectId(initialProjectId);
  }, [initialProjectId]);
  const projectDisabled = projects.length === 0;
  const borderStyle = panelBorderColor
    ? { borderColor: panelBorderColor, borderWidth: 3, borderStyle: 'solid' }
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
                  projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
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
            disabled={projectDisabled}
          >
            表示
          </button>
      </form>
    </section>
  );
}
