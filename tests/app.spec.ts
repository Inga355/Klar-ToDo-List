import { expect, test, Page } from "@playwright/test";

async function addTask(page: Page, title: string) {
  await page.getByRole("button", { name: "Aufgabe", exact: true }).click();
  await page.getByLabel("Was möchtest du erledigen?").fill(title);
  return page.getByRole("dialog");
}

test("Rückgängig und Konfliktschutz erhalten den Aufgabenstand", async ({
  page,
  context,
}) => {
  await page.goto("/");
  let dialog = await addTask(page, "Vertrag prüfen");
  await dialog.getByLabel("In meinen Tagesfokus").check();
  await dialog.getByRole("button", { name: "Speichern", exact: true }).click();
  await page.getByRole("checkbox", { name: "Vertrag prüfen abhaken" }).click();
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  await page.getByText("Vertrag prüfen", { exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Notizen", { exact: true })
    .fill("Dieser Entwurf darf nicht still verloren gehen.");
  await dialog
    .getByRole("button", { name: "Schließen", exact: true })
    .first()
    .click();
  await expect(
    dialog.getByText("Ungespeicherte Änderungen verwerfen?"),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Weiter bearbeiten", exact: true })
    .click();
  const mini = await context.newPage();
  await mini.goto("/?mini=1");
  await mini.getByRole("checkbox", { name: "Vertrag prüfen abhaken" }).click();
  await dialog.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(dialog.locator(".toast.error")).toBeVisible();
  await expect(dialog.getByLabel("Notizen", { exact: true })).toHaveValue(
    "Dieser Entwurf darf nicht still verloren gehen.",
  );
});

test("Projekte und Aufgaben bleiben nach einem Neustart erhalten", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Projekt hinzufügen", exact: true })
    .click();
  await page.getByLabel("Projektname").fill("Website");
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  const dialog = await addTask(page, "Startseite überarbeiten");
  await dialog.getByLabel("Priorität", { exact: true }).selectOption("high");
  await dialog
    .getByLabel("Notizen", { exact: true })
    .fill("Navigation vereinfachen und Kontrast prüfen.");
  await dialog.getByLabel("Neue Unteraufgabe").fill("Farben abstimmen");
  await dialog.getByLabel("Neue Unteraufgabe").press("Enter");
  await dialog.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(
    page.getByText("Startseite überarbeiten", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Alle Aufgaben", exact: true })
    .click();
  await page.getByText("Startseite überarbeiten", { exact: true }).click();
  await expect(page.getByLabel("Notizen", { exact: true })).toHaveValue(
    "Navigation vereinfachen und Kontrast prüfen.",
  );
  await expect(
    page.getByText("Farben abstimmen", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Schließen", exact: true })
    .first()
    .click();
  await page
    .getByRole("checkbox", { name: "Startseite überarbeiten abhaken" })
    .click();
  await page.getByRole("button", { name: "Erledigt", exact: true }).click();
  await expect(
    page.getByText("Startseite überarbeiten", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Startseite überarbeiten wieder öffnen" })
    .click();
  await expect(
    page.getByText("Startseite überarbeiten", { exact: true }),
  ).toHaveCount(0);
});

test("Hauptfenster und Miniansicht teilen denselben Aufgabenstand", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const dialog = await addTask(page, "Angebot abschließen");
  await dialog.getByLabel("In meinen Tagesfokus").check();
  await dialog.getByRole("button", { name: "Speichern", exact: true }).click();
  const mini = await context.newPage();
  await mini.setViewportSize({ width: 390, height: 560 });
  await mini.goto("/?mini=1");
  await expect(
    mini.getByText("Angebot abschließen", { exact: true }),
  ).toBeVisible();
  await mini
    .getByRole("checkbox", { name: "Angebot abschließen abhaken" })
    .click();
  await expect(
    page.locator(".task-title").filter({ hasText: "Angebot abschließen" }),
  ).toHaveCount(0);
});

test("Designprüfung mit realistischen Aufgaben und Kalender", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Projekt hinzufügen", exact: true })
    .click();
  await page.getByLabel("Projektname").fill("Kunde A");
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  const titles = [
    "Angebot abschließen",
    "Website prüfen",
    "Ideen für das nächste Projekt sammeln",
  ];
  for (let i = 0; i < titles.length; i++) {
    const dialog = await addTask(page, titles[i]);
    await dialog
      .getByLabel("Priorität", { exact: true })
      .selectOption(["high", "normal", "low"][i]);
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    await dialog.getByLabel("Fällig am", { exact: true }).fill(key);
    await dialog.getByLabel("In meinen Tagesfokus").check();
    await dialog
      .getByRole("button", { name: "Speichern", exact: true })
      .click();
  }
  await page.getByRole("button", { name: "Übersicht", exact: true }).click();
  await expect(page.locator(".task-row")).toHaveCount(3);
  await page.screenshot({ path: "test-results/dashboard.png", fullPage: true });
  const mini = await context.newPage();
  await mini.setViewportSize({ width: 390, height: 560 });
  await mini.goto("/?mini=1");
  await expect(mini.locator(".task-row")).toHaveCount(3);
  await mini.screenshot({ path: "test-results/mini.png", fullPage: true });
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Kalender", exact: true })
    .click();
  await expect(page.locator(".calendar-event")).toHaveCount(3);
  await page.screenshot({ path: "test-results/calendar.png", fullPage: true });
  await page.getByRole("button", { name: "Woche", exact: true }).click();
  await expect(page.locator(".calendar-day")).toHaveCount(7);
});
