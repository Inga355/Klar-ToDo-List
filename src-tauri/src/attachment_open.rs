//! Open a bounded, read-only document copy. Never pass user text to a shell.
use crate::store::{Result, Store};
use std::path::PathBuf;

fn document_name(name: &str) -> Result<String> {
    let extension = std::path::Path::new(name)
        .extension()
        .and_then(|v| v.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    if ![
        "png", "jpg", "jpeg", "gif", "webp", "bmp", "tif", "tiff", "heic", "pdf", "txt", "md",
        "csv", "docx", "xlsx", "pptx", "odt", "ods", "odp", "mp3", "wav", "ogg", "mp4", "webm",
        "mov",
    ]
    .contains(&extension.as_str())
    {
        return Err("Dieses Dateiformat wird aus Sicherheitsgründen nicht direkt geöffnet. Du kannst es weiterhin speichern.".into());
    }
    let stem = std::path::Path::new(name)
        .file_stem()
        .and_then(|v| v.to_str())
        .unwrap_or("Dokument");
    let safe: String = stem
        .chars()
        .take(100)
        .map(|c| {
            if c.is_control() || "<>:\"/\\|?*".contains(c) {
                '_'
            } else {
                c
            }
        })
        .collect();
    Ok(format!("Klar-{safe}.{extension}"))
}

pub fn prepare(store: &Store, id: &str) -> Result<PathBuf> {
    let state = store.load()?;
    let attachment = state
        .tasks
        .iter()
        .flat_map(|t| &t.attachments)
        .find(|a| a.id == id)
        .ok_or("Anhang ist keiner Aufgabe zugeordnet")?;
    let name = document_name(&attachment.name)?;
    let bytes = store.read_attachment(id)?;
    let folder = store.root.join("opened").join(id);
    std::fs::create_dir_all(&folder).map_err(|e| e.to_string())?;
    let path = folder.join(name);
    if !path.exists() {
        std::fs::write(&path, bytes).map_err(|e| e.to_string())?;
        let mut permissions = std::fs::metadata(&path)
            .map_err(|e| e.to_string())?
            .permissions();
        permissions.set_readonly(true);
        std::fs::set_permissions(&path, permissions).map_err(|e| e.to_string())?;
    }
    Ok(path)
}

#[tauri::command]
pub fn open_attachment(store: tauri::State<Store>, id: String) -> Result<()> {
    let path = prepare(&store, &id)?;
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::ffi::OsStrExt;
        use windows_sys::Win32::UI::{Shell::ShellExecuteW, WindowsAndMessaging::SW_SHOWNORMAL};
        let file: Vec<u16> = path.as_os_str().encode_wide().chain(Some(0)).collect();
        let verb: Vec<u16> = "open".encode_utf16().chain(Some(0)).collect();
        // SAFETY: null-terminated UTF-16 buffers outlive this synchronous call.
        // Only a verified document path is passed; no command line or URL.
        let result = unsafe {
            ShellExecuteW(
                std::ptr::null_mut(),
                verb.as_ptr(),
                file.as_ptr(),
                std::ptr::null(),
                std::ptr::null(),
                SW_SHOWNORMAL,
            )
        };
        if result as isize <= 32 {
            return Err("Windows konnte die Datei nicht öffnen. Bitte eine passende Standard-App installieren oder die Datei speichern.".into());
        }
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = path;
        Err("Direktes Öffnen ist derzeit unter Windows verfügbar.".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn documents_only_and_no_path_injection() {
        assert!(document_name("rechnung.pdf.exe").is_err());
        for name in [
            "script.ps1",
            "start.cmd",
            "link.url",
            "bild.svg",
            "seite.html",
            "makro.xlsm",
        ] {
            assert!(document_name(name).is_err());
        }
        assert_eq!(document_name("../../test.JPG").unwrap(), "Klar-test.jpg");
        assert!(!document_name("a\\b:bild.png").unwrap().contains('\\'));
    }
    #[test]
    fn opens_a_read_only_copy_and_rejects_unreferenced_files() {
        let dir = tempfile::tempdir().unwrap();
        let store = Store::new(dir.path().into()).unwrap();
        let task: crate::store::Task = serde_json::from_value(serde_json::json!({
            "id": uuid::Uuid::new_v4().to_string(), "title":"Dokument prüfen", "projectId":null,
            "priority":"normal", "status":"open", "dueDate":null, "plannedAt":null,
            "reminderAt":null, "remindedAt":null, "repeat":"none", "notes":"", "subtasks":[],
            "attachments":[], "focus":false, "createdAt":chrono::Utc::now().to_rfc3339(),
            "updatedAt":chrono::Utc::now().to_rfc3339(), "completedAt":null
        }))
        .unwrap();
        let id = task.id.clone();
        store
            .apply(
                crate::store::Operation::SaveTask {
                    task: Box::new(task),
                },
                Some(0),
                "test",
            )
            .unwrap();
        let state = store
            .add_attachment(&id, "Notiz.txt".into(), "text/plain".into(), b"Original", 1)
            .unwrap();
        let attachment = &state.tasks[0].attachments[0];
        let copy = prepare(&store, &attachment.id).unwrap();
        assert_eq!(std::fs::read(&copy).unwrap(), b"Original");
        assert!(std::fs::metadata(&copy).unwrap().permissions().readonly());
        assert_ne!(copy, store.attachment_path(&attachment.id).unwrap());
        assert!(prepare(&store, &uuid::Uuid::new_v4().to_string()).is_err());
        // TempDir must be able to remove the Windows read-only test copy.
        let mut permissions = std::fs::metadata(&copy).unwrap().permissions();
        #[allow(clippy::permissions_set_readonly_false)]
        permissions.set_readonly(false);
        std::fs::set_permissions(copy, permissions).unwrap();
    }
}
