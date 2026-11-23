import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { dayKey, parseDay, plusDays, type Task } from "./model";
import { groupDayTasks, isOverdue } from "./taskPlanning";

export type PlanningMode = "all" | "dueToday" | "overdue";

export default function TaskSections({
  tasks,
  today = dayKey(),
  mode,
  filtered,
  renderTasks,
}: {
  tasks: Task[];
  today?: string;
  mode: PlanningMode;
  filtered: boolean;
  renderTasks: (tasks: Task[]) => ReactNode;
}) {
  const groups = groupDayTasks(tasks, today);
  const shortDate = (date: string) =>
    parseDay(date).toLocaleDateString("de-DE", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  const tomorrow = plusDays(today, 1);
  const sections =
    mode === "all"
      ? [
          {
            id: "today",
            title: "Heute",
            label: shortDate(today),
            tasks: groups.today,
            tone: "today",
          },
          {
            id: "tomorrow",
            title: "Morgen",
            label: shortDate(tomorrow),
            tasks: groups.tomorrow,
            tone: "normal",
          },
          {
            id: "later",
            title: "Später zu erledigen",
            label: "Ab übermorgen · auch ohne Datum",
            tasks: groups.later,
            tone: "later",
          },
        ]
      : [
          {
            id: "overdue",
            title: "Überfällig",
            label: "Braucht deine Aufmerksamkeit",
            tasks: tasks.filter((t) => isOverdue(t, today)),
            tone: "overdue",
          },
          ...(mode === "overdue"
            ? []
            : [
                {
                  id: "today",
                  title: "Heute",
                  label: shortDate(today),
                  tasks: tasks.filter(
                    (t) => t.status !== "done" && t.dueDate === today,
                  ),
                  tone: "today",
                },
              ]),
        ];
  return (
    <div
      className="task-sections"
      aria-label={
        mode === "all" ? "Aufgaben nach Tagen" : "Fällige Aufgaben nach Tagen"
      }
    >
      {sections
        .filter(
          (section) =>
            mode === "all" ||
            section.id !== "overdue" ||
            section.tasks.length > 0 ||
            mode === "overdue",
        )
        .map((section) => (
          <TaskSection
            key={section.id}
            title={section.title}
            dateLabel={section.label}
            count={section.tasks.length}
            tone={section.tone}
          >
            {section.tasks.length ? (
              renderTasks(section.tasks)
            ) : (
              <p className="day-section-empty">
                {filtered
                  ? "Keine passenden Aufgaben in diesem Bereich."
                  : section.id === "today"
                    ? mode === "all"
                      ? "Für heute ist nichts eingeordnet."
                      : "Heute sind keine Aufgaben fällig."
                    : section.id === "tomorrow"
                      ? "Für morgen ist noch nichts eingeplant."
                      : section.id === "overdue"
                        ? "Keine überfälligen Aufgaben."
                        : "Keine weiteren offenen Aufgaben."}
              </p>
            )}
          </TaskSection>
        ))}
    </div>
  );
}

function TaskSection({
  title,
  dateLabel,
  count,
  tone,
  children,
}: {
  title: string;
  dateLabel: string;
  count: number;
  tone: string;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <section
      className={`day-section ${tone}`}
      aria-label={`${title}: ${count} ${count === 1 ? "Aufgabe" : "Aufgaben"}`}
    >
      <h3 className="day-section-heading">
        <button
          type="button"
          className="day-section-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="day-section-title">
            {title}
            <span className="day-count">{count}</span>
          </span>
          <span className="day-section-date">{dateLabel}</span>
          <ChevronDown size={18} className={expanded ? "" : "collapsed"} />
        </button>
      </h3>
      {expanded && children}
    </section>
  );
}
