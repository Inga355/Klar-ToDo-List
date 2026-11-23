export type Priority = "high" | "normal" | "low";
export type Status = "open" | "progress" | "waiting" | "done";
export interface Project {
  id: string;
  name: string;
  color: string;
}
export interface Attachment {
  id: string;
  name: string;
  mime: string;
  size: number;
}
export interface Task {
  id: string;
  title: string;
  projectId: string | null;
  priority: Priority;
  status: Status;
  dueDate: string | null;
  plannedAt: string | null;
  reminderAt: string | null;
  remindedAt: string | null;
  repeat: "none" | "daily" | "weekly" | "monthly";
  notes: string;
  subtasks: { id: string; title: string; done: boolean }[];
  attachments: Attachment[];
  focus: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}
export interface Settings {
  aiAccess: "off" | "read" | "write";
  closeToTray: boolean;
  miniFilter: string;
  miniPinned: boolean;
}
export interface AppState {
  schemaVersion: number;
  revision: number;
  projects: Project[];
  tasks: Task[];
  settings: Settings;
  history: { at: string; action: string; source: string }[];
}
export type Operation =
  | { type: "save_task"; task: Task }
  | { type: "toggle_task" | "delete_task" | "delete_project"; id: string }
  | { type: "save_project"; project: Project }
  | { type: "settings"; settings: Settings };
export const PRIORITIES = { high: "Hoch", normal: "Normal", low: "Niedrig" };
export const STATUSES = {
  open: "Offen",
  progress: "In Arbeit",
  waiting: "Wartet",
  done: "Erledigt",
};
export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function parseDay(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}
export function plusDays(value: string, days: number): string {
  const d = parseDay(value);
  d.setDate(d.getDate() + days);
  return dayKey(d);
}
export function dateLabel(value: string | null): string {
  if (!value) return "Ohne Datum";
  if (value === dayKey()) return "Heute";
  if (value === plusDays(dayKey(), 1)) return "Morgen";
  return parseDay(value).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
  });
}
export function isToday(t: Task, today = dayKey()): boolean {
  return (
    t.status !== "done" &&
    (t.focus ||
      (!!t.dueDate && t.dueDate <= today) ||
      (!!t.plannedAt && dayKey(new Date(t.plannedAt)) === today))
  );
}
export function orderTasks(tasks: Task[], order = "due"): Task[] {
  const rank = { high: 0, normal: 1, low: 2 };
  return [...tasks].sort((a, b) =>
    order === "priority"
      ? rank[a.priority] - rank[b.priority] ||
        (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999")
      : order === "title"
        ? a.title.localeCompare(b.title, "de")
        : (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
          rank[a.priority] - rank[b.priority],
  );
}
export function freshTask(projectId: string | null = null): Task {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: "",
    projectId,
    priority: "normal",
    status: "open",
    dueDate: null,
    plannedAt: null,
    reminderAt: null,
    remindedAt: null,
    repeat: "none",
    notes: "",
    subtasks: [],
    attachments: [],
    focus: false,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
}
export function emptyState(): AppState {
  return {
    schemaVersion: 1,
    revision: 0,
    projects: [],
    tasks: [],
    settings: {
      aiAccess: "off",
      closeToTray: true,
      miniFilter: "today",
      miniPinned: false,
    },
    history: [],
  };
}
export function localInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${dayKey(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
export function isoInput(local: string): string | null {
  return local ? new Date(local).toISOString() : null;
}
