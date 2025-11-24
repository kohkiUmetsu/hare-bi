'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ProjectOption } from '@/lib/metrics';
import { DateRangePicker } from '../_components/date-range-picker';

interface ProjectFilterFormProps {
  projects: ProjectOption[];
  selectedProjectId: string | null;
  startDate: string;
  endDate: string;
}

export function ProjectFilterForm({
  projects,
  selectedProjectId,
  startDate,
  endDate,
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

  return (
    <section className="rounded-lg border border-neutral-200 bg-white px-4 py-4 shadow-sm">
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
            className="h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none"
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
        </div>

        <DateRangePicker startDate={startDate} endDate={endDate} />

        <button
          type="submit"
          className="h-10 w-full rounded-md bg-neutral-900 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-neutral-800 sm:w-auto"
          disabled={projectDisabled}
        >
          表示
        </button>
      </form>
    </section>
  );
}
