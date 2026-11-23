import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowDownUp,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  Folder,
  Home,
  Inbox,
  LayoutDashboard,
  ListTodo,
  Maximize2,
  Paperclip,
  Pin,
  Plus,
  Search,
  Settings2,
  SquarePen,
  Star,
  StickyNote,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import * as api from "./api";
import {
  AppState,
  Attachment,
  dayKey,
  dateLabel,
  freshTask,
  isToday,
  isoInput,
  localInput,
  Operation,
  orderTasks,
  parseDay,
  plusDays,
  PRIORITIES,
  Project,
  Settings,
  STATUSES,
  Task,
} from "./model";

type View =
  | "overview"
  | "today"
  | "calendar"
  | "all"
  | "inbox"
  | "done"
  | `project:${string}`;
const isMini = new URLSearchParams(location.search).has("mini");
const dateLong = () =>
  new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [view, setView] = useState<View>("overview");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("due");
  const [priority, setPriority] = useState("all");
  const [group, setGroup] = useState("none");
  const [editor, setEditor] = useState<Task | null>(null);
  const editorRevision = useRef(0);
  const [projectEditor, setProjectEditor] = useState<Project | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(dayKey());
  const lock = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const accept = useCallback(
    (next: AppState) =>
      setState((old) => (!old || next.revision >= old.revision ? next : old)),
    [],
  );
  const reload = useCallback(
    () =>
      api
        .loadState()
        .then(accept)
        .catch((e) => setError(message(e))),
    [accept],
  );
  useEffect(() => {
    void reload();
    let stop: (() => void) | undefined;
    let disposed = false;
    void api
      .subscribe(() => void reload())
      .then((fn) => {
        if (disposed) fn();
        else stop = fn;
      });
    const timer = window.setInterval(() => {
      setClock(dayKey());
      void reload();
    }, 30_000);
    return () => {
      disposed = true;
      stop?.();
      clearInterval(timer);
    };
  }, [reload]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  const apply = async (op: Operation, revision?: number): Promise<AppState> => {
    if (lock.current || !stateRef.current)
      throw new Error("Bitte den laufenden Speichervorgang abwarten.");
    lock.current = true;
    setBusy(true);
    try {
      const next = await api.mutate(op, revision ?? stateRef.current.revision);
      accept(next);
      return next;
    } catch (e) {
      setError(message(e));
      void reload();
      throw e;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const run = (fn: () => Promise<unknown>) => {
    void fn().catch((e) => setError(message(e)));
  };
  const edit = (task: Task) => {
    editorRevision.current = stateRef.current!.revision;
    setEditor(structuredClone(task));
  };
  const add = () =>
    edit(freshTask(view.startsWith("project:") ? view.slice(8) : null));
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>("[data-search]")?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  if (!state)
    return (
      <div className="bootstrap">
        <span className="brandmark">✓</span>
        <h1>Klar</h1>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button onClick={() => void reload()}>Erneut versuchen</button>
          </>
        ) : (
          <p>Deine Übersicht wird geladen …</p>
        )}
      </div>
    );
  const active = state.tasks.filter((t) => t.status !== "done");
  const today = active.filter((t) => isToday(t, clock));
  const overdue = active.filter((t) => t.dueDate && t.dueDate < clock);
  const project = state.projects.find((p) => `project:${p.id}` === view);
  let tasks =
    view === "done"
      ? state.tasks.filter((t) => t.status === "done")
      : view === "today"
        ? today
        : view === "inbox"
          ? active.filter((t) => !t.projectId)
          : project
            ? active.filter((t) => t.projectId === project.id)
            : active;
  if (view === "overview") tasks = today;
  tasks = orderTasks(
    tasks.filter(
      (t) =>
        (priority === "all" || t.priority === priority) &&
        `${t.title} ${t.notes} ${state.projects.find((p) => p.id === t.projectId)?.name ?? ""}`
          .toLocaleLowerCase("de")
          .includes(search.toLocaleLowerCase("de")),
    ),
    sort,
  );
  const title =
    {
      overview: "Dein Tag. Dein Überblick.",
      today: "Mein Tag",
      calendar: "Deine Zeit im Blick.",
      all: "Alle Aufgaben",
      inbox: "Ein guter Platz für neue Ideen.",
      done: "Geschafft.",
    }[view as string] ??
    project?.name ??
    "Aufgaben";
  const saveTask = async (task: Task, close = true) => {
    const next = await apply(
      { type: "save_task", task: { ...task, title: task.title.trim() } },
      editorRevision.current,
    );
    editorRevision.current = next.revision;
    if (close) {
      setEditor(null);
      setNotice("Aufgabe gespeichert");
    } else
      setEditor(structuredClone(next.tasks.find((t) => t.id === task.id)!));
    return next;
  };
  const taskList = (list: Task[]) =>
    list.length ? (
      <div className="task-list">
        {list.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            project={state.projects.find((p) => p.id === t.projectId)}
            busy={busy}
            onOpen={() => edit(t)}
            onToggle={() =>
              run(async () => {
                await apply({ type: "toggle_task", id: t.id });
                setNotice(
                  t.status === "done"
                    ? "Aufgabe wieder geöffnet"
                    : "Erledigt – gut gemacht.",
                );
              })
            }
          />
        ))}
      </div>
    ) : (
      <Empty
        icon={<CheckCheck size={32} />}
        title={
          search || priority !== "all"
            ? "Keine passenden Aufgaben"
            : view === "done"
              ? "Hier sammeln sich deine Erfolge."
              : "Platz für das Wesentliche."
        }
        text={
          search
            ? "Versuche einen anderen Suchbegriff."
            : "Lege eine Aufgabe an oder plane deinen nächsten Schritt."
        }
        action={
          view !== "done" ? (
            <button className="text-button" onClick={add}>
              <Plus size={16} /> Aufgabe hinzufügen
            </button>
          ) : undefined
        }
      />
    );

  return (
    <div className={isMini ? "mini-app" : "app"}>
      {!isMini && (
        <aside className="sidebar">
          <div className="brand">
            <span className="brandmark">✓</span> KLAR
          </div>
          <div className="brand-caption">Raum für das Wesentliche.</div>
          <nav aria-label="Hauptnavigation">
            {(
              [
                ["overview", LayoutDashboard, "Übersicht"],
                ["today", Home, "Mein Tag"],
                ["calendar", CalendarDays, "Kalender"],
                ["all", ListTodo, "Alle Aufgaben"],
                ["inbox", Inbox, "Eingang"],
              ] as const
            ).map(([id, Icon, label]) => (
              <button
                key={id}
                className={`nav-item ${view === id ? "selected" : ""}`}
                onClick={() => setView(id)}
              >
                <Icon size={19} />
                <span>{label}</span>
                {id === "today" && today.length > 0 && (
                  <small>{today.length}</small>
                )}
              </button>
            ))}
          </nav>
          <div className="sidebar-label">
            <span>PROJEKTE</span>
            <button
              className="icon-button"
              aria-label="Projekt hinzufügen"
              onClick={() =>
                setProjectEditor({
                  id: crypto.randomUUID(),
                  name: "",
                  color: "#ff851b",
                })
              }
            >
              <Plus size={17} />
            </button>
          </div>
          <div className="project-nav">
            {state.projects.map((p) => (
              <button
                key={p.id}
                className={`nav-item ${view === `project:${p.id}` ? "selected" : ""}`}
                onClick={() => setView(`project:${p.id}`)}
              >
                <span className="project-dot" style={{ background: p.color }} />
                <span>{p.name}</span>
                <small>
                  {active.filter((t) => t.projectId === p.id).length}
                </small>
              </button>
            ))}
            {!state.projects.length && (
              <button
                className="add-project"
                onClick={() =>
                  setProjectEditor({
                    id: crypto.randomUUID(),
                    name: "",
                    color: "#ff851b",
                  })
                }
              >
                + Dein erstes Projekt
              </button>
            )}
          </div>
          <div className="sidebar-bottom">
            <button
              className={`nav-item ${view === "done" ? "selected" : ""}`}
              onClick={() => setView("done")}
            >
              <CheckCheck size={19} />
              Erledigt
            </button>
            <button className="nav-item" onClick={() => setSettingsOpen(true)}>
              <Settings2 size={19} />
              Einstellungen
            </button>
            <div className="local-indicator">
              <span /> Lokal auf deinem Computer
            </div>
          </div>
        </aside>
      )}
      <main className="main">
        {!api.native && (
          <div className="preview-banner">
            Designvorschau im Browser · separate Vorschaudaten ·
            Desktop-Funktionen in der installierten App
          </div>
        )}
        {isMini ? (
          <header className="mini-header" data-tauri-drag-region>
            <div data-tauri-drag-region>
              <span className="eyebrow" data-tauri-drag-region>KLAR / MINIANSICHT</span>
              <h1 data-tauri-drag-region>Mein Tag</h1>
            </div>
            <div className="header-actions">
              <button
                className={`icon-button ${state.settings.miniPinned ? "accent" : ""}`}
                aria-label="Immer im Vordergrund"
                aria-pressed={state.settings.miniPinned}
                onClick={() =>
                  run(async () => {
                    await apply({
                      type: "settings",
                      settings: {
                        ...state.settings,
                        miniPinned: !state.settings.miniPinned,
                      },
                    });
                  })
                }
              >
                <Pin size={18} />
              </button>
              <button
                className="icon-button"
                aria-label="Hauptfenster öffnen"
                onClick={() => run(api.openMain)}
              >
                <Maximize2 size={18} />
              </button>
            </div>
          </header>
        ) : (
          <>
            <div className="topbar">
              <span className="breadcrumb">
                <span className="tiny-logo">✓</span> Dein persönlicher
                Arbeitsraum <span>/</span> {project?.name ?? "Klar"}
              </span>
              <div className="header-actions">
                <button
                  className="secondary small"
                  onClick={() => run(api.openMini)}
                >
                  <StickyNote size={16} /> Miniansicht
                </button>
                <span className="avatar">K</span>
              </div>
            </div>
            <header className="page-header">
              <div>
                <div className="eyebrow">{dateLong()}</div>
                <h1>{title}</h1>
                <p>
                  {view === "overview"
                    ? "Alles Wichtige an einem Ort. Schritt für Schritt."
                    : project
                      ? `${active.filter((t) => t.projectId === project.id).length} offene Aufgaben in deinem Projekt`
                      : view === "done"
                        ? "Jeder Haken ist ein Schritt nach vorn."
                        : "Dein Plan, in deinem Tempo."}
                </p>
              </div>
              <div className="header-actions">
                {project && (
                  <button
                    className="icon-button"
                    aria-label="Projekt bearbeiten"
                    onClick={() => setProjectEditor({ ...project })}
                  >
                    <SquarePen size={20} />
                  </button>
                )}
                <button className="primary" onClick={add}>
                  <Plus size={19} /> Aufgabe
                </button>
              </div>
            </header>
          </>
        )}
        {isMini ? (
          <>
            <div className="mini-date">
              <span>
                {new Date().toLocaleDateString("de-DE", {
                  weekday: "short",
                  day: "numeric",
                  month: "long",
                })}
              </span>
              <span className="count-badge">
                {
                  active.filter((t) =>
                    state.settings.miniFilter === "all"
                      ? true
                      : state.settings.miniFilter === "focus"
                        ? t.focus
                        : state.settings.miniFilter === "today"
                          ? isToday(t)
                          : t.projectId === state.settings.miniFilter,
                  ).length
                }{" "}
                offen
              </span>
            </div>
            <label className="mini-filter">
              <span className="sr-only">Miniansicht filtern</span>
              <select
                value={state.settings.miniFilter}
                onChange={(e) =>
                  run(() =>
                    apply({
                      type: "settings",
                      settings: {
                        ...state.settings,
                        miniFilter: e.target.value,
                      },
                    }),
                  )
                }
              >
                <option value="today">Heute & überfällig</option>
                <option value="focus">Mein Fokus</option>
                <option value="all">Alle offenen Aufgaben</option>
                {state.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="mini-tasks">
              {taskList(
                orderTasks(
                  active.filter((t) =>
                    state.settings.miniFilter === "all"
                      ? true
                      : state.settings.miniFilter === "focus"
                        ? t.focus
                        : state.settings.miniFilter === "today"
                          ? isToday(t)
                          : t.projectId === state.settings.miniFilter,
                  ),
                ),
              )}
            </div>
            <footer className="mini-footer">
              <button className="primary" onClick={add}>
                <Plus size={17} />
                Aufgabe
              </button>
              <button className="text-button" onClick={() => run(api.openMain)}>
                Alle öffnen <ArrowUpRight size={17} />
              </button>
            </footer>
          </>
        ) : (
          <>
            {view === "overview" && (
              <div className="stats">
                <button className="stat-card" onClick={() => setView("today")}>
                  <span className="stat-icon">
                    <CalendarDays size={22} />
                  </span>
                  <span>
                    <span className="stat-label">Heute fällig</span>
                    <strong>
                      {active.filter((t) => t.dueDate === clock).length}
                    </strong>
                    <small>Dein heutiger Plan</small>
                  </span>
                </button>
                <button
                  className="stat-card"
                  onClick={() => {
                    setView("today");
                    setSort("due");
                  }}
                >
                  <span className="stat-icon red">
                    <Clock3 size={22} />
                  </span>
                  <span>
                    <span className="stat-label">Überfällig</span>
                    <strong>{overdue.length}</strong>
                    <small>
                      {overdue.length
                        ? "Braucht deine Aufmerksamkeit"
                        : "Alles im grünen Bereich"}
                    </small>
                  </span>
                </button>
                <button
                  className="stat-card"
                  onClick={() => setView("calendar")}
                >
                  <span className="stat-icon">
                    <CheckCheck size={22} />
                  </span>
                  <span>
                    <span className="stat-label">Nächste 7 Tage</span>
                    <strong>
                      {
                        active.filter(
                          (t) =>
                            t.dueDate &&
                            t.dueDate >= clock &&
                            t.dueDate <= plusDays(clock, 6),
                        ).length
                      }
                    </strong>
                    <small>Ein Blick nach vorn</small>
                  </span>
                </button>
              </div>
            )}
            {view === "calendar" ? (
              <CalendarView
                tasks={state.tasks}
                projects={state.projects}
                onOpen={edit}
                onAdd={(date) => edit({ ...freshTask(), dueDate: date })}
                onMove={(task, date) =>
                  run(() =>
                    apply({
                      type: "save_task",
                      task: {
                        ...task,
                        plannedAt: new Date(`${date}T09:00:00`).toISOString(),
                      },
                    }),
                  )
                }
              />
            ) : (
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <span className="section-kicker">
                      {view === "overview" ? "HEUTE ZÄHLT" : "DEINE AUFGABEN"}
                    </span>
                    <h2>
                      {view === "overview"
                        ? "Mein Fokus & mein Tag"
                        : view === "done"
                          ? "Erledigte Aufgaben"
                          : (project?.name ?? "Aufgaben")}{" "}
                      <span className="subtle-count">{tasks.length}</span>
                    </h2>
                  </div>
                  {view === "overview" && <Star size={20} className="accent" />}
                </div>
                <div className="toolbar">
                  <label className="search">
                    <Search size={17} />
                    <input
                      data-search
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Aufgaben durchsuchen …"
                      aria-label="Aufgaben durchsuchen"
                    />
                    <kbd>Strg K</kbd>
                  </label>
                  <label className="select-wrap">
                    <span className="sr-only">Priorität filtern</span>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      <option value="all">Alle Prioritäten</option>
                      {Object.entries(PRIORITIES).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="select-wrap">
                    <ArrowDownUp size={14} />
                    <span className="sr-only">Sortieren</span>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="due">Nach Datum</option>
                      <option value="priority">Nach Priorität</option>
                      <option value="title">Nach Titel</option>
                    </select>
                  </label>
                  <label className="select-wrap">
                    <span className="sr-only">Gruppieren</span>
                    <select
                      value={group}
                      onChange={(e) => setGroup(e.target.value)}
                    >
                      <option value="none">Ohne Gruppen</option>
                      <option value="project">Nach Projekt</option>
                      <option value="date">Nach Datum</option>
                    </select>
                  </label>
                </div>
                {group === "none"
                  ? taskList(tasks)
                  : [
                      ...new Set(
                        tasks.map((t) =>
                          group === "project"
                            ? (t.projectId ?? "")
                            : (t.dueDate ?? ""),
                        ),
                      ),
                    ].map((key) => (
                      <div className="task-group" key={key}>
                        <h3>
                          {group === "project"
                            ? (state.projects.find((p) => p.id === key)?.name ??
                              "Eingang")
                            : dateLabel(key || null)}
                        </h3>
                        {taskList(
                          tasks.filter(
                            (t) =>
                              (group === "project"
                                ? (t.projectId ?? "")
                                : (t.dueDate ?? "")) === key,
                          ),
                        )}
                      </div>
                    ))}
              </section>
            )}
            {view === "overview" && (
              <div className="overview-bottom">
                <section className="panel week-preview">
                  <div className="section-heading">
                    <div>
                      <span className="section-kicker">GUT GEPLANT</span>
                      <h2>Die nächsten Tage</h2>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setView("calendar")}
                    >
                      Kalender <ArrowUpRight size={16} />
                    </button>
                  </div>
                  <div className="week-strip">
                    {Array.from({ length: 5 }, (_, i) =>
                      plusDays(clock, i),
                    ).map((date, i) => (
                      <div
                        className={`week-day ${i === 0 ? "current" : ""}`}
                        key={date}
                      >
                        <div className="week-date">
                          <span>
                            {parseDay(date).toLocaleDateString("de-DE", {
                              weekday: "short",
                            })}
                          </span>
                          <strong>{parseDay(date).getDate()}</strong>
                        </div>
                        {active
                          .filter(
                            (t) =>
                              t.dueDate === date ||
                              (!!t.plannedAt &&
                                dayKey(new Date(t.plannedAt)) === date),
                          )
                          .slice(0, 3)
                          .map((t) => (
                            <button
                              key={t.id}
                              className="week-event"
                              onClick={() => edit(t)}
                            >
                              {t.title}
                            </button>
                          ))}
                      </div>
                    ))}
                  </div>
                </section>
                <section className="panel project-summary">
                  <div className="section-heading">
                    <div>
                      <span className="section-kicker">
                        SCHRITT FÜR SCHRITT
                      </span>
                      <h2>Deine Projekte</h2>
                    </div>
                    <button
                      className="icon-button"
                      aria-label="Neues Projekt"
                      onClick={() =>
                        setProjectEditor({
                          id: crypto.randomUUID(),
                          name: "",
                          color: "#ff851b",
                        })
                      }
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  {state.projects.length ? (
                    state.projects.slice(0, 5).map((p) => {
                      const total = state.tasks.filter(
                        (t) => t.projectId === p.id,
                      );
                      const done = total.filter(
                        (t) => t.status === "done",
                      ).length;
                      return (
                        <button
                          key={p.id}
                          className="project-progress"
                          onClick={() => setView(`project:${p.id}`)}
                        >
                          <div>
                            <span
                              className="project-dot"
                              style={{ background: p.color }}
                            />
                            <strong>{p.name}</strong>
                            <small>
                              {done}/{total.length}
                            </small>
                          </div>
                          <div className="progress-track">
                            <span
                              style={{
                                width: `${total.length ? (done / total.length) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="project-empty">
                      <Folder size={25} />
                      <p>Gib deinen Vorhaben ein Zuhause.</p>
                      <button
                        className="text-button"
                        onClick={() =>
                          setProjectEditor({
                            id: crypto.randomUUID(),
                            name: "",
                            color: "#ff851b",
                          })
                        }
                      >
                        Erstes Projekt anlegen <ArrowUpRight size={15} />
                      </button>
                    </div>
                  )}
                </section>
              </div>
            )}
            <footer className="page-footer">
              <span>
                <span className="online-dot" />
                Deine Daten bleiben lokal.
              </span>
              <span>Ein klarer Kopf beginnt mit einem guten Plan.</span>
            </footer>
          </>
        )}
      </main>
      {error && (
        <div className="toast error" role="alert">
          <span>{error}</span>
          <button
            className="icon-button"
            aria-label="Fehlermeldung schließen"
            onClick={() => setError("")}
          >
            <X size={17} />
          </button>
        </div>
      )}
      {notice && !error && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
        </div>
      )}
      {editor && (
        <TaskEditor
          key={editor.id}
          task={editor}
          projects={state.projects}
          busy={busy}
          exists={state.tasks.some((t) => t.id === editor.id)}
          onClose={() => setEditor(null)}
          onSave={saveTask}
          onDelete={() =>
            run(async () => {
              await apply(
                { type: "delete_task", id: editor.id },
                editorRevision.current,
              );
              setEditor(null);
              setNotice("Aufgabe gelöscht");
            })
          }
          onAttach={async (file) => {
            const saved = await saveTask(editor, false);
            const next = await api.attach(editor.id, file, saved.revision);
            accept(next);
            editorRevision.current = next.revision;
            setEditor(
              structuredClone(next.tasks.find((t) => t.id === editor.id)!),
            );
          }}
          onDraft={setEditor}
        />
      )}
      {projectEditor && (
        <ProjectEditor
          project={projectEditor}
          exists={state.projects.some((p) => p.id === projectEditor.id)}
          busy={busy}
          onClose={() => setProjectEditor(null)}
          onSave={(p) =>
            run(async () => {
              await apply({ type: "save_project", project: p });
              setProjectEditor(null);
              setView(`project:${p.id}`);
              setNotice("Projekt gespeichert");
            })
          }
          onDelete={() =>
            run(async () => {
              await apply({ type: "delete_project", id: projectEditor.id });
              setProjectEditor(null);
              setView("inbox");
            })
          }
        />
      )}
      {settingsOpen && (
        <SettingsDialog
          state={state}
          onClose={() => setSettingsOpen(false)}
          onSave={(settings) => apply({ type: "settings", settings })}
          onState={accept}
          onNotice={setNotice}
          onError={(e) => setError(message(e))}
        />
      )}
    </div>
  );
}

function Empty({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
function TaskRow({
  task: t,
  project,
  busy,
  onOpen,
  onToggle,
}: {
  task: Task;
  project?: Project;
  busy: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const overdue = t.status !== "done" && !!t.dueDate && t.dueDate < dayKey();
  return (
    <div className={`task-row ${t.status === "done" ? "completed" : ""}`}>
      <button
        className="checkbox"
        role="checkbox"
        aria-checked={t.status === "done"}
        aria-label={`${t.title} ${t.status === "done" ? "wieder öffnen" : "abhaken"}`}
        disabled={busy}
        onClick={onToggle}
      >
        {t.status === "done" && <Check size={15} />}
      </button>
      <button className="task-content" onClick={onOpen}>
        <span className="task-title">
          {t.title}
          {t.focus && <Star size={13} className="accent" />}
        </span>
        <span className="task-meta">
          {project ? (
            <>
              <span
                className="project-dot"
                style={{ background: project.color }}
              />
              {project.name}
              <span>·</span>
            </>
          ) : null}
          <span className={overdue ? "overdue" : ""}>
            {dateLabel(t.dueDate)}
            {overdue ? " · überfällig" : ""}
          </span>
          {t.plannedAt && (
            <span>
              ·{" "}
              {new Date(t.plannedAt).toLocaleTimeString("de-DE", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          {t.status !== "open" && t.status !== "done" && (
            <span className="status-tag">{STATUSES[t.status]}</span>
          )}
        </span>
      </button>
      <div className="task-symbols">
        {t.reminderAt && <Bell size={15} />}{" "}
        {!!t.notes && <StickyNote size={15} />}{" "}
        {!!t.attachments.length && (
          <span title={`${t.attachments.length} Anhänge`}>
            <Paperclip size={15} />
            <small>{t.attachments.length}</small>
          </span>
        )}
      </div>
      <span className={`priority ${t.priority}`}>
        <i />
        {PRIORITIES[t.priority]}
      </span>
    </div>
  );
}

function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "dialog wide" : "dialog"}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-label={title}
    >
      <header className="dialog-header">
        <h2>{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Schließen"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}

function TaskEditor({
  task,
  projects,
  busy,
  exists,
  onClose,
  onSave,
  onDelete,
  onAttach,
  onDraft,
}: {
  task: Task;
  projects: Project[];
  busy: boolean;
  exists: boolean;
  onClose: () => void;
  onSave: (t: Task, close?: boolean) => Promise<AppState>;
  onDelete: () => void;
  onAttach: (f: File) => Promise<void>;
  onDraft: (t: Task) => void;
}) {
  const [error, setError] = useState("");
  const [attaching, setAttaching] = useState(false);
  const [sub, setSub] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const update = (patch: Partial<Task>) => onDraft({ ...task, ...patch });
  const attachFile = async (file: File) => {
    setAttaching(true);
    setError("");
    try {
      await onAttach(file);
    } catch (e) {
      setError(message(e));
    } finally {
      setAttaching(false);
    }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (task.repeat !== "none" && !task.dueDate) {
      setError("Bitte für die Wiederholung ein Fälligkeitsdatum wählen.");
      return;
    }
    void onSave(task).catch((e) => setError(message(e)));
  };
  return (
    <Dialog
      title={exists ? "Deine Aufgabe" : "Ein neuer Schritt"}
      onClose={() => {
        if (!attaching) onClose();
      }}
      wide
    >
      <form
        onSubmit={submit}
        onPaste={(e) => {
          const f = [...e.clipboardData.files].find((f) =>
            f.type.startsWith("image/"),
          );
          if (f) {
            e.preventDefault();
            void attachFile(f);
          }
        }}
      >
        <div className="dialog-body">
          <label className="field title-field">
            Was möchtest du erledigen?
            <input
              autoFocus
              required
              maxLength={500}
              placeholder="z. B. Angebot für Kunde A abschließen"
              value={task.title}
              onChange={(e) => update({ title: e.target.value })}
            />
          </label>
          <div className="field-grid">
            <label className="field">
              Projekt
              <select
                value={task.projectId ?? ""}
                onChange={(e) => update({ projectId: e.target.value || null })}
              >
                <option value="">Eingang / ohne Projekt</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Priorität
                <select aria-label="Priorität"
                value={task.priority}
                onChange={(e) =>
                  update({ priority: e.target.value as Task["priority"] })
                }
              >
                {Object.entries(PRIORITIES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Status
              <select
                value={task.status}
                onChange={(e) =>
                  update({ status: e.target.value as Task["status"] })
                }
              >
                {Object.entries(STATUSES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="focus-check">
              <input
                type="checkbox"
                checked={task.focus}
                onChange={(e) => update({ focus: e.target.checked })}
              />
              <Star size={17} /> In meinen Tagesfokus
            </label>
          </div>
          <div className="form-divider" />
          <h3 className="form-heading">
            <CalendarDays size={17} /> Zeit für deinen Plan
          </h3>
          <div className="field-grid">
            <label className="field">
              Fällig am
              <input
                type="date"
                value={task.dueDate ?? ""}
                onChange={(e) => update({ dueDate: e.target.value || null })}
              />
            </label>
            <label className="field">
              Geplant für
              <input
                type="datetime-local"
                value={localInput(task.plannedAt)}
                onChange={(e) =>
                  update({ plannedAt: isoInput(e.target.value) })
                }
              />
            </label>
            <label className="field">
              Erinnern am
              <input
                type="datetime-local"
                value={localInput(task.reminderAt)}
                onChange={(e) =>
                  update({ reminderAt: isoInput(e.target.value) })
                }
              />
            </label>
            <label className="field">
              Wiederholung
              <select
                value={task.repeat}
                onChange={(e) =>
                  update({ repeat: e.target.value as Task["repeat"] })
                }
              >
                <option value="none">Einmalig</option>
                <option value="daily">Täglich</option>
                <option value="weekly">Wöchentlich</option>
                <option value="monthly">Monatlich</option>
              </select>
            </label>
          </div>
          <p className="field-hint">
            Fälligkeit ist deine Frist. „Geplant für“ reserviert einen
            Zeitpunkt. Erinnerungen benötigen die laufende Desktop-App.
          </p>
          <div className="form-divider" />
          <label className="field">
            Notizen
            <textarea
              aria-label="Notizen"
              rows={4}
              maxLength={200000}
              placeholder="Gedanken, Details und Links …"
              value={task.notes}
              onChange={(e) => update({ notes: e.target.value })}
            />
          </label>
          <h3 className="form-heading">
            <ListTodo size={17} /> Kleine Schritte
          </h3>
          <div className="subtasks">
            {task.subtasks.map((s) => (
              <div className="subtask" key={s.id}>
                <input
                  aria-label={`${s.title} erledigt`}
                  type="checkbox"
                  checked={s.done}
                  onChange={(e) =>
                    update({
                      subtasks: task.subtasks.map((x) =>
                        x.id === s.id ? { ...x, done: e.target.checked } : x,
                      ),
                    })
                  }
                />
                <span className={s.done ? "struck" : ""}>{s.title}</span>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`${s.title} entfernen`}
                  onClick={() =>
                    update({
                      subtasks: task.subtasks.filter((x) => x.id !== s.id),
                    })
                  }
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="subtask-add">
            <input
              aria-label="Neue Unteraufgabe"
              placeholder="Unteraufgabe hinzufügen …"
              value={sub}
              maxLength={500}
              onChange={(e) => setSub(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (sub.trim()) {
                    update({
                      subtasks: [
                        ...task.subtasks,
                        {
                          id: crypto.randomUUID(),
                          title: sub.trim(),
                          done: false,
                        },
                      ],
                    });
                    setSub("");
                  }
                }
              }}
            />
            <button
              type="button"
              className="secondary"
              disabled={!sub.trim()}
              onClick={() => {
                update({
                  subtasks: [
                    ...task.subtasks,
                    { id: crypto.randomUUID(), title: sub.trim(), done: false },
                  ],
                });
                setSub("");
              }}
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="form-divider" />
          <h3 className="form-heading">
            <Paperclip size={17} /> Bilder & Dateien
          </h3>
          <div className="attachments">
            {task.attachments.map((a) => (
              <AttachmentCard
                key={a.id}
                attachment={a}
                onRemove={() =>
                  update({
                    attachments: task.attachments.filter((x) => x.id !== a.id),
                  })
                }
              />
            ))}
          </div>
          <div
            className="dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (!attaching && e.dataTransfer.files[0])
                void attachFile(e.dataTransfer.files[0]);
            }}
          >
            <Paperclip size={22} />
            <span>
              {attaching
                ? "Datei wird gespeichert …"
                : "Datei hineinziehen oder Screenshot mit Strg+V einfügen"}
            </span>
            <button
              type="button"
              className="text-button"
              disabled={attaching || busy || !task.title.trim()}
              onClick={() => fileRef.current?.click()}
            >
              Datei auswählen
            </button>
            <small>
              Max. 20 MB je Datei · Die Aufgabe wird dabei gespeichert.
            </small>
            <input
              type="file"
              ref={fileRef}
              hidden
              onChange={(e) => {
                if (e.target.files?.[0]) void attachFile(e.target.files[0]);
                e.target.value = "";
              }}
            />
          </div>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          {exists && (
            <p className="field-hint">
              Zuletzt geändert:{" "}
              {new Date(task.updatedAt).toLocaleString("de-DE")}
            </p>
          )}
        </div>
        <footer className="dialog-footer">
          {exists &&
            (deleteConfirm ? (
              <div className="delete-confirm">
                <span>Aufgabe löschen?</span>
                <button
                  type="button"
                  className="danger"
                  disabled={busy || attaching}
                  onClick={onDelete}
                >
                  Ja, löschen
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setDeleteConfirm(false)}
                >
                  Abbrechen
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="icon-button danger-text"
                aria-label="Aufgabe löschen"
                onClick={() => setDeleteConfirm(true)}
              >
                <Trash2 size={18} />
              </button>
            ))}
          <div className="spacer" />
          <button
            type="button"
            className="secondary"
            disabled={attaching || busy}
            onClick={onClose}
          >
            Schließen
          </button>
          <button
            className="primary"
            disabled={busy || attaching || !task.title.trim()}
            type="submit"
          >
            <Check size={17} />
            {busy ? "Speichert …" : "Speichern"}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}

function AttachmentCard({
  attachment: a,
  onRemove,
}: {
  attachment: Attachment;
  onRemove: () => void;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (api.native && a.mime.startsWith("image/") && a.mime !== "image/svg+xml")
      api
        .attachmentUrl(a)
        .then(setUrl)
        .catch((e) => setError(message(e)));
  }, [a.id, a.mime]);
  return (
    <div className="attachment">
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt={a.name} />
        </a>
      ) : (
        <Paperclip size={22} />
      )}
      <span>
        <strong>{a.name}</strong>
        <small>
          {Math.max(1, Math.round(a.size / 1024))} KB{" "}
          {error && "· Vorschau nicht verfügbar"}
        </small>
      </span>
      <button
        type="button"
        className="icon-button"
        aria-label={`${a.name} speichern`}
        onClick={() => {
          void (async () => {
            const { save } = await import("@tauri-apps/plugin-dialog");
            const path = await save({
              defaultPath: a.name.split(/[\\/]/).pop(),
            });
            if (path) {
              const { invoke } = await import("@tauri-apps/api/core");
              await invoke("save_attachment", { id: a.id, path });
            }
          })().catch((e) => setError(message(e)));
        }}
      >
        <Download size={16} />
      </button>
      <button
        type="button"
        className="icon-button"
        aria-label={`${a.name} entfernen`}
        onClick={onRemove}
      >
        <X size={16} />
      </button>
    </div>
  );
}

function ProjectEditor({
  project,
  exists,
  busy,
  onClose,
  onSave,
  onDelete,
}: {
  project: Project;
  exists: boolean;
  busy: boolean;
  onClose: () => void;
  onSave: (p: Project) => void;
  onDelete: () => void;
}) {
  const [p, setP] = useState(project);
  const [confirm, setConfirm] = useState(false);
  return (
    <Dialog
      title={exists ? "Projekt bearbeiten" : "Ein neues Projekt"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ ...p, name: p.name.trim() });
        }}
      >
        <div className="dialog-body">
          <label className="field">
            Projektname
            <input
              required
              autoFocus
              maxLength={200}
              placeholder="z. B. Website oder Haus & Garten"
              value={p.name}
              onChange={(e) => setP({ ...p, name: e.target.value })}
            />
          </label>
          <label className="field">
            Projektfarbe
            <input
              type="color"
              value={p.color}
              onChange={(e) => setP({ ...p, color: e.target.value })}
            />
          </label>
          {confirm && (
            <div className="confirm-box">
              <p>
                Projekt entfernen? Die Aufgaben bleiben im Eingang erhalten.
              </p>
              <button
                type="button"
                className="danger"
                disabled={busy}
                onClick={onDelete}
              >
                Projekt entfernen
              </button>
            </div>
          )}
        </div>
        <footer className="dialog-footer">
          {exists && (
            <button
              type="button"
              className="icon-button danger-text"
              aria-label="Projekt entfernen"
              onClick={() => setConfirm(true)}
            >
              <Trash2 size={18} />
            </button>
          )}
          <div className="spacer" />
          <button type="button" className="secondary" onClick={onClose}>
            Abbrechen
          </button>
          <button className="primary" disabled={busy || !p.name.trim()}>
            Speichern
          </button>
        </footer>
      </form>
    </Dialog>
  );
}

function SettingsDialog({
  state,
  onClose,
  onSave,
  onState,
  onNotice,
  onError,
}: {
  state: AppState;
  onClose: () => void;
  onSave: (s: Settings) => Promise<AppState>;
  onState: (s: AppState) => void;
  onNotice: (s: string) => void;
  onError: (e: unknown) => void;
}) {
  const [working, setWorking] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [autostart, setAutostart] = useState(false);
  useEffect(() => {
    if (api.native)
      void import("@tauri-apps/plugin-autostart")
        .then((m) => m.isEnabled())
        .then(setAutostart)
        .catch(onError);
  }, []);
  const perform = (fn: () => Promise<unknown>) => {
    setWorking(true);
    void fn()
      .catch(onError)
      .finally(() => setWorking(false));
  };
  return (
    <Dialog title="Dein Klar. Deine Einstellungen." onClose={onClose} wide>
      <div className="dialog-body settings-body">
        <div className="settings-section">
          <h3>
            <Home size={18} /> Auf deinem Computer
          </h3>
          <p>
            Aufgaben und Anhänge werden im lokalen App-Datenordner gespeichert.
            Es gibt keine automatische Cloud-Synchronisierung.
          </p>
          <label className="toggle-line">
            <span>
              Beim Schließen im Infobereich weiterlaufen
              <small>Damit Erinnerungen aktiv bleiben.</small>
            </span>
            <input
              type="checkbox"
              disabled={working}
              checked={state.settings.closeToTray}
              onChange={(e) =>
                perform(() =>
                  onSave({ ...state.settings, closeToTray: e.target.checked }),
                )
              }
            />
          </label>
          <label className="toggle-line">
            <span>Mit Windows starten</span>
            <input
              type="checkbox"
              disabled={!api.native || working}
              checked={autostart}
              onChange={(e) => {
                const enabled = e.target.checked;
                perform(async () => {
                  const m = await import("@tauri-apps/plugin-autostart");
                  if (enabled) await m.enable();
                  else await m.disable();
                  setAutostart(enabled);
                });
              }}
            />
          </label>
          <button
            className="secondary"
            onClick={() =>
              perform(async () => {
                const { invoke } = await import("@tauri-apps/api/core");
                await invoke("test_notification");
                onNotice("Testbenachrichtigung angefordert");
              })
            }
            disabled={working || !api.native}
          >
            <Bell size={16} /> Erinnerung testen
          </button>
        </div>
        <div className="settings-section">
          <h3>
            <Download size={18} /> Sicherung & Wiederherstellung
          </h3>
          <p>
            Eine .klar-Datei enthält deine Aufgaben, Projekte und Anhänge. Vor
            dem Wiederherstellen wird automatisch eine Sicherheitskopie
            angelegt.
          </p>
          <div className="button-row">
            <button
              className="secondary"
              disabled={working || !api.native}
              onClick={() =>
                perform(async () => {
                  if (await api.backup()) onNotice("Sicherung erstellt");
                })
              }
            >
              <Download size={16} /> Sicherung erstellen
            </button>
            <button
              className="secondary"
              disabled={working || !api.native}
              onClick={() => setConfirm(true)}
            >
              <Upload size={16} /> Wiederherstellen
            </button>
          </div>
          {confirm && (
            <div className="confirm-box">
              <p>
                Die gewählte Sicherung ersetzt deine aktuellen Aufgaben und
                Projekte. Fortfahren?
              </p>
              <button
                className="danger"
                disabled={working}
                onClick={() =>
                  perform(async () => {
                    const next = await api.restore(state.revision);
                    if (next) {
                      onState(next);
                      onNotice("Sicherung wiederhergestellt");
                    }
                    setConfirm(false);
                  })
                }
              >
                Sicherung auswählen
              </button>
              <button className="text-button" onClick={() => setConfirm(false)}>
                Abbrechen
              </button>
            </div>
          )}
        </div>
        <div className="settings-section">
          <h3>
            <CircleHelp size={18} /> Codex & KI-Zugriff
          </h3>
          <p>
            Die lokale MCP-Schnittstelle verwendet diese Freigabe. Bei Online-KI
            können ausgewählte Inhalte an den Anbieter übertragen werden.
          </p>
          <label className="field">
            Zugriff
            <select
              disabled={working}
              value={state.settings.aiAccess}
              onChange={(e) =>
                perform(() =>
                  onSave({
                    ...state.settings,
                    aiAccess: e.target.value as Settings["aiAccess"],
                  }),
                )
              }
            >
              <option value="off">Aus – kein Zugriff</option>
              <option value="read">Aufgaben und Projekte lesen</option>
              <option value="write">Lesen und Aufgaben bearbeiten</option>
            </select>
          </label>
          <p className="field-hint">
            Einrichtung: docs/MCP.md im Projekt. Keine öffentliche
            Netzwerkfreigabe.
          </p>
        </div>
        <div className="settings-section">
          <h3>
            <Clock3 size={18} /> Letzte Änderungen
          </h3>
          <div className="history">
            {state.history.slice(0, 15).map((h, i) => (
              <div key={`${h.at}-${i}`}>
                <span>{h.action}</span>
                <small>
                  {new Date(h.at).toLocaleString("de-DE")} · {h.source}
                </small>
              </div>
            ))}
            {!state.history.length && <p>Noch keine Änderungen.</p>}
          </div>
        </div>
      </div>
      <footer className="dialog-footer">
        <span className="field-hint">
          Klar 0.1.0 · Lokal. Übersichtlich. Dein.
        </span>
        <div className="spacer" />
        <button className="primary" onClick={onClose}>
          Fertig
        </button>
      </footer>
    </Dialog>
  );
}

function CalendarView({
  tasks,
  projects,
  onOpen,
  onAdd,
  onMove,
}: {
  tasks: Task[];
  projects: Project[];
  onOpen: (t: Task) => void;
  onAdd: (date: string) => void;
  onMove: (t: Task, date: string) => void;
}) {
  const [anchor, setAnchor] = useState(dayKey());
  const [mode, setMode] = useState<"month" | "week">("month");
  const [filter, setFilter] = useState("all");
  const d = parseDay(anchor);
  const first =
    mode === "month" ? new Date(d.getFullYear(), d.getMonth(), 1, 12) : d;
  const start = plusDays(dayKey(first), -((first.getDay() + 6) % 7));
  const dates = Array.from({ length: mode === "month" ? 42 : 7 }, (_, i) =>
    plusDays(start, i),
  );
  const navigate = (direction: number) => {
    if (mode === "week") setAnchor(plusDays(anchor, direction * 7));
    else
      setAnchor(
        dayKey(new Date(d.getFullYear(), d.getMonth() + direction, 1, 12)),
      );
  };
  const relevant = tasks.filter(
    (t) => t.status !== "done" && (filter === "all" || t.projectId === filter),
  );
  return (
    <section className="panel calendar-panel">
      <div className="calendar-toolbar">
        <div className="button-row">
          <button
            className="icon-button"
            aria-label="Vorheriger Zeitraum"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            className="icon-button"
            aria-label="Nächster Zeitraum"
            onClick={() => navigate(1)}
          >
            <ChevronRight size={20} />
          </button>
          <h2>
            {d.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
          </h2>
          <button
            className="secondary small"
            onClick={() => setAnchor(dayKey())}
          >
            Heute
          </button>
        </div>
        <div className="button-row">
          <select
            aria-label="Kalender nach Projekt filtern"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Alle Projekte</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="segmented">
            <button
              className={mode === "month" ? "active" : ""}
              onClick={() => setMode("month")}
            >
              Monat
            </button>
            <button
              className={mode === "week" ? "active" : ""}
              onClick={() => setMode("week")}
            >
              Woche
            </button>
          </div>
        </div>
      </div>
      <div className="calendar-weekdays">
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className={`calendar-grid ${mode}`}>
        {dates.map((date) => (
          <div
            className={`calendar-day ${date === dayKey() ? "current" : ""} ${parseDay(date).getMonth() !== d.getMonth() ? "other-month" : ""}`}
            key={date}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const task = relevant.find(
                (t) => t.id === e.dataTransfer.getData("text/klar-task"),
              );
              if (task) onMove(task, date);
            }}
          >
            <div className="calendar-day-header">
              <span>{parseDay(date).getDate()}</span>
              <button
                className="icon-button"
                aria-label={`Aufgabe am ${date} hinzufügen`}
                onClick={() => onAdd(date)}
              >
                <Plus size={14} />
              </button>
            </div>
            {relevant
              .filter(
                (t) =>
                  t.dueDate === date ||
                  (!!t.plannedAt && dayKey(new Date(t.plannedAt)) === date),
              )
              .map((t) => {
                const planned =
                  !!t.plannedAt && dayKey(new Date(t.plannedAt)) === date;
                return (
                  <button
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/klar-task", t.id)
                    }
                    key={t.id}
                    className={`calendar-event ${planned ? "planned" : ""}`}
                    onClick={() => onOpen(t)}
                  >
                    <span className={`priority-dot ${t.priority}`} />
                    <strong>{t.title}</strong>
                    <small>
                      {planned
                        ? `${new Date(t.plannedAt!).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} · geplant`
                        : "Fällig"}
                    </small>
                  </button>
                );
              })}
          </div>
        ))}
      </div>
      <p className="calendar-hint">
        Aufgaben auf einen Tag ziehen, um sie um 09:00 Uhr einzuplanen. Die
        Fälligkeit bleibt erhalten.
      </p>
      <div className="undated">
        <h3>
          Ohne Termin{" "}
          <span className="subtle-count">
            {relevant.filter((t) => !t.dueDate && !t.plannedAt).length}
          </span>
        </h3>
        <div>
          {relevant
            .filter((t) => !t.dueDate && !t.plannedAt)
            .map((t) => (
              <button
                key={t.id}
                draggable
                onDragStart={(e) =>
                  e.dataTransfer.setData("text/klar-task", t.id)
                }
                className="secondary small"
                onClick={() => onOpen(t)}
              >
                {t.title}
              </button>
            ))}
        </div>
      </div>
    </section>
  );
}
