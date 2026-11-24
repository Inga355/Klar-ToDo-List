import { expect, test, type Page } from "@playwright/test";
import { emptyState, freshTask } from "../src/model";

test.use({ timezoneId: "Europe/Berlin" });

async function fixture(page: Page) {
  await page.clock.install({ time: new Date("2026-11-23T12:00:00+01:00") });
  const state = emptyState();
  const projectId = crypto.randomUUID();
  state.projects = [{ id: projectId, name: "Website", color: "#ff851b" }];
  state.tasks = [
    {
      ...freshTask(projectId),
      title: "Angebot prüfen",
      priority: "normal",
      dueDate: "2026-11-20",
    },
    {
      ...freshTask(projectId),
      title: "Angebot abschließen",
      priority: "high",
      dueDate: "2026-11-23",
    },
    { ...freshTask(projectId), title: "Website prüfen", dueDate: "2026-11-23" },
    {
      ...freshTask(projectId),
      title: "Feedback einarbeiten",
      dueDate: "2026-11-24",
      plannedAt: "2026-11-23T10:00:00Z",
      focus: true,
    },
    {
      ...freshTask(projectId),
      title: "Projektkonzept planen",
      priority: "high",
      dueDate: "2026-11-27",
      plannedAt: "2026-11-23T11:00:00Z",
      focus: true,
    },
    { ...freshTask(), title: "Undatierte Fokusidee", focus: true },
    {
      ...freshTask(),
      title: "Nur heute geplant",
      plannedAt: "2026-11-23T13:00:00Z",
    },
    {
      ...freshTask(),
      title: "Nur morgen geplant",
      plannedAt: "2026-11-24T13:00:00Z",
    },
    { ...freshTask(), title: "Undatierte Aufgabe" },
    {
      ...freshTask(projectId),
      title: "Bereits erledigt",
      status: "done",
      completedAt: new Date().toISOString(),
      dueDate: "2026-11-23",
    },
  ];
  await page.addInitScript(
    (state) =>
      localStorage.setItem("klar-browser-preview-v1", JSON.stringify(state)),
    state,
  );
  await page.goto("/");
}

test("Übersicht und Mein Tag gruppieren alle offenen Aufgaben ohne Dopplungen", async ({
  page,
}) => {
  await fixture(page);
  const today = page.getByRole("region", {
    name: "Heute: 4 Aufgaben",
    exact: true,
  });
  const tomorrow = page.getByRole("region", {
    name: "Morgen: 2 Aufgaben",
    exact: true,
  });
  const later = page.getByRole("region", {
    name: "Später zu erledigen: 3 Aufgaben",
    exact: true,
  });
  await expect(today.locator(".task-row")).toHaveCount(4);
  await expect(tomorrow.locator(".task-row")).toHaveCount(2);
  await expect(later.locator(".task-row")).toHaveCount(3);
  await expect(
    tomorrow.getByRole("checkbox", { name: "Feedback einarbeiten abhaken" }),
  ).toBeVisible();
  await expect(
    later.getByRole("checkbox", { name: "Undatierte Fokusidee abhaken" }),
  ).toBeVisible();
  await expect(page.locator(".task-row")).toHaveCount(9);
  await expect(
    page.getByRole("checkbox", { name: "Bereits erledigt wieder öffnen" }),
  ).toHaveCount(0);
  const toggle = tomorrow.getByRole("button", { expanded: true });
  await toggle.click();
  await expect(tomorrow.getByRole("button", { expanded: false })).toBeVisible();
  await expect(tomorrow.locator(".task-row")).toHaveCount(0);
  await tomorrow.getByRole("button", { expanded: false }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /^Mein Tag/ })
    .click();
  await expect(today.locator(".task-row")).toHaveCount(4);
  await expect(tomorrow.locator(".task-row")).toHaveCount(2);
  await expect(later.locator(".task-row")).toHaveCount(3);
  await page.screenshot({
    path: "test-results/grouped-day.png",
    fullPage: true,
  });
});

test("Heute fällig enthält ausschließlich heutige und überfällige Aufgaben", async ({
  page,
}) => {
  await fixture(page);
  await page.getByLabel("Aufgaben durchsuchen", { exact: true }).fill("Idee");
  await page.getByRole("button", { name: "Heute fällig", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Heute fällig", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Aufgaben durchsuchen", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Heute fällig", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".task-row")).toHaveCount(3);
  await expect(
    page
      .getByRole("region", { name: "Heute: 2 Aufgaben", exact: true })
      .locator(".task-row"),
  ).toHaveCount(2);
  const late = page.getByRole("region", {
    name: "Überfällig: 1 Aufgabe",
    exact: true,
  });
  await expect(late.locator(".task-overdue")).toHaveCount(1);
  await expect(
    late.getByText("3 Tage überfällig", { exact: true }),
  ).toBeVisible();
  await expect(late.locator(".priority.normal")).toHaveText("Normal");
  await expect(page.getByRole("region", { name: /^Morgen:/ })).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: /^Später zu erledigen:/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("checkbox", { name: "Nur heute geplant abhaken" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("checkbox", { name: "Feedback einarbeiten abhaken" }),
  ).toHaveCount(0);
  await page.screenshot({ path: "test-results/due-today.png", fullPage: true });
  await page.getByRole("button", { name: "Aufgabe", exact: true }).click();
  await expect(page.getByLabel("Fällig am", { exact: true })).toHaveValue(
    "2026-11-23",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Schließen", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Gesamte Übersicht", exact: true })
    .click();
  await expect(page.getByRole("region", { name: /^Morgen:/ })).toBeVisible();
  await expect(page.locator(".task-row")).toHaveCount(9);
  await page.getByRole("button", { name: "Überfällig", exact: true }).click();
  await expect(page.locator(".task-row")).toHaveCount(1);
  await expect(page.getByRole("region", { name: /^Heute:/ })).toHaveCount(0);
});

test("Suche, Priorität und Abhaken funktionieren innerhalb der Tagesgruppen", async ({
  page,
}) => {
  await fixture(page);
  await page.getByLabel("Priorität filtern").selectOption("high");
  await expect(page.locator(".task-row")).toHaveCount(2);
  await page.getByLabel("Priorität filtern").selectOption("all");
  await page
    .getByLabel("Aufgaben durchsuchen", { exact: true })
    .fill("Feedback");
  await expect(page.locator(".task-row")).toHaveCount(1);
  await expect(
    page
      .getByRole("region", { name: "Morgen: 1 Aufgabe" })
      .locator(".task-row"),
  ).toHaveCount(1);
  await page.getByLabel("Aufgaben durchsuchen", { exact: true }).fill("");
  await page
    .getByRole("checkbox", { name: "Feedback einarbeiten abhaken" })
    .click();
  await expect(
    page.getByRole("region", { name: "Morgen: 1 Aufgabe" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Morgen: 2 Aufgaben" }),
  ).toBeVisible();
});

test("Offene Ansichten aktualisieren Tagesgruppen und Fälligkeitsfilter nach Mitternacht", async ({
  page,
}) => {
  await fixture(page);
  await page.getByRole("button", { name: "Heute fällig", exact: true }).click();
  await page.clock.setSystemTime(new Date("2026-11-24T00:00:05+01:00"));
  await page.clock.runFor(30_000);
  await expect(page.locator(".task-row")).toHaveCount(4);
  await expect(
    page
      .getByRole("region", { name: "Heute: 1 Aufgabe" })
      .getByRole("checkbox", { name: "Feedback einarbeiten abhaken" }),
  ).toBeVisible();
  await expect(
    page.getByText("4 Tage überfällig", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Gesamte Übersicht", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Morgen: 0 Aufgaben" }),
  ).toBeVisible();
});

test("Drag & Drop und Tastatur verschieben mit persistierter Fälligkeit", async ({
  page,
}) => {
  await fixture(page);
  await page
    .getByRole("region", { name: /^Heute:/ })
    .getByRole("button", { expanded: true })
    .click();
  await page
    .getByRole("region", { name: /^Morgen:/ })
    .getByRole("button", { expanded: true })
    .click();
  await page
    .getByRole("button", { name: "Projektkonzept planen ziehen", exact: true })
    .dragTo(page.getByRole("region", { name: /^Heute:/ }));
  await expect(
    page
      .getByRole("region", { name: /^Heute:/ })
      .getByRole("checkbox", { name: "Projektkonzept planen abhaken" }),
  ).toBeVisible();
  let task = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("klar-browser-preview-v1")!).tasks.find(
      (t: any) => t.title === "Projektkonzept planen",
    ),
  );
  expect(task.dueDate).toBe("2026-11-23");
  expect(task.remindedAt).toBeNull();
  await page
    .getByLabel("Projektkonzept planen verschieben", { exact: true })
    .selectOption("later");
  task = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("klar-browser-preview-v1")!).tasks.find(
      (t: any) => t.title === "Projektkonzept planen",
    ),
  );
  expect(task.dueDate).toBeNull();
  expect(task.plannedAt).toBeNull();
  expect(task.reminderAt).toBeNull();
  await expect(
    page
      .getByRole("region", { name: /^Später zu erledigen:/ })
      .getByRole("checkbox", { name: "Projektkonzept planen abhaken" }),
  ).toBeVisible();
});

test("Projekte haben Tagesgruppen und lassen sich ohne Verlust umbenennen", async ({
  page,
}) => {
  await fixture(page);
  await page
    .locator(".sidebar")
    .getByRole("button", { name: /^Website/ })
    .click();
  await expect(page.getByRole("region", { name: /^Heute:/ })).toBeVisible();
  await expect(page.getByRole("region", { name: /^Morgen:/ })).toBeVisible();
  await expect(
    page.getByRole("region", { name: /^Später zu erledigen:/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Projekt umbenennen oder bearbeiten" })
    .click();
  await page
    .getByLabel("Projektname", { exact: true })
    .fill("Website Relaunch");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Speichern", exact: true })
    .click();
  await expect(
    page
      .getByRole("heading", { name: "Website Relaunch", exact: true })
      .first(),
  ).toBeVisible();
  await expect(page.locator(".task-row")).toHaveCount(5);
});

test("Tagesabschluss bleibt bis Mitternacht sichtbar und dauerhaft unter Erledigt", async ({
  page,
}) => {
  await fixture(page);
  await page
    .getByRole("button", { name: "Einstellungen", exact: true })
    .click();
  await page
    .getByLabel("Heute erledigte Aufgaben noch unter Heute anzeigen")
    .check();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Schließen", exact: true })
    .first()
    .click();
  await page
    .getByRole("checkbox", { name: "Feedback einarbeiten abhaken" })
    .click();
  await expect(
    page
      .getByRole("region", { name: /^Heute:/ })
      .getByRole("checkbox", { name: "Feedback einarbeiten wieder öffnen" }),
  ).toBeVisible();
  await page.clock.setSystemTime(new Date("2026-11-24T00:00:05+01:00"));
  await page.clock.runFor(30_000);
  await expect(
    page.getByRole("checkbox", { name: "Feedback einarbeiten wieder öffnen" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Erledigt", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Feedback einarbeiten wieder öffnen" }),
  ).toBeVisible();
});

test("Wiederholungen erfordern vor dem Entfernen des Datums eine Bestätigung", async ({
  page,
}) => {
  await fixture(page);
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("klar-browser-preview-v1")!);
    state.tasks.find((t: any) => t.title === "Feedback einarbeiten").repeat =
      "weekly";
    localStorage.setItem("klar-browser-preview-v1", JSON.stringify(state));
    window.dispatchEvent(new Event("klar-change"));
  });
  await page
    .getByLabel("Feedback einarbeiten verschieben", { exact: true })
    .selectOption("later");
  const dialog = page.getByRole("dialog", { name: "Wiederholung entfernen?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Abbrechen", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: /^Morgen:/ })
      .getByRole("checkbox", { name: "Feedback einarbeiten abhaken" }),
  ).toBeVisible();
  await page
    .getByLabel("Feedback einarbeiten verschieben", { exact: true })
    .selectOption("later");
  await dialog
    .getByRole("button", { name: "Ohne Termin verschieben", exact: true })
    .click();
  await expect(
    page
      .getByRole("region", { name: /^Später zu erledigen:/ })
      .getByRole("checkbox", { name: "Feedback einarbeiten abhaken" }),
  ).toBeVisible();
  const task = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("klar-browser-preview-v1")!).tasks.find(
      (t: any) => t.title === "Feedback einarbeiten",
    ),
  );
  expect(task.repeat).toBe("none");
  expect(task.dueDate).toBeNull();
});
