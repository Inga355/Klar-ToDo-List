import { expect, test } from "@playwright/test";

test("Theme-Favoriten bleiben gespeichert und erscheinen auch im zweiten Fenster", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Einstellungen", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".theme-favorite")).toHaveCount(5);
  await dialog
    .getByRole("button", { name: "Theme Nord · Eisblau anwenden", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", {
      name: "Theme Nord · Eisblau anwenden",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({
    path: "test-results/theme-nord.png",
    fullPage: true,
  });
  await dialog.getByLabel("Primärfarbe · Hintergrund").fill("#ffffff");
  await dialog.getByLabel("Sekundärfarbe · Akzent").fill("#000000");
  await dialog.getByLabel("Favoritenplatz", { exact: true }).selectOption("4");
  await dialog
    .getByLabel("Favoritenname", { exact: true })
    .fill("Mein Kontrast");
  await dialog
    .getByRole("button", {
      name: "Auf Platz 5 speichern & anwenden",
      exact: true,
    })
    .click();
  await expect(
    dialog.getByRole("button", {
      name: "Theme Mein Kontrast anwenden",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.locator(".theme-favorite")).toHaveCount(5);
  const mini = await context.newPage();
  await mini.goto("/?mini=1");
  const background = await page
    .locator("html")
    .evaluate((el) => (el as HTMLElement).style.getPropertyValue("--bg"));
  await expect(mini.locator("html")).toHaveCSS("--bg", background);
  await page.reload();
  await page
    .getByRole("button", { name: "Einstellungen", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Theme Mein Kontrast anwenden",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Klar-Original", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Theme Klar · Bernstein anwenden",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(mini.locator("html")).not.toHaveAttribute("style", /--theme-/);
  await page.screenshot({
    path: "test-results/theme-settings.png",
    fullPage: true,
  });
});
