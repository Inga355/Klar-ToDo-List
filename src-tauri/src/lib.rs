mod desktop;
pub mod mcp;
pub mod store;
use base64::Engine;
use store::{AppState, Operation, Store};
use tauri::{Emitter, Manager};

#[tauri::command]
fn load_state(store: tauri::State<Store>) -> store::Result<AppState> {
    store.load()
}
#[tauri::command]
fn mutate(
    app: tauri::AppHandle,
    store: tauri::State<Store>,
    operation: Operation,
    expected_revision: u64,
) -> store::Result<AppState> {
    let state = store.apply(operation, Some(expected_revision), "app")?;
    if let Some(window) = app.get_webview_window("mini") {
        let _ = window.set_always_on_top(state.settings.mini_pinned);
    }
    let _ = app.emit("state-changed", state.revision);
    Ok(state)
}

#[tauri::command]
fn attach_file(
    app: tauri::AppHandle,
    store: tauri::State<Store>,
    task_id: String,
    name: String,
    mime: String,
    content: String,
    expected_revision: u64,
) -> store::Result<AppState> {
    if content.len() > 28 * 1024 * 1024 {
        return Err("Datei ist zu groß".into());
    }
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(content)
        .map_err(|e| e.to_string())?;
    let state = store.add_attachment(&task_id, name, mime, &bytes, expected_revision)?;
    let _ = app.emit("state-changed", state.revision);
    Ok(state)
}
#[tauri::command]
fn attachment_path(store: tauri::State<Store>, id: String) -> store::Result<String> {
    Ok(store.attachment_path(&id)?.to_string_lossy().into())
}
fn export_destination(store: &Store, path: &str) -> store::Result<std::path::PathBuf> {
    let path = std::path::PathBuf::from(path);
    let parent = path
        .parent()
        .ok_or("Zielordner fehlt")?
        .canonicalize()
        .map_err(|e| e.to_string())?;
    let root = store.root.canonicalize().map_err(|e| e.to_string())?;
    if parent.starts_with(root) {
        return Err("Bitte außerhalb des internen Klar-Datenordners speichern".into());
    }
    Ok(path)
}
#[tauri::command]
fn save_attachment(store: tauri::State<Store>, id: String, path: String) -> store::Result<()> {
    let destination = export_destination(&store, &path)?;
    std::fs::copy(store.attachment_path(&id)?, destination).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn export_backup(store: tauri::State<Store>, path: String) -> store::Result<()> {
    let destination = export_destination(&store, &path)?;
    store.backup(&destination)
}
#[tauri::command]
fn import_backup(
    app: tauri::AppHandle,
    store: tauri::State<Store>,
    path: String,
    expected_revision: u64,
) -> store::Result<AppState> {
    let state = store.restore(std::path::Path::new(&path), expected_revision)?;
    let _ = app.emit("state-changed", state.revision);
    Ok(state)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            desktop::show_main(app)
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .args(["--background"])
                .build(),
        )
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(
                    tauri_plugin_window_state::StateFlags::POSITION
                        | tauri_plugin_window_state::StateFlags::SIZE,
                )
                .build(),
        )
        .setup(|app| {
            app.manage(Store::new(store::app_root()?).map_err(std::io::Error::other)?);
            desktop::setup(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "mini" {
                    api.prevent_close();
                    let _ = window.hide();
                } else {
                    let keep_running = window
                        .state::<Store>()
                        .load()
                        .map(|s| s.settings.close_to_tray)
                        .unwrap_or(true);
                    if keep_running {
                        api.prevent_close();
                        let _ = window.hide();
                    } else {
                        window.app_handle().exit(0);
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            load_state,
            mutate,
            attach_file,
            attachment_path,
            save_attachment,
            export_backup,
            import_backup,
            desktop::open_main,
            desktop::open_mini,
            desktop::test_notification
        ])
        .run(tauri::generate_context!())
        .expect("Klar konnte nicht gestartet werden");
}
