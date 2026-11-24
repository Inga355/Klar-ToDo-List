import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  File,
  FileText,
  Image,
  Search,
  StickyNote,
} from "lucide-react";
import * as api from "./api";
import {
  filterDocuments,
  formatSize,
  imageMime,
  indexDocuments,
  type DocumentEntry,
  type DocumentFilters,
} from "./documents";
import type { Project, Task } from "./model";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

const kinds = {
  image: "Bild",
  pdf: "PDF",
  text: "Textdatei",
  file: "Datei",
  note: "Aufgabennotiz",
};
function EntryIcon({ entry }: { entry: DocumentEntry }) {
  return entry.kind === "note" ? (
    <StickyNote size={20} />
  ) : entry.kind === "image" ? (
    <Image size={20} />
  ) : entry.kind === "pdf" || entry.kind === "text" ? (
    <FileText size={20} />
  ) : (
    <File size={20} />
  );
}
export default function DocumentOverview({
  tasks,
  projects,
  onOpenTask,
}: {
  tasks: Task[];
  projects: Project[];
  onOpenTask: (task: Task) => void;
}) {
  const [filters, setFilters] = useState<DocumentFilters>({
    query: "",
    project: "all",
    status: "all",
    kind: "all",
    sort: "name",
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openError, setOpenError] = useState("");
  const entries = useMemo(() => indexDocuments(tasks), [tasks]);
  const visible = useMemo(
    () => filterDocuments(entries, projects, filters),
    [entries, projects, filters],
  );
  const selected =
    visible.find((e) => e.id === selectedId) ?? visible[0] ?? null;
  const update = (patch: Partial<DocumentFilters>) =>
    setFilters((old) => ({ ...old, ...patch }));
  const files = entries.filter((e) => e.kind !== "note").length;
  const notes = entries.length - files;
  return (
    <section className="panel documents-panel" aria-label="Dokumentenübersicht">
      <div className="section-heading">
        <div>
          <span className="section-kicker">ALLES WIEDERFINDEN</span>
          <h2>Dateien & Aufgabennotizen</h2>
          <p className="documents-summary">
            {files} {files === 1 ? "Datei" : "Dateien"} · {notes}{" "}
            {notes === 1 ? "Aufgabennotiz" : "Aufgabennotizen"} · lokal
            gespeichert
          </p>
        </div>
        <FileText size={23} className="accent" />
      </div>
      <div className="toolbar documents-toolbar">
        <label className="search">
          <Search size={17} />
          <input
            data-search
            aria-label="Dokumente durchsuchen"
            placeholder="Dateiname, Aufgabe oder Notiz suchen …"
            value={filters.query}
            onChange={(e) => update({ query: e.target.value })}
          />
        </label>
        <select
          aria-label="Dokumente nach Projekt filtern"
          value={filters.project}
          onChange={(e) => update({ project: e.target.value })}
        >
          <option value="all">Alle Projekte</option>
          <option value="inbox">Eingang</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Dokumenttyp filtern"
          value={filters.kind}
          onChange={(e) =>
            update({ kind: e.target.value as DocumentFilters["kind"] })
          }
        >
          <option value="all">Dateien & Notizen</option>
          <option value="files">Alle Dateien</option>
          <option value="pdf">PDFs</option>
          <option value="image">Bilder</option>
          <option value="note">Aufgabennotizen</option>
        </select>
        <select
          aria-label="Aufgabenstatus der Dokumente filtern"
          value={filters.status}
          onChange={(e) =>
            update({ status: e.target.value as DocumentFilters["status"] })
          }
        >
          <option value="all">Offen & erledigt</option>
          <option value="active">Offene Aufgaben</option>
          <option value="done">Erledigte Aufgaben</option>
        </select>
        <select
          aria-label="Dokumente sortieren"
          value={filters.sort}
          onChange={(e) =>
            update({ sort: e.target.value as DocumentFilters["sort"] })
          }
        >
          <option value="name">Name A–Z</option>
          <option value="updated">Aufgabe zuletzt geändert</option>
        </select>
      </div>
      <div className="documents-result-count" role="status">
        {visible.length} {visible.length === 1 ? "Eintrag" : "Einträge"}
        {filters.query ? ` für „${filters.query}“` : ""}
      </div>
      {openError && (
        <p role="alert" className="inline-error">
          {openError}
        </p>
      )}
      {visible.length ? (
        <div className="documents-workspace">
          <div
            className="document-list"
            role="list"
            aria-label="Dokumente und Notizen"
          >
            {visible.map((entry) => (
              <div role="listitem" key={entry.id}>
                <button
                  className={`document-row ${selected?.id === entry.id ? "active" : ""}`}
                  aria-label={`${kinds[entry.kind]}: ${entry.name}`}
                  aria-pressed={selected?.id === entry.id}
                  onClick={() => setSelectedId(entry.id)}
                  onDoubleClick={() => {
                    if (!entry.attachment) return;
                    setOpenError("");
                    void api
                      .openAttachment(entry.attachment)
                      .catch((e) =>
                        setOpenError(
                          String(e instanceof Error ? e.message : e),
                        ),
                      );
                  }}
                >
                  <span className="document-type-icon">
                    <EntryIcon entry={entry} />
                  </span>
                  <span className="document-row-content">
                    <strong>{entry.name}</strong>
                    <small>
                      {kinds[entry.kind]}
                      {entry.attachment
                        ? ` · ${formatSize(entry.attachment.size)}`
                        : ""}{" "}
                      ·{" "}
                      {entry.tasks.length > 1
                        ? `${entry.tasks.length} Aufgaben`
                        : entry.tasks[0].title}
                    </small>
                    <span className="document-badges">
                      {[
                        ...new Set(
                          entry.tasks.map(
                            (t) =>
                              projects.find((p) => p.id === t.projectId)
                                ?.name ?? "Eingang",
                          ),
                        ),
                      ].map((name) => (
                        <span key={name}>{name}</span>
                      ))}
                      {entry.tasks.every((t) => t.status === "done") && (
                        <span className="document-done">
                          <CheckCheck size={10} /> Erledigt
                        </span>
                      )}
                    </span>
                  </span>
                  <ChevronRight size={15} />
                </button>
              </div>
            ))}
          </div>
          <DocumentPreview
            key={selected!.id}
            entry={selected!}
            projects={projects}
            onOpenTask={onOpenTask}
          />
        </div>
      ) : (
        <div className="empty">
          <span className="empty-icon">
            <FileText size={32} />
          </span>
          <h3>
            {entries.length
              ? "Keine passenden Unterlagen"
              : "Deine Unterlagen bekommen hier einen Platz."}
          </h3>
          <p>
            {entries.length
              ? "Passe die Suche oder die Filter an."
              : "Hänge Dateien an eine Aufgabe an oder ergänze eine Notiz. Sie erscheinen dann automatisch hier."}
          </p>
          {entries.length > 0 && (
            <button
              className="text-button"
              onClick={() =>
                setFilters({
                  query: "",
                  project: "all",
                  status: "all",
                  kind: "all",
                  sort: "name",
                })
              }
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      )}
      <p className="documents-footnote">
        Auch Unterlagen erledigter Aufgaben bleiben erhalten. Geteilte Dateien
        erscheinen einmal mit ihren Aufgabenverknüpfungen.
      </p>
    </section>
  );
}

function DocumentPreview({
  entry,
  projects,
  onOpenTask,
}: {
  entry: DocumentEntry;
  projects: Project[];
  onOpenTask: (task: Task) => void;
}) {
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    const attachment = entry.attachment;
    if (
      !attachment ||
      !["image", "pdf", "text"].includes(entry.kind) ||
      (entry.kind === "image" && !imageMime(attachment))
    )
      return;
    setLoading(true);
    void api
      .readAttachment(attachment)
      .then((data) => {
        if (!active) return;
        setBytes(data);
        if (entry.kind === "image") {
          objectUrl = URL.createObjectURL(
            new Blob([data.slice().buffer], { type: imageMime(attachment)! }),
          );
          setUrl(objectUrl);
        }
      })
      .catch((e) => {
        if (active) setError(String(e instanceof Error ? e.message : e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [entry.id]);
  const exportFile = async () => {
    if (!entry.attachment) return;
    setExporting(true);
    setExportMessage("");
    try {
      if (await api.exportAttachment(entry.attachment))
        setExportMessage("Datei exportiert.");
    } catch (e) {
      setExportMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  };
  let text = "";
  if (bytes && entry.kind === "text") {
    const encoding =
      bytes[0] === 255 && bytes[1] === 254
        ? "utf-16le"
        : bytes[0] === 254 && bytes[1] === 255
          ? "utf-16be"
          : "utf-8";
    text = new TextDecoder(encoding).decode(bytes);
  }
  return (
    <aside className="document-preview" aria-label={`Vorschau: ${entry.name}`}>
      <header className="document-preview-header">
        <span className="section-kicker">
          {kinds[entry.kind].toLocaleUpperCase("de")} / VORSCHAU
        </span>
        <h3>{entry.name}</h3>
        {entry.attachment && (
          <div className="button-row">
            <span className="field-hint">
              {formatSize(entry.attachment.size)}
            </span>
            <button
              className="secondary small"
              onClick={() => {
                setExportMessage("");
                void api
                  .openAttachment(entry.attachment!)
                  .catch((e) =>
                    setExportMessage(
                      String(e instanceof Error ? e.message : e),
                    ),
                  );
              }}
              title="Schreibgeschützte Kopie in der Windows-Standard-App öffnen"
            >
              <ArrowUpRight size={15} /> Öffnen
            </button>
            <button
              className="secondary small"
              onClick={() => void exportFile()}
              disabled={exporting}
            >
              <Download size={15} />
              {exporting ? "Exportiert …" : "Exportieren"}
            </button>
          </div>
        )}
        {exportMessage && (
          <p role="status" className="field-hint">
            {exportMessage}
          </p>
        )}
      </header>
      <div className="document-preview-body">
        {loading ? (
          <p role="status" className="field-hint">
            Vorschau wird geladen …
          </p>
        ) : error ? (
          <p role="alert" className="inline-error">
            {error}
          </p>
        ) : entry.kind === "note" ? (
          <pre className="document-text">{entry.tasks[0].notes}</pre>
        ) : entry.kind === "image" && url ? (
          <img
            className="document-image"
            src={url}
            alt={entry.name}
            onError={() =>
              setError(
                "Das Bild kann nicht dargestellt werden. Du kannst die Originaldatei exportieren.",
              )
            }
          />
        ) : entry.kind === "pdf" && bytes ? (
          <PdfPreview bytes={bytes} />
        ) : entry.kind === "text" && bytes ? (
          <>
            <pre className="document-text">{text.slice(0, 200000)}</pre>
            {text.length > 200000 && (
              <p className="field-hint">
                Die Vorschau ist auf 200.000 Zeichen begrenzt. Die exportierte
                Datei bleibt vollständig.
              </p>
            )}
          </>
        ) : (
          <div className="document-no-preview">
            <EntryIcon entry={entry} />
            <p>Für dieses Dateiformat ist keine direkte Vorschau verfügbar.</p>
            <small>
              Über „Öffnen“ nutzt du deine Windows-Standard-App. Änderungen an
              der schreibgeschützten Kopie bitte als neue Datei speichern und
              erneut anhängen.
            </small>
          </div>
        )}
      </div>
      <div className="document-task-links">
        <h4>
          Zugehörige {entry.totalReferences === 1 ? "Aufgabe" : "Aufgaben"}
          {entry.tasks.length < entry.totalReferences
            ? ` (${entry.tasks.length} von ${entry.totalReferences} im Filter)`
            : ""}
        </h4>
        {entry.tasks.map((t) => (
          <button
            key={t.id}
            className="document-task-link"
            onClick={() => onOpenTask(t)}
          >
            <span>
              <strong>{t.title}</strong>
              <small>
                {projects.find((p) => p.id === t.projectId)?.name ?? "Eingang"}{" "}
                · {t.status === "done" ? "Erledigt" : "Offen"}
              </small>
            </span>
            <ArrowUpRight size={16} />
          </button>
        ))}
      </div>
    </aside>
  );
}

function PdfPreview({ bytes }: { bytes: Uint8Array }) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [rendering, setRendering] = useState(true);
  const [width, setWidth] = useState(480);
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let active = true;
    let destroy: (() => Promise<void>) | undefined;
    void import("pdfjs-dist")
      .then((pdfjs) => {
        if (!active) return;
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        const task = pdfjs.getDocument({
          data: bytes.slice(),
          useWasm: false,
          enableXfa: false,
          useSystemFonts: true,
        });
        destroy = () => task.destroy();
        return task.promise.then((doc) => {
          if (active) setDocument(doc);
        });
      })
      .catch((e) => {
        if (active)
          setError(
            `PDF-Vorschau nicht verfügbar: ${e instanceof Error ? e.message : String(e)}`,
          );
      });
    return () => {
      active = false;
      void destroy?.().catch(() => {});
    };
  }, [bytes]);
  useEffect(() => {
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.max(160, Math.floor(entries[0].contentRect.width))),
    );
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!document || !canvas.current) return;
    let active = true;
    let task: RenderTask | undefined;
    setRendering(true);
    void document
      .getPage(page)
      .then((pdfPage) => {
        if (!active || !canvas.current) return;
        const scale = Math.min(2, window.devicePixelRatio || 1);
        const viewport = pdfPage.getViewport({
          scale: width / pdfPage.getViewport({ scale: 1 }).width,
        });
        canvas.current.width = Math.floor(viewport.width * scale);
        canvas.current.height = Math.floor(viewport.height * scale);
        canvas.current.style.width = `${viewport.width}px`;
        canvas.current.style.height = `${viewport.height}px`;
        task = pdfPage.render({
          canvas: canvas.current,
          viewport,
          transform: scale === 1 ? undefined : [scale, 0, 0, scale, 0, 0],
        });
        return task.promise;
      })
      .catch((e) => {
        if (active && e?.name !== "RenderingCancelledException")
          setError(
            "Diese PDF-Seite kann nicht dargestellt werden. Bitte die Originaldatei exportieren.",
          );
      })
      .finally(() => {
        if (active) setRendering(false);
      });
    return () => {
      active = false;
      task?.cancel();
    };
  }, [document, page, width]);
  return (
    <div className="pdf-preview" ref={host}>
      {error ? (
        <p role="alert" className="inline-error">
          {error}
        </p>
      ) : (
        <>
          <div className="pdf-controls">
            <button
              className="icon-button"
              aria-label="Vorherige PDF-Seite"
              disabled={!document || page === 1 || rendering}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <span>
              {document
                ? `Seite ${page} von ${document.numPages}`
                : "PDF wird geladen …"}
            </span>
            <button
              className="icon-button"
              aria-label="Nächste PDF-Seite"
              disabled={!document || page === document.numPages || rendering}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <canvas ref={canvas} aria-label={`PDF-Seite ${page}`} role="img" />
          {rendering && (
            <p role="status" className="field-hint">
              PDF-Seite wird dargestellt …
            </p>
          )}
        </>
      )}
    </div>
  );
}
