import { describe, expect, it } from "vitest";
import { freshTask, orderTasks } from "./model";
import {
  dayGroup,
  daysOverdue,
  groupDayTasks,
  isDueTodayOrOverdue,
  planningDay,
} from "./taskPlanning";

describe("Tagesgruppen und strikte Fälligkeit", () => {
  const today = "2026-11-23";
  it("ordnet jede offene Aufgabe genau einer Gruppe zu und lässt erledigte aus", () => {
    const tasks = [
      { ...freshTask(), dueDate: "2026-11-20" },
      { ...freshTask(), dueDate: today },
      { ...freshTask(), dueDate: "2026-11-24", focus: true },
      { ...freshTask(), dueDate: "2026-11-25" },
      { ...freshTask(), focus: true },
      { ...freshTask(), status: "done" as const, dueDate: today },
    ];
    const groups = groupDayTasks(tasks, today);
    expect(groups.today.map((t) => t.id)).toEqual(
      tasks.slice(0, 2).map((t) => t.id),
    );
    expect(groups.tomorrow.map((t) => t.id)).toEqual([tasks[2].id]);
    expect(groups.later.map((t) => t.id)).toEqual([tasks[3].id, tasks[4].id]);
    expect(
      new Set(
        Object.values(groups)
          .flat()
          .map((t) => t.id),
      ).size,
    ).toBe(5);
    expect(tasks).toHaveLength(6);
  });
  it("beachtet lokale Arbeitsplanung nur bei fehlender Fälligkeit", () => {
    const planned = {
      ...freshTask(),
      plannedAt: new Date(2026, 10, 24, 0, 5).toISOString(),
    };
    expect(dayGroup(planned, today)).toBe("tomorrow");
    expect(dayGroup({ ...planned, dueDate: today }, today)).toBe("today");
    expect(dayGroup({ ...planned, dueDate: "2026-11-25" }, today)).toBe(
      "later",
    );
  });
  it("nimmt im Heute-fällig-Filter weder Fokus noch Planung ohne passende Fälligkeit auf", () => {
    const plannedAt = new Date(2026, 10, 23, 12).toISOString();
    expect(
      isDueTodayOrOverdue({ ...freshTask(), focus: true, plannedAt }, today),
    ).toBe(false);
    expect(
      isDueTodayOrOverdue(
        { ...freshTask(), focus: true, plannedAt, dueDate: "2026-11-24" },
        today,
      ),
    ).toBe(false);
    expect(isDueTodayOrOverdue({ ...freshTask(), dueDate: today }, today)).toBe(
      true,
    );
    expect(
      isDueTodayOrOverdue({ ...freshTask(), dueDate: "2026-11-20" }, today),
    ).toBe(true);
    expect(
      isDueTodayOrOverdue(
        { ...freshTask(), dueDate: today, status: "done" },
        today,
      ),
    ).toBe(false);
  });
  it("berechnet überfällige Kalendertage über Sommerzeit und Jahreswechsel hinweg", () => {
    expect(
      daysOverdue({ ...freshTask(), dueDate: "2026-03-28" }, "2026-03-30"),
    ).toBe(2);
    expect(
      daysOverdue({ ...freshTask(), dueDate: "2026-10-24" }, "2026-10-26"),
    ).toBe(2);
    expect(
      daysOverdue({ ...freshTask(), dueDate: "2026-12-31" }, "2027-01-01"),
    ).toBe(1);
    expect(daysOverdue({ ...freshTask(), dueDate: today }, today)).toBe(0);
  });
  it("ordnet Morgen auch über Monats- und Jahresgrenzen korrekt zu", () => {
    expect(
      dayGroup({ ...freshTask(), dueDate: "2027-01-01" }, "2026-12-31"),
    ).toBe("tomorrow");
    expect(
      dayGroup({ ...freshTask(), dueDate: "2028-02-29" }, "2028-02-28"),
    ).toBe("tomorrow");
    expect(
      dayGroup({ ...freshTask(), dueDate: "2026-11-24" }, "2026-11-24"),
    ).toBe("today");
  });
  it("sortiert geplante Aufgaben chronologisch vor undatierten Aufgaben", () => {
    const later = {
      ...freshTask(),
      plannedAt: new Date(2026, 10, 27, 9).toISOString(),
    };
    const earlier = {
      ...freshTask(),
      plannedAt: new Date(2026, 10, 25, 9).toISOString(),
    };
    const undated = freshTask();
    expect(
      orderTasks(
        [undated, later, earlier],
        "due",
        (t) => planningDay(t) ?? "9999",
      ).map((t) => t.id),
    ).toEqual([earlier.id, later.id, undated.id]);
  });
});
