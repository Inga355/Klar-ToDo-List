use crate::store::{self, Store};
use chrono::{DateTime, Utc};
use tauri::{Emitter, Manager};
use tauri_plugin_notification::NotificationExt;

pub fn show_main(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

#[tauri::command]
pub fn open_main(app: tauri::AppHandle) {
    show_main(&app);
}
#[tauri::command]
pub fn open_mini(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("mini") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}
#[tauri::command]
pub fn test_notification(app: tauri::AppHandle) -> store::Result<()> {
    app.notification()
        .builder()
        .title("Klar · Deine Erinnerung")
        .body("Alles bereit. Klar erinnert dich an deine Aufgaben.")
        .show()
        .map_err(|e| e.to_string())
}

pub fn setup(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    use tauri::{
        menu::{Menu, MenuItem},
        tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    };
    let store = app.state::<Store>();
    let state = store.load().map_err(std::io::Error::other)?;
    if let Some(w) = app.get_webview_window("mini") {
        w.set_always_on_top(state.settings.mini_pinned)?;
    }
    let main = MenuItem::with_id(app, "open", "Klar öffnen", true, None::<&str>)?;
    let mini = MenuItem::with_id(app, "mini", "Miniansicht öffnen", true, None::<&str>)?;
    let quit = MenuItem::with_id(
        app,
        "quit",
        "Klar beenden (Erinnerungen pausieren)",
        true,
        None::<&str>,
    )?;
    let menu = Menu::with_items(app, &[&main, &mini, &quit])?;
    TrayIconBuilder::new()
        .icon(app.default_window_icon().ok_or("App-Symbol fehlt")?.clone())
        .tooltip("Klar · Dein Aufgabenplaner")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => show_main(app),
            "mini" => open_mini(app.clone()),
            "quit" => app.exit(0),
            _ => (),
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main(tray.app_handle());
            }
        })
        .build(app)?;
    if std::env::args().any(|a| a == "--background") {
        if let Some(w) = app.get_webview_window("main") {
            w.hide()?;
        }
    }
    let handle = app.handle().clone();
    let background_store = store.inner().clone();
    std::thread::spawn(move || {
        let mut last_revision = u64::MAX;
        let mut last_backup = String::new();
        loop {
            if let Ok(s) = background_store.load() {
                if s.revision != last_revision {
                    let _ = handle.emit("state-changed", s.revision);
                    last_revision = s.revision;
                }
                let date = chrono::Local::now().date_naive().to_string();
                if last_backup != date && s.revision > 0 {
                    let path = background_store
                        .root
                        .join("backups")
                        .join(format!("automatisch-{date}.klar"));
                    if path.exists() || background_store.backup(&path).is_ok() {
                        last_backup = date;
                    }
                }
                for t in s
                    .tasks
                    .iter()
                    .filter(|t| t.status != "done" && t.reminded_at.is_none())
                {
                    if t.reminder_at
                        .as_ref()
                        .and_then(|v| DateTime::parse_from_rfc3339(v).ok())
                        .is_some_and(|v| v <= Utc::now())
                    {
                        // Claim transactionally before sending so another worker cannot duplicate it.
                        let claimed = background_store.change(
                            None,
                            "system",
                            "Erinnerung ausgelöst",
                            |current| {
                                let task = current
                                    .tasks
                                    .iter_mut()
                                    .find(|x| {
                                        x.id == t.id
                                            && x.status != "done"
                                            && x.reminded_at.is_none()
                                            && x.reminder_at == t.reminder_at
                                    })
                                    .ok_or("Erinnerung bereits bearbeitet")?;
                                task.reminded_at = Some(Utc::now().to_rfc3339());
                                Ok(())
                            },
                        );
                        if claimed.is_ok() {
                            if let Err(error) = handle
                                .notification()
                                .builder()
                                .title("Klar · Zeit für deinen nächsten Schritt")
                                .body(&t.title)
                                .show()
                            {
                                eprintln!("Benachrichtigung fehlgeschlagen: {error}");
                                // Retry later rather than silently consuming an undelivered reminder.
                                let _ = background_store.change(
                                    None,
                                    "system",
                                    "Erinnerung wird erneut versucht",
                                    |current| {
                                        if let Some(task) = current.tasks.iter_mut().find(|x| {
                                            x.id == t.id && x.reminder_at == t.reminder_at
                                        }) {
                                            task.reminded_at = None;
                                        }
                                        Ok(())
                                    },
                                );
                            }
                            let _ = handle.emit("state-changed", ());
                        }
                    }
                }
            }
            std::thread::sleep(std::time::Duration::from_secs(15));
        }
    });
    Ok(())
}
