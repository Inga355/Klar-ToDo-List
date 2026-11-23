import { expect, test, type Page } from "@playwright/test";
import { emptyState, freshTask } from "../src/model";

function pdfFixture(): string {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 400] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 400] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ...["Erste Seite", "Zweite Seite"].map((text) => {
      const content = `BT /F1 18 Tf 30 330 Td (${text}) Tj ET`;
      return `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`;
    }),
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf).toString("base64");
}

async function documentsFixture(page: Page) {
  const state = emptyState();
  const alpha = crypto.randomUUID(),
    beta = crypto.randomUUID();
  state.projects = [
    { id: alpha, name: "Website", color: "#ff851b" },
    { id: beta, name: "Privat", color: "#bda476" },
  ];
  const pdf = {
    id: crypto.randomUUID(),
    name: "Angebot.pdf",
    mime: "application/pdf",
    size: 400,
  };
  const image = {
    id: crypto.randomUUID(),
    name: "Screenshot.png",
    mime: "image/png",
    size: 68,
  };
  const text = {
    id: crypto.randomUUID(),
    name: "Protokoll.txt",
    mime: "text/plain",
    size: 25,
  };
  const unsupported = {
    id: crypto.randomUUID(),
    name: "Vertrag.docx",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: 80,
  };
  state.tasks = [
    {
      ...freshTask(alpha),
      title: "Layout abstimmen",
      notes: "Warme Farben und gut lesbare Schrift.",
      attachments: [pdf, image, text, unsupported],
    },
    {
      ...freshTask(beta),
      title: "Angebot archivieren",
      status: "done",
      completedAt: new Date().toISOString(),
      attachments: [pdf],
    },
  ];
  const blobs: Record<string, string> = {
    [pdf.id]: pdfFixture(),
    [image.id]:
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jV2kAAAAASUVORK5CYII=",
    [text.id]: Buffer.from("Besprechung: alles geklärt.").toString("base64"),
  };
  await page.addInitScript(
    ({ state, blobs }) => {
      const w = window as unknown as Record<string, unknown>;
      w.isTauri = true;
      let callback = 0;
      w.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener: () => {} };
      w.__TAURI_INTERNALS__ = {
        transformCallback: () => ++callback,
        unregisterCallback: () => {},
        invoke: async (command: string, args: Record<string, unknown>) => {
          if (command === "load_state") return structuredClone(state);
          if (command === "read_attachment") {
            const value = blobs[String(args.id)];
            if (!value) throw new Error("Anhang fehlt");
            return value;
          }
          if (command === "plugin:event|listen") return ++callback;
          if (command === "plugin:event|unlisten") return;
          throw new Error(`Unerwarteter nativer Aufruf: ${command}`);
        },
      };
    },
    { state, blobs },
  );
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Dokumente", exact: true })
    .click();
}

test("Dokumentenübersicht findet Dateien, Notizen und erledigte Verknüpfungen", async ({
  page,
}) => {
  await documentsFixture(page);
  const overview = page.getByRole("region", { name: "Dokumentenübersicht" });
  await expect(
    overview.getByText("4 Dateien · 1 Aufgabennotiz · lokal gespeichert"),
  ).toBeVisible();
  await expect(overview.getByRole("listitem")).toHaveCount(5);
  await page.getByLabel("Dokumente durchsuchen").fill("warme farben");
  await page.getByLabel("Dokumenttyp filtern").selectOption("note");
  await expect(overview.getByRole("listitem")).toHaveCount(1);
  await expect(page.locator(".document-text")).toHaveText(
    "Warme Farben und gut lesbare Schrift.",
  );
  await page.getByLabel("Dokumente durchsuchen").fill("");
  await page.getByLabel("Dokumenttyp filtern").selectOption("files");
  await page
    .getByLabel("Aufgabenstatus der Dokumente filtern")
    .selectOption("done");
  await expect(overview.getByRole("listitem")).toHaveCount(1);
  await expect(
    overview.getByRole("button", { name: "PDF: Angebot.pdf", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Dokumente nach Projekt filtern")
    .selectOption({ label: "Website" });
  await expect(page.getByText("Keine passenden Unterlagen")).toBeVisible();
  await page
    .getByRole("button", { name: "Filter zurücksetzen", exact: true })
    .click();
  await page.getByLabel("Dokumenttyp filtern").selectOption("note");
  await page
    .getByRole("button", {
      name: "Layout abstimmen Website · Offen",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Notizen", { exact: true })).toHaveValue(
    "Warme Farben und gut lesbare Schrift.",
  );
});

test("Lokale Vorschau zeigt PDF-Seiten, Bilder und Text; andere Formate bleiben exportierbar", async ({
  page,
}) => {
  await documentsFixture(page);
  await page
    .getByRole("button", { name: "PDF: Angebot.pdf", exact: true })
    .click();
  await expect(page.getByRole("img", { name: "PDF-Seite 1" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Nächste PDF-Seite" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Nächste PDF-Seite" }).click();
  await expect(page.getByText("Seite 2 von 2")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Vorherige PDF-Seite" }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Bild: Screenshot.png", exact: true })
    .click();
  await expect(page.locator("img.document-image")).toBeVisible();
  await expect(page.locator("img.document-image")).toHaveJSProperty(
    "naturalWidth",
    1,
  );
  await page
    .getByRole("button", { name: "Textdatei: Protokoll.txt", exact: true })
    .click();
  await expect(page.locator(".document-text")).toHaveText(
    "Besprechung: alles geklärt.",
  );
  await page
    .getByRole("button", { name: "Datei: Vertrag.docx", exact: true })
    .click();
  await expect(
    page.getByText(
      "Für dieses Dateiformat ist keine direkte Vorschau verfügbar.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Exportieren", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "PDF: Angebot.pdf", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Nächste PDF-Seite" }),
  ).toBeEnabled();
  await page.screenshot({ path: "test-results/documents.png", fullPage: true });
});
