use tauri_plugin_updater::UpdaterExt;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_shell::init())
    .on_page_load(|window, _payload| {
      let _ = window.eval(r#"
        window.open = function(url, target, features) {
          if (window.__TAURI_INTERNALS__) {
            window.__TAURI_INTERNALS__.invoke('plugin:shell|open', { path: url });
          }
          return null;
        };
      "#);
    })
    .setup(|app| {
      let handle = app.handle().clone();

      // Auto-updater: checa actualizaciones al iniciar la app
      tauri::async_runtime::spawn(async move {
        match handle.updater() {
          Ok(updater) => {
            match updater.check().await {
              Ok(Some(update)) => {
                let version = update.version.clone();
                let body = update.body.clone().unwrap_or_default();

                let msg = format!(
                  "La versión {} está disponible.\n{}\n\n¿Deseas actualizar ahora?",
                  version, body
                );

                // Diálogo nativo del SO con botones Ok/Cancelar
                let accepted = handle
                  .dialog()
                  .message(msg)
                  .title("Actualización Disponible")
                  .buttons(MessageDialogButtons::OkCancel)
                  .kind(MessageDialogKind::Info)
                  .blocking_show();

                if accepted {
                  log::info!("Usuario aceptó. Descargando v{}...", version);

                  match update.download_and_install(|_, _| {}, || {}).await {
                    Ok(_) => {
                      log::info!("Actualización instalada. Reiniciando...");
                      handle.restart();
                    }
                    Err(e) => {
                      log::error!("Error instalando actualización: {}", e);
                      handle
                        .dialog()
                        .message(format!("No se pudo instalar la actualización:\n{}", e))
                        .title("Error")
                        .kind(MessageDialogKind::Error)
                        .blocking_show();
                    }
                  }
                } else {
                  log::info!("Usuario pospuso la actualización.");
                }
              }
              Ok(None) => log::info!("No hay actualizaciones disponibles."),
              Err(e) => log::error!("Error buscando actualizaciones: {}", e),
            }
          }
          Err(e) => log::error!("Updater no configurado: {}", e),
        }
      });

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
