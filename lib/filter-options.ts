export const UNASSIGNED_PROJECT_ID = '__no_project__';

export function toProjectKey(projectId: string | null): string {
  return projectId ?? UNASSIGNED_PROJECT_ID;
}
