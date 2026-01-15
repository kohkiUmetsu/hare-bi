const PROJECT_ICON_BUCKET = "project_icons";

export function buildProjectIconUrl(path?: string | null): string | null {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl || !path) {
    return null;
  }

  return `${baseUrl}/storage/v1/object/public/${PROJECT_ICON_BUCKET}/${encodeURI(
    path
  )}`;
}

export function buildProjectIconPath(projectName: string, fileName: string): string {
  const safeProjectName = projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const normalizedProject = safeProjectName || "project";
  const extensionMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
  const extension = extensionMatch ? extensionMatch[1].toLowerCase() : "png";

  return `${normalizedProject}/${crypto.randomUUID()}.${extension}`;
}

export { PROJECT_ICON_BUCKET };
