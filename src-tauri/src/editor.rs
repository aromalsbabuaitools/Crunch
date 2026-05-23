use std::path::Path;

#[tauri::command]
pub async fn write_bytes(path: String, data: Vec<u8>) -> Result<u64, String> {
    if let Some(parent) = Path::new(&path).parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Cannot create dir '{}': {}", parent.display(), e))?;
    }
    std::fs::write(&path, &data)
        .map_err(|e| format!("Cannot write '{}': {}", path, e))?;
    Ok(data.len() as u64)
}
