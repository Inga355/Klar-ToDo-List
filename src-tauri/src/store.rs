use chrono::{DateTime, Days, Local, Months, NaiveDate, Utc};
use rusqlite::{params, Connection, TransactionBehavior};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    time::Duration,
};
use uuid::Uuid;

pub type Result<T> = std::result::Result<T, String>;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub color: String,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Subtask {
    pub id: String,
    pub title: String,
    pub done: bool,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Attachment {
    pub id: String,
    pub name: String,
    pub mime: String,
    pub size: usize,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub project_id: Option<String>,
    pub priority: String,
    pub status: String,
    pub due_date: Option<String>,
    pub planned_at: Option<String>,
    pub reminder_at: Option<String>,
    pub reminded_at: Option<String>,
    pub repeat: String,
    pub notes: String,
    pub subtasks: Vec<Subtask>,
    pub attachments: Vec<Attachment>,
    pub focus: bool,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Settings {
    pub ai_access: String,
    pub close_to_tray: bool,
    pub mini_filter: String,
    pub mini_pinned: bool,
}
impl Default for Settings {
    fn default() -> Self {
        Self {
            ai_access: "off".into(),
            close_to_tray: true,
            mini_filter: "today".into(),
            mini_pinned: false,
        }
    }
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Audit {
    pub at: String,
    pub action: String,
    pub source: String,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AppState {
    pub schema_version: u32,
    pub revision: u64,
    pub projects: Vec<Project>,
    pub tasks: Vec<Task>,
    pub settings: Settings,
    pub history: Vec<Audit>,
}
impl Default for AppState {
    fn default() -> Self {
        Self {
            schema_version: 1,
            revision: 0,
            projects: vec![],
            tasks: vec![],
            settings: Settings::default(),
            history: vec![],
        }
    }
}
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case", deny_unknown_fields)]
pub enum Operation {
    SaveTask { task: Box<Task> },
    ToggleTask { id: String },
    DeleteTask { id: String },
    SaveProject { project: Project },
    DeleteProject { id: String },
    Settings { settings: Settings },
}

#[derive(Clone)]
pub struct Store {
    pub root: PathBuf,
}
pub fn app_root() -> Result<PathBuf> {
    directories::BaseDirs::new()
        .map(|d| d.data_dir().join("de.klar.todo"))
        .ok_or("Benutzerordner nicht gefunden".into())
}
fn id_valid(s: &str) -> bool {
    Uuid::parse_str(s).is_ok()
}
fn valid_date(s: &str) -> bool {
    s.len() == 10 && NaiveDate::parse_from_str(s, "%Y-%m-%d").is_ok()
}
fn valid_time(s: &str) -> bool {
    DateTime::parse_from_rfc3339(s).is_ok()
}
fn ensure(ok: bool, message: &str) -> Result<()> {
    if ok {
        Ok(())
    } else {
        Err(message.into())
    }
}

pub fn validate(state: &AppState) -> Result<()> {
    ensure(state.schema_version == 1, "Unbekannte Datenversion")?;
    ensure(
        state.tasks.len() <= 50_000 && state.projects.len() <= 2_000,
        "Zu viele Einträge",
    )?;
    let mut ids = std::collections::HashSet::new();
    for p in &state.projects {
        ensure(
            id_valid(&p.id) && ids.insert(&p.id),
            "Ungültige oder doppelte Projekt-ID",
        )?;
        ensure(
            !p.name.trim().is_empty() && p.name.len() <= 200,
            "Projektname fehlt oder ist zu lang",
        )?;
        ensure(
            p.color.len() == 7
                && p.color.starts_with('#')
                && p.color[1..].bytes().all(|b| b.is_ascii_hexdigit()),
            "Ungültige Projektfarbe",
        )?;
    }
    let mut task_ids = std::collections::HashSet::new();
    for t in &state.tasks {
        ensure(
            id_valid(&t.id) && task_ids.insert(&t.id),
            "Ungültige oder doppelte Aufgaben-ID",
        )?;
        ensure(
            !t.title.trim().is_empty() && t.title.len() <= 500 && t.notes.len() <= 200_000,
            "Aufgabentitel fehlt oder Text zu lang",
        )?;
        ensure(
            t.project_id
                .as_ref()
                .is_none_or(|id| state.projects.iter().any(|p| &p.id == id)),
            "Projekt existiert nicht",
        )?;
        ensure(
            ["high", "normal", "low"].contains(&t.priority.as_str()),
            "Ungültige Priorität",
        )?;
        ensure(
            ["open", "progress", "waiting", "done"].contains(&t.status.as_str()),
            "Ungültiger Status",
        )?;
        ensure(
            ["none", "daily", "weekly", "monthly"].contains(&t.repeat.as_str()),
            "Ungültige Wiederholung",
        )?;
        ensure(
            t.due_date.as_ref().is_none_or(|s| valid_date(s)),
            "Ungültiges Fälligkeitsdatum",
        )?;
        for v in [
            &t.planned_at,
            &t.reminder_at,
            &t.reminded_at,
            &t.completed_at,
        ] {
            ensure(
                v.as_ref().is_none_or(|s| valid_time(s)),
                "Ungültiger Zeitpunkt",
            )?;
        }
        ensure(
            valid_time(&t.created_at) && valid_time(&t.updated_at),
            "Ungültiger Änderungszeitpunkt",
        )?;
        ensure(
            t.repeat == "none" || t.due_date.is_some(),
            "Wiederholung benötigt ein Fälligkeitsdatum",
        )?;
        ensure(
            t.subtasks.len() <= 500 && t.attachments.len() <= 100,
            "Zu viele Unteraufgaben oder Anhänge",
        )?;
        let mut sub_ids = std::collections::HashSet::new();
        for sub in &t.subtasks {
            ensure(
                id_valid(&sub.id)
                    && sub_ids.insert(&sub.id)
                    && !sub.title.trim().is_empty()
                    && sub.title.len() <= 500,
                "Ungültige Unteraufgabe",
            )?;
        }
        let mut att_ids = std::collections::HashSet::new();
        for a in &t.attachments {
            ensure(
                id_valid(&a.id)
                    && att_ids.insert(&a.id)
                    && !a.name.is_empty()
                    && a.name.len() <= 300
                    && a.size <= 20 * 1024 * 1024
                    && a.mime.len() <= 200,
                "Ungültiger Anhang",
            )?;
        }
    }
    ensure(
        ["off", "read", "write"].contains(&state.settings.ai_access.as_str()),
        "Ungültiger KI-Zugriff",
    )?;
    ensure(
        ["today", "focus", "all"].contains(&state.settings.mini_filter.as_str())
            || state
                .projects
                .iter()
                .any(|p| p.id == state.settings.mini_filter),
        "Ungültiger Miniansicht-Filter",
    )?;
    ensure(
        state.history.len() <= 1000
            && state
                .history
                .iter()
                .all(|h| valid_time(&h.at) && h.action.len() <= 600 && h.source.len() <= 30),
        "Ungültiger Verlauf",
    )
}

fn next_occurrence(original: &Task, today: NaiveDate) -> Result<Task> {
    use chrono::TimeZone;
    let mut next = original.clone();
    let old = NaiveDate::parse_from_str(
        next.due_date.as_ref().ok_or("Fälligkeitsdatum fehlt")?,
        "%Y-%m-%d",
    )
    .map_err(|e| e.to_string())?;
    let mut date = old;
    loop {
        date = if next.repeat == "monthly" {
            date.checked_add_months(Months::new(1))
        } else {
            date.checked_add_days(Days::new(if next.repeat == "weekly" { 7 } else { 1 }))
        }
        .ok_or("Datum außerhalb des Bereichs")?;
        if date > today {
            break;
        }
    }
    next.id = Uuid::new_v4().to_string();
    next.due_date = Some(date.to_string());
    let delta = date.signed_duration_since(old);
    for field in [&mut next.planned_at, &mut next.reminder_at] {
        if let Some(value) = field.as_ref() {
            let local = DateTime::parse_from_rfc3339(value)
                .map_err(|e| e.to_string())?
                .with_timezone(&Local)
                .naive_local()
                + delta;
            // Preserve local clock time through daylight saving transitions.
            let shifted = Local
                .from_local_datetime(&local)
                .earliest()
                .or_else(|| {
                    Local
                        .from_local_datetime(&(local + chrono::Duration::hours(1)))
                        .earliest()
                })
                .ok_or("Zeitpunkt existiert lokal nicht")?;
            *field = Some(shifted.to_rfc3339());
        }
    }
    next.reminded_at = None;
    next.focus = false;
    next.status = "open".into();
    next.completed_at = None;
    next.created_at = Utc::now().to_rfc3339();
    next.updated_at = next.created_at.clone();
    for sub in &mut next.subtasks {
        sub.done = false;
        sub.id = Uuid::new_v4().to_string();
    }
    Ok(next)
}

impl Store {
    pub fn new(root: PathBuf) -> Result<Self> {
        fs::create_dir_all(root.join("attachments")).map_err(|e| e.to_string())?;
        fs::create_dir_all(root.join("backups")).map_err(|e| e.to_string())?;
        let store = Self { root };
        let c = store.connect()?;
        c.execute_batch("PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL);") .map_err(|e| e.to_string())?;
        c.execute(
            "INSERT OR IGNORE INTO app_state(id,json) VALUES(1,?1)",
            [serde_json::to_string(&AppState::default()).unwrap()],
        )
        .map_err(|e| e.to_string())?;
        Ok(store)
    }
    pub fn connect(&self) -> Result<Connection> {
        let c = Connection::open(self.root.join("klar.db")).map_err(|e| e.to_string())?;
        c.busy_timeout(Duration::from_secs(10))
            .map_err(|e| e.to_string())?;
        Ok(c)
    }
    pub fn load(&self) -> Result<AppState> {
        Self::read(&self.connect()?)
    }
    fn read(c: &Connection) -> Result<AppState> {
        let json: String = c
            .query_row("SELECT json FROM app_state WHERE id=1", [], |r| r.get(0))
            .map_err(|e| e.to_string())?;
        let state = serde_json::from_str(&json)
            .map_err(|e| format!("Daten konnten nicht gelesen werden: {e}"))?;
        validate(&state)?;
        Ok(state)
    }
    pub fn change<F>(
        &self,
        expected: Option<u64>,
        source: &str,
        action: &str,
        f: F,
    ) -> Result<AppState>
    where
        F: FnOnce(&mut AppState) -> Result<()>,
    {
        let mut c = self.connect()?;
        let tx = c
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|e| e.to_string())?;
        let mut state = Self::read(&tx)?;
        ensure(
            expected.is_none_or(|v| v == state.revision),
            "Die Daten wurden inzwischen geändert. Bitte erneut öffnen und speichern.",
        )?;
        f(&mut state)?;
        state.revision += 1;
        state.history.insert(
            0,
            Audit {
                at: Utc::now().to_rfc3339(),
                action: action.into(),
                source: source.into(),
            },
        );
        state.history.truncate(1000);
        validate(&state)?;
        tx.execute(
            "UPDATE app_state SET json=?1 WHERE id=1",
            params![serde_json::to_string(&state).map_err(|e| e.to_string())?],
        )
        .map_err(|e| e.to_string())?;
        tx.commit().map_err(|e| e.to_string())?;
        Ok(state)
    }
    pub fn apply(&self, op: Operation, expected: Option<u64>, source: &str) -> Result<AppState> {
        let action = match &op {
            Operation::SaveTask { task } => format!("Aufgabe gespeichert: {}", task.title),
            Operation::ToggleTask { .. } => "Aufgabenstatus geändert".into(),
            Operation::DeleteTask { .. } => "Aufgabe gelöscht".into(),
            Operation::SaveProject { project } => format!("Projekt gespeichert: {}", project.name),
            Operation::DeleteProject { .. } => {
                "Projekt entfernt; Aufgaben im Eingang erhalten".into()
            }
            Operation::Settings { .. } => "Einstellungen gespeichert".into(),
        };
        self.change(expected, source, &action, |s| {
            if source == "mcp" && s.settings.ai_access != "write" {
                return Err("KI-Schreibzugriff ist nicht freigegeben".into());
            }
            match op {
                Operation::SaveTask { task } => {
                    let mut task = *task;
                    let was_done = s
                        .tasks
                        .iter()
                        .find(|t| t.id == task.id)
                        .is_some_and(|t| t.status == "done");
                    if let Some(old) = s.tasks.iter().find(|t| t.id == task.id) {
                        ensure(
                            task.attachments.iter().all(|a| {
                                old.attachments.iter().any(|o| {
                                    o.id == a.id
                                        && o.name == a.name
                                        && o.size == a.size
                                        && o.mime == a.mime
                                })
                            }),
                            "Anhänge müssen über die Dateifunktion hinzugefügt werden",
                        )?;
                        task.created_at = old.created_at.clone();
                        if task.reminder_at != old.reminder_at {
                            task.reminded_at = None;
                        }
                    } else {
                        ensure(
                            task.attachments.is_empty(),
                            "Neue Aufgaben dürfen keine vorhandenen Anhänge referenzieren",
                        )?;
                        task.created_at = Utc::now().to_rfc3339();
                    }
                    task.updated_at = Utc::now().to_rfc3339();
                    if task.status == "done" {
                        if !was_done && task.repeat != "none" {
                            s.tasks
                                .push(next_occurrence(&task, Local::now().date_naive())?);
                            task.repeat = "none".into();
                        }
                        task.completed_at
                            .get_or_insert_with(|| Utc::now().to_rfc3339());
                    } else {
                        task.completed_at = None;
                    }
                    if let Some(i) = s.tasks.iter().position(|t| t.id == task.id) {
                        s.tasks[i] = task;
                    } else {
                        s.tasks.push(task);
                    }
                }
                Operation::ToggleTask { id } => {
                    let index = s
                        .tasks
                        .iter()
                        .position(|t| t.id == id)
                        .ok_or("Aufgabe nicht gefunden")?;
                    if s.tasks[index].status == "done" {
                        s.tasks[index].status = "open".into();
                        s.tasks[index].completed_at = None;
                    } else {
                        if s.tasks[index].repeat != "none" {
                            s.tasks
                                .push(next_occurrence(&s.tasks[index], Local::now().date_naive())?);
                            s.tasks[index].repeat = "none".into();
                        }
                        s.tasks[index].status = "done".into();
                        s.tasks[index].completed_at = Some(Utc::now().to_rfc3339());
                    }
                    s.tasks[index].updated_at = Utc::now().to_rfc3339();
                }
                Operation::DeleteTask { id } => {
                    ensure(s.tasks.iter().any(|t| t.id == id), "Aufgabe nicht gefunden")?;
                    s.tasks.retain(|t| t.id != id);
                }
                Operation::SaveProject { project } => {
                    if let Some(i) = s.projects.iter().position(|p| p.id == project.id) {
                        s.projects[i] = project;
                    } else {
                        s.projects.push(project);
                    }
                }
                Operation::DeleteProject { id } => {
                    s.projects.retain(|p| p.id != id);
                    for t in &mut s.tasks {
                        if t.project_id.as_ref() == Some(&id) {
                            t.project_id = None;
                        }
                    }
                    if s.settings.mini_filter == id {
                        s.settings.mini_filter = "today".into();
                    }
                }
                Operation::Settings { settings } => s.settings = settings,
            }
            Ok(())
        })
    }
    pub fn add_attachment(
        &self,
        task_id: &str,
        name: String,
        mime: String,
        bytes: &[u8],
        expected: u64,
    ) -> Result<AppState> {
        ensure(
            bytes.len() <= 20 * 1024 * 1024,
            "Datei ist größer als 20 MB",
        )?;
        let id = Uuid::new_v4().to_string();
        let path = self.root.join("attachments").join(&id);
        fs::write(&path, bytes).map_err(|e| e.to_string())?;
        let result = self.change(Some(expected), "app", "Anhang hinzugefügt", |s| {
            let t = s
                .tasks
                .iter_mut()
                .find(|t| t.id == task_id)
                .ok_or("Aufgabe nicht gefunden")?;
            t.attachments.push(Attachment {
                id,
                name,
                mime,
                size: bytes.len(),
            });
            t.updated_at = Utc::now().to_rfc3339();
            Ok(())
        });
        if result.is_err() {
            let _ = fs::remove_file(path);
        }
        result
    }
    pub fn attachment_path(&self, id: &str) -> Result<PathBuf> {
        ensure(id_valid(id), "Ungültige Anhang-ID")?;
        let path = self.root.join("attachments").join(id);
        ensure(path.is_file(), "Anhang nicht gefunden")?;
        Ok(path)
    }
    pub fn read_attachment(&self, id: &str) -> Result<Vec<u8>> {
        use std::io::Read;
        let state = self.load()?;
        ensure(
            state
                .tasks
                .iter()
                .any(|t| t.attachments.iter().any(|a| a.id == id)),
            "Anhang ist keiner Aufgabe zugeordnet",
        )?;
        let file = fs::File::open(self.attachment_path(id)?).map_err(|e| e.to_string())?;
        let mut bytes = Vec::new();
        file.take(20 * 1024 * 1024 + 1)
            .read_to_end(&mut bytes)
            .map_err(|e| e.to_string())?;
        ensure(
            bytes.len() <= 20 * 1024 * 1024,
            "Datei ist größer als 20 MB",
        )?;
        Ok(bytes)
    }
    pub fn backup(&self, destination: &Path) -> Result<()> {
        use std::io::Write;
        let s = self.load()?;
        let temporary = destination.with_extension(format!("{}.tmp", Uuid::new_v4()));
        let result = (|| {
            let file = fs::File::create(&temporary).map_err(|e| e.to_string())?;
            let mut zip = zip::ZipWriter::new(file);
            let options = zip::write::SimpleFileOptions::default()
                .compression_method(zip::CompressionMethod::Deflated);
            zip.start_file("klar.json", options)
                .map_err(|e| e.to_string())?;
            zip.write_all(serde_json::to_string_pretty(&s).unwrap().as_bytes())
                .map_err(|e| e.to_string())?;
            let mut seen = std::collections::HashSet::new();
            for a in s.tasks.iter().flat_map(|t| &t.attachments) {
                if seen.insert(&a.id) {
                    zip.start_file(format!("attachments/{}", a.id), options)
                        .map_err(|e| e.to_string())?;
                    zip.write_all(
                        &fs::read(self.attachment_path(&a.id)?).map_err(|e| e.to_string())?,
                    )
                    .map_err(|e| e.to_string())?;
                }
            }
            zip.finish()
                .map_err(|e| e.to_string())?
                .sync_all()
                .map_err(|e| e.to_string())?;
            fs::rename(&temporary, destination).map_err(|e| e.to_string())?;
            Ok(())
        })();
        if result.is_err() {
            let _ = fs::remove_file(temporary);
        }
        result
    }
    pub fn restore(&self, source: &Path, expected: u64) -> Result<AppState> {
        use std::io::Read;
        let file = fs::File::open(source).map_err(|e| e.to_string())?;
        let mut zip = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
        ensure(zip.len() <= 10000, "Sicherung enthält zu viele Dateien")?;
        let mut json = String::new();
        zip.by_name("klar.json")
            .map_err(|e| e.to_string())?
            .take(20 * 1024 * 1024 + 1)
            .read_to_string(&mut json)
            .map_err(|e| e.to_string())?;
        ensure(json.len() <= 20 * 1024 * 1024, "Sicherung zu groß")?;
        let incoming: AppState =
            serde_json::from_str(&json).map_err(|e| format!("Ungültige Sicherung: {e}"))?;
        validate(&incoming)?;
        let mut blobs = std::collections::HashMap::new();
        let mut total = 0;
        for a in incoming.tasks.iter().flat_map(|t| &t.attachments) {
            if blobs.contains_key(&a.id) {
                continue;
            }
            let mut bytes = Vec::new();
            zip.by_name(&format!("attachments/{}", a.id))
                .map_err(|_| format!("Anhang fehlt: {}", a.name))?
                .take(20 * 1024 * 1024 + 1)
                .read_to_end(&mut bytes)
                .map_err(|e| e.to_string())?;
            total += bytes.len();
            ensure(
                bytes.len() == a.size && total <= 500 * 1024 * 1024,
                "Anhanggröße ungültig oder Sicherung über 500 MB",
            )?;
            let path = self.root.join("attachments").join(&a.id);
            if path.exists() {
                ensure(
                    fs::read(&path).map_err(|e| e.to_string())? == bytes,
                    "Anhang-ID kollidiert mit lokalen Daten",
                )?;
            }
            blobs.insert(a.id.clone(), bytes);
        }
        let backup = self
            .root
            .join("backups")
            .join(format!("vor-import-{}.klar", Uuid::new_v4()));
        self.backup(&backup)?;
        // Immutable blobs can safely be written before the atomic state transaction.
        for (id, bytes) in blobs {
            let path = self.root.join("attachments").join(id);
            if !path.exists() {
                fs::write(path, bytes).map_err(|e| e.to_string())?;
            }
        }
        self.change(Some(expected), "app", "Sicherung wiederhergestellt", |s| {
            s.tasks = incoming.tasks;
            s.projects = incoming.projects;
            s.settings = incoming.settings;
            // Restoring a backup must never enable external writes silently.
            s.settings.ai_access = "off".into();
            Ok(())
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn store() -> (tempfile::TempDir, Store) {
        let dir = tempfile::tempdir().unwrap();
        let store = Store::new(dir.path().into()).unwrap();
        (dir, store)
    }
    fn task() -> Task {
        Task {
            id: Uuid::new_v4().to_string(),
            title: "Prüfen".into(),
            project_id: None,
            priority: "high".into(),
            status: "open".into(),
            due_date: Some("2026-11-23".into()),
            planned_at: None,
            reminder_at: None,
            reminded_at: None,
            repeat: "none".into(),
            notes: String::new(),
            subtasks: vec![],
            attachments: vec![],
            focus: false,
            created_at: Utc::now().to_rfc3339(),
            updated_at: Utc::now().to_rfc3339(),
            completed_at: None,
        }
    }
    #[test]
    fn persists_and_rejects_stale_writes() {
        let (_dir, s) = store();
        let t = task();
        s.apply(
            Operation::SaveTask {
                task: t.clone().into(),
            },
            Some(0),
            "test",
        )
        .unwrap();
        assert_eq!(s.load().unwrap().tasks.len(), 1);
        assert!(s
            .apply(Operation::DeleteTask { id: t.id.clone() }, Some(0), "test")
            .is_err());
        assert_eq!(s.load().unwrap().tasks.len(), 1);
        s.apply(Operation::ToggleTask { id: t.id }, Some(1), "test")
            .unwrap();
        assert_eq!(s.load().unwrap().tasks[0].status, "done");
    }
    #[test]
    fn invalid_dates_and_projects_do_not_change_data() {
        let (_dir, s) = store();
        let mut t = task();
        t.due_date = Some("2026-02-30".into());
        assert!(s
            .apply(
                Operation::SaveTask {
                    task: t.clone().into()
                },
                Some(0),
                "test"
            )
            .is_err());
        t.due_date = None;
        t.project_id = Some(Uuid::new_v4().to_string());
        assert!(s
            .apply(Operation::SaveTask { task: t.into() }, Some(0), "test")
            .is_err());
        assert_eq!(s.load().unwrap().revision, 0);
    }
    #[test]
    fn backup_round_trip_includes_attachments() {
        let (dir, s) = store();
        let t = task();
        let id = t.id.clone();
        s.apply(Operation::SaveTask { task: t.into() }, Some(0), "test")
            .unwrap();
        s.add_attachment(&id, "Notiz.txt".into(), "text/plain".into(), b"Hallo", 1)
            .unwrap();
        let backup = dir.path().join("test.klar");
        s.backup(&backup).unwrap();
        let (_dir2, target) = store();
        let restored = target.restore(&backup, 0).unwrap();
        let attachment = &restored.tasks[0].attachments[0];
        assert_eq!(
            fs::read(target.attachment_path(&attachment.id).unwrap()).unwrap(),
            b"Hallo"
        );
        assert_eq!(restored.settings.ai_access, "off");
        assert_eq!(target.read_attachment(&attachment.id).unwrap(), b"Hallo");
    }
    #[test]
    fn repeat_creates_one_next_occurrence() {
        let (_dir, s) = store();
        let mut t = task();
        t.repeat = "weekly".into();
        let id = t.id.clone();
        s.apply(Operation::SaveTask { task: t.into() }, Some(0), "test")
            .unwrap();
        let state = s
            .apply(Operation::ToggleTask { id }, Some(1), "test")
            .unwrap();
        assert_eq!(state.tasks.len(), 2);
        assert_eq!(state.tasks[0].status, "done");
        assert_eq!(state.tasks[1].status, "open");
        assert!(state.tasks[1].due_date.as_ref().unwrap() > &Local::now().date_naive().to_string());
    }
    #[test]
    fn attachment_paths_cannot_escape() {
        let (_dir, s) = store();
        assert!(s.attachment_path("../klar.db").is_err());
    }
    #[test]
    fn preview_cannot_read_unreferenced_files() {
        let (_dir, s) = store();
        let id = Uuid::new_v4().to_string();
        fs::write(s.root.join("attachments").join(&id), b"orphan").unwrap();
        assert!(s.read_attachment(&id).is_err());
        assert!(s.read_attachment("../klar.db").is_err());
    }
    #[test]
    fn completing_from_editor_creates_the_next_occurrence_once() {
        let (_dir, s) = store();
        let mut t = task();
        t.repeat = "daily".into();
        s.apply(
            Operation::SaveTask {
                task: t.clone().into(),
            },
            Some(0),
            "test",
        )
        .unwrap();
        t.status = "done".into();
        let next = s
            .apply(Operation::SaveTask { task: t.into() }, Some(1), "test")
            .unwrap();
        assert_eq!(next.tasks.len(), 2);
        let completed = next
            .tasks
            .iter()
            .find(|t| t.status == "done")
            .unwrap()
            .clone();
        let next = s
            .apply(
                Operation::SaveTask {
                    task: completed.into(),
                },
                Some(2),
                "test",
            )
            .unwrap();
        assert_eq!(next.tasks.len(), 2);
    }
    #[test]
    fn invalid_backup_does_not_replace_existing_data() {
        let (dir, s) = store();
        s.apply(
            Operation::SaveTask {
                task: task().into(),
            },
            Some(0),
            "test",
        )
        .unwrap();
        let bad = dir.path().join("bad.klar");
        fs::write(&bad, b"not a zip").unwrap();
        assert!(s.restore(&bad, 1).is_err());
        assert_eq!(s.load().unwrap().tasks.len(), 1);
        assert_eq!(s.load().unwrap().revision, 1);
    }
    #[test]
    fn conflicting_attachment_upload_does_not_leave_a_file() {
        let (_dir, s) = store();
        let t = task();
        let id = t.id.clone();
        s.apply(Operation::SaveTask { task: t.into() }, Some(0), "test")
            .unwrap();
        assert!(s
            .add_attachment(&id, "test.txt".into(), "text/plain".into(), b"test", 0)
            .is_err());
        assert_eq!(fs::read_dir(s.root.join("attachments")).unwrap().count(), 0);
    }
}
