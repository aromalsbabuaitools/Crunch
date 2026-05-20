use super::CompressResult;
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

fn quality_to_gs_setting(quality: u8) -> &'static str {
    if quality >= 70 {
        "/printer"
    } else if quality >= 40 {
        "/ebook"
    } else {
        "/screen"
    }
}

#[tauri::command]
pub async fn compress_pdf(
    app: AppHandle,
    path: String,
    quality: u8,
    output_path: String,
) -> Result<CompressResult, String> {
    let original_size = std::fs::metadata(&path)
        .map_err(|e| e.to_string())?
        .len();

    let pdf_setting = quality_to_gs_setting(quality);

    let output = app
        .shell()
        .sidecar("gs")
        .map_err(|e| e.to_string())?
        .args([
            "-dBATCH",
            "-dNOPAUSE",
            "-dQUIET",
            "-sDEVICE=pdfwrite",
            "-dCompatibilityLevel=1.4",
            &format!("-dPDFSETTINGS={pdf_setting}"),
            &format!("-sOutputFile={output_path}"),
            &path,
        ])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let compressed_size = std::fs::metadata(&output_path)
        .map_err(|e| e.to_string())?
        .len();

    Ok(CompressResult {
        output_path,
        original_size,
        compressed_size,
    })
}
