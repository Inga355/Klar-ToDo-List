import type { Attachment, Project, Task } from "./model";

export type DocumentKind = "image" | "pdf" | "text" | "file" | "note";
export interface DocumentEntry {
  id: string;
  name: string;
  kind: DocumentKind;
  attachment?: Attachment;
  tasks: Task[];
  totalReferences: number;
}
export interface DocumentFilters {
  query: string;
  project: string;
  status: "all" | "active" | "done";
  kind: "all" | "files" | "image" | "pdf" | "note";
  sort: "name" | "updated";
}
const textExtensions = /\.(txt|md|csv|tsv|json|log|yaml|yml|xml)$/i;
export function documentKind(a: Attachment): DocumentKind {
  if (
    a.mime.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(a.name)
  )
    return "image";
  if (a.mime === "application/pdf" || /\.pdf$/i.test(a.name)) return "pdf";
  if (
    a.mime.startsWith("text/") ||
    a.mime === "application/json" ||
    textExtensions.test(a.name)
  )
    return "text";
  return "file";
}
export function imageMime(a: Attachment): string | null {
  const extension = a.name.split(".").at(-1)?.toLowerCase();
  const types: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    avif: "image/avif",
    bmp: "image/bmp",
  };
  if (Object.values(types).includes(a.mime)) return a.mime;
  return types[extension ?? ""] ?? null;
}
export function indexDocuments(tasks: Task[]): DocumentEntry[] {
  const entries = new Map<string, DocumentEntry>();
  for (const task of tasks) {
    for (const attachment of task.attachments) {
      const id = `file:${attachment.id}`;
      const existing = entries.get(id);
      if (existing) {
        existing.tasks.push(task);
        existing.totalReferences++;
      } else
        entries.set(id, {
          id,
          name: attachment.name,
          kind: documentKind(attachment),
          attachment,
          tasks: [task],
          totalReferences: 1,
        });
    }
    if (task.notes.trim())
      entries.set(`note:${task.id}`, {
        id: `note:${task.id}`,
        name: task.title,
        kind: "note",
        tasks: [task],
        totalReferences: 1,
      });
  }
  return [...entries.values()];
}
export function filterDocuments(
  entries: DocumentEntry[],
  projects: Project[],
  filters: DocumentFilters,
): DocumentEntry[] {
  const query = filters.query.trim().toLocaleLowerCase("de");
  const result: DocumentEntry[] = [];
  for (const entry of entries) {
    if (
      filters.kind === "files"
        ? entry.kind === "note"
        : filters.kind !== "all" && entry.kind !== filters.kind
    )
      continue;
    const tasks = entry.tasks.filter(
      (t) =>
        (filters.project === "all" ||
          (filters.project === "inbox"
            ? !t.projectId
            : t.projectId === filters.project)) &&
        (filters.status === "all" ||
          (filters.status === "done"
            ? t.status === "done"
            : t.status !== "done")),
    );
    if (!tasks.length) continue;
    const haystack = [
      entry.name,
      ...tasks.flatMap((t) => [
        t.title,
        t.notes,
        projects.find((p) => p.id === t.projectId)?.name ?? "Eingang",
      ]),
    ]
      .join(" ")
      .toLocaleLowerCase("de");
    if (query && !haystack.includes(query)) continue;
    result.push({ ...entry, tasks });
  }
  return result.sort((a, b) =>
    filters.sort === "name"
      ? a.name.localeCompare(b.name, "de", { numeric: true })
      : Math.max(...b.tasks.map((t) => Date.parse(t.updatedAt))) -
          Math.max(...a.tasks.map((t) => Date.parse(t.updatedAt))) ||
        a.name.localeCompare(b.name, "de"),
  );
}
export function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
