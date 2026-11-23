import { describe, expect, it } from "vitest";
import {
  documentKind,
  filterDocuments,
  imageMime,
  indexDocuments,
  type DocumentFilters,
} from "./documents";
import { freshTask, type Attachment } from "./model";

const file: Attachment = {
  id: "shared",
  name: "Angebot.pdf",
  mime: "application/octet-stream",
  size: 100,
};
const filters: DocumentFilters = {
  query: "",
  project: "all",
  status: "all",
  kind: "all",
  sort: "name",
};
describe("Dokumentenübersicht", () => {
  it("zählt geteilte Dateien einmal und erhält alle Aufgabenverknüpfungen", () => {
    const a = { ...freshTask(), title: "Aktiv", attachments: [file] };
    const b = {
      ...freshTask(),
      title: "Erledigt",
      status: "done" as const,
      attachments: [file],
    };
    const entries = indexDocuments([a, b]);
    expect(entries).toHaveLength(1);
    expect(entries[0].tasks).toHaveLength(2);
    expect(entries[0].kind).toBe("pdf");
    expect(
      filterDocuments(entries, [], { ...filters, status: "done" })[0].tasks[0]
        .id,
    ).toBe(b.id);
    expect(entries[0].tasks).toHaveLength(2);
  });
  it("wendet Projekt- und Statusfilter auf dieselbe Aufgabe an", () => {
    const a = { ...freshTask("alpha"), attachments: [file] };
    const b = {
      ...freshTask("beta"),
      status: "done" as const,
      attachments: [file],
    };
    expect(
      filterDocuments(indexDocuments([a, b]), [], {
        ...filters,
        project: "alpha",
        status: "done",
      }),
    ).toHaveLength(0);
  });
  it("findet Notizinhalte und Projekte und behält erledigte Unterlagen", () => {
    const a = {
      ...freshTask("alpha"),
      title: "Konzept",
      notes: "Besprechung mit Kundin",
      status: "done" as const,
    };
    const entries = indexDocuments([a]);
    expect(
      filterDocuments(
        entries,
        [{ id: "alpha", name: "Website", color: "#ff851b" }],
        { ...filters, query: "kundin", kind: "note" },
      ),
    ).toHaveLength(1);
    expect(
      filterDocuments(
        entries,
        [{ id: "alpha", name: "Website", color: "#ff851b" }],
        { ...filters, query: "website" },
      ),
    ).toHaveLength(1);
    expect(
      filterDocuments(entries, [], { ...filters, kind: "files" }),
    ).toHaveLength(0);
  });
  it("stellt Textdateien als Text dar und erlaubt keine aktive SVG-Bildvorschau", () => {
    expect(documentKind({ ...file, name: "Notiz.md" })).toBe("text");
    expect(
      imageMime({ ...file, name: "Bild.svg", mime: "image/svg+xml" }),
    ).toBeNull();
  });
});
