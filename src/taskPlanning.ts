import { dayKey, plusDays, type Task } from "./model";

export type DayGroup = "today" | "tomorrow" | "later";

/** Fälligkeit geht vor Arbeitsplanung; Fokus verändert keine Datumszuordnung. */
export function planningDay(task: Task): string | null {
  return (
    task.dueDate ?? (task.plannedAt ? dayKey(new Date(task.plannedAt)) : null)
  );
}

export function dayGroup(task: Task, today = dayKey()): DayGroup {
  const date = planningDay(task);
  if (date && date <= today) return "today";
  return date === plusDays(today, 1) ? "tomorrow" : "later";
}

export function isOverdue(task: Task, today = dayKey()): boolean {
  return task.status !== "done" && !!task.dueDate && task.dueDate < today;
}

export function isDueTodayOrOverdue(task: Task, today = dayKey()): boolean {
  return task.status !== "done" && !!task.dueDate && task.dueDate <= today;
}

export function daysOverdue(task: Task, today = dayKey()): number {
  if (!isOverdue(task, today)) return 0;
  const utcDay = (value: string) => {
    const [year, month, date] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, date);
  };
  return Math.round((utcDay(today) - utcDay(task.dueDate!)) / 86_400_000);
}

export function groupDayTasks(
  tasks: Task[],
  today = dayKey(),
): Record<DayGroup, Task[]> {
  const groups: Record<DayGroup, Task[]> = {
    today: [],
    tomorrow: [],
    later: [],
  };
  for (const task of tasks)
    if (task.status !== "done") groups[dayGroup(task, today)].push(task);
  return groups;
}
