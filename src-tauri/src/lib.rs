mod compress;
mod thumbnail;

use compress::{images::compress_image, pdf::compress_pdf};
use thumbnail::get_thumbnail;

#[tauri::command]
async fn get_file_info(path: String) -> Result<serde_json::Value, String> {
    let meta = std::fs::metadata(&path).map_err(|e| e.to_string())?;
    let ext = std::path::Path::new(&path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    let file_type = match ext.as_str() {
        "pdf" => "pdf",
        _ => "image",
    };
    Ok(serde_json::json!({
        "size": meta.len(),
        "type": file_type,
        "name": std::path::Path::new(&path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown"),
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            compress_image,
            compress_pdf,
            get_thumbnail,
            get_file_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
