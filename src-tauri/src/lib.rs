pub mod store;
use store::{AppState, Operation, Store};
use tauri::{Emitter, Manager};

#[tauri::command]
fn load_state(store: tauri::State<Store>) -> store::Result<AppState> { store.load() }
#[tauri::command]
fn mutate(app: tauri::AppHandle, store: tauri::State<Store>, operation: Operation, expected_revision: u64) -> store::Result<AppState> {
    let state = store.apply(operation, Some(expected_revision), "app")?;
    let _ = app.emit("state-changed", state.revision); Ok(state)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            app.manage(Store::new(store::app_root()?).map_err(std::io::Error::other)?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![load_state, mutate])
        .run(tauri::generate_context!())
        .expect("Klar konnte nicht gestartet werden");
}
