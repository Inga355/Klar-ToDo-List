import { dayKey, plusDays, type Task } from "./model";

export type DayGroup = "today" | "tomorrow" | "later";

export function completedToday(task: Task, today = dayKey()): boolean {
  return (
    task.status === "done" &&
    !!task.completedAt &&
    dayKey(new Date(task.completedAt)) === today
  );
}

/** Move existing local clock times, without silently normalizing a DST gap. */
function moveTime(value: string | null, date: string): string | null {
  if (!value) return null;
  const time = new Date(value);
  const [year, month, day] = date.split("-").map(Number);
  const hours = time.getHours(),
    minutes = time.getMinutes();
  time.setFullYear(year, month - 1, day);
  if (time.getHours() !== hours || time.getMinutes() !== minutes)
    throw new Error(
      "Diese Uhrzeit gibt es am Zieltag wegen der Zeitumstellung nicht. Bitte den Termin in der Aufgabe wählen.",
    );
  return time.toISOString();
}

export function moveToDay(
  task: Task,
  target: DayGroup,
  today = dayKey(),
): Task {
  if (task.status === "done")
    throw new Error("Erledigte Aufgaben zuerst wieder öffnen.");
  const date =
    target === "today"
      ? today
      : target === "tomorrow"
        ? plusDays(today, 1)
        : null;
  const reminderAt = date ? moveTime(task.reminderAt, date) : null;
  return {
    ...task,
    dueDate: date,
    plannedAt: date ? moveTime(task.plannedAt, date) : null,
    reminderAt,
    remindedAt:
      !date || reminderAt !== task.reminderAt ? null : task.remindedAt,
    repeat: date ? task.repeat : "none",
  };
}

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
  keepCompleted = false,
): Record<DayGroup, Task[]> {
  const groups: Record<DayGroup, Task[]> = {
    today: [],
    tomorrow: [],
    later: [],
  };
  for (const task of tasks)
    if (task.status !== "done") groups[dayGroup(task, today)].push(task);
    else if (keepCompleted && completedToday(task, today))
      groups.today.push(task);
  return groups;
}
