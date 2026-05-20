use super::CompressResult;
use image::{imageops::FilterType, DynamicImage, ImageFormat};
use std::io::Cursor;
use std::path::Path;

#[tauri::command]
pub async fn compress_image(
    path: String,
    quality: u8,
    output_path: String,
) -> Result<CompressResult, String> {
    let original_size = std::fs::metadata(&path)
        .map_err(|e| format!("Cannot read '{}': {}", path, e))?
        .len();

    let ext = Path::new(&path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let working_path = if ext == "heic" {
        convert_heic_to_jpeg(&path).await?
    } else {
        path.clone()
    };

    // Ensure output directory exists
    if let Some(parent) = Path::new(&output_path).parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Cannot create output dir '{}': {}", parent.display(), e))?;
    }

    let img = image::open(&working_path)
        .map_err(|e| format!("Cannot open image '{}': {}", working_path, e))?;

    match ext.as_str() {
        "jpg" | "jpeg" | "heic" => compress_jpeg(img, quality, &output_path)?,
        "png" => compress_png(&working_path, quality, &output_path)?,
        "webp" => compress_webp(img, quality, &output_path)?,
        "tiff" | "tif" => compress_tiff(img, &output_path)?,
        _ => return Err(format!("Unsupported format: {ext}")),
    }

    if ext == "heic" && working_path != path {
        let _ = std::fs::remove_file(&working_path);
    }

    let compressed_size = std::fs::metadata(&output_path)
        .map_err(|e| format!("Cannot stat output '{}': {}", output_path, e))?
        .len();

    Ok(CompressResult {
        output_path,
        original_size,
        compressed_size,
    })
}

fn compress_jpeg(img: DynamicImage, quality: u8, output_path: &str) -> Result<(), String> {
    let rgb = img.to_rgb8();
    let (width, height) = (rgb.width() as usize, rgb.height() as usize);
    let pixels = rgb.into_raw();

    let mut comp = mozjpeg::Compress::new(mozjpeg::ColorSpace::JCS_RGB);
    comp.set_size(width, height);
    comp.set_quality(quality as f32);

    let mut started = comp
        .start_compress(Vec::new())
        .map_err(|e| e.to_string())?;
    started
        .write_scanlines(&pixels)
        .map_err(|e| e.to_string())?;
    let data = started.finish().map_err(|e| e.to_string())?;

    std::fs::write(output_path, data)
        .map_err(|e| format!("Cannot write '{}': {}", output_path, e))?;
    Ok(())
}

fn compress_png(input_path: &str, quality: u8, output_path: &str) -> Result<(), String> {
    std::fs::copy(input_path, output_path)
        .map_err(|e| format!("Cannot copy to '{}': {}", output_path, e))?;

    let preset = if quality >= 70 { 2u8 } else if quality >= 40 { 4 } else { 6 };
    let opts = oxipng::Options::from_preset(preset);

    oxipng::optimize(
        &oxipng::InFile::Path(output_path.into()),
        &oxipng::OutFile::Path {
            path: Some(output_path.into()),
            preserve_attrs: false,
        },
        &opts,
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn compress_webp(img: DynamicImage, quality: u8, output_path: &str) -> Result<(), String> {
    let encode_img = if quality < 50 {
        let factor = 0.75_f32;
        let w = (img.width() as f32 * factor) as u32;
        let h = (img.height() as f32 * factor) as u32;
        img.resize(w, h, FilterType::Lanczos3)
    } else {
        img
    };

    let mut buf = Cursor::new(Vec::new());
    encode_img
        .write_to(&mut buf, ImageFormat::WebP)
        .map_err(|e| e.to_string())?;
    std::fs::write(output_path, buf.into_inner())
        .map_err(|e| format!("Cannot write '{}': {}", output_path, e))?;
    Ok(())
}

fn compress_tiff(img: DynamicImage, output_path: &str) -> Result<(), String> {
    let out = if output_path.ends_with(".tiff") {
        output_path.replace(".tiff", ".png")
    } else {
        output_path.replace(".tif", ".png")
    };
    img.save(&out)
        .map_err(|e| format!("Cannot save '{}': {}", out, e))?;
    if out != output_path {
        std::fs::rename(&out, output_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(target_os = "macos")]
async fn convert_heic_to_jpeg(path: &str) -> Result<String, String> {
    let tmp = format!("{path}.tmp.jpg");
    let output = tokio::process::Command::new("sips")
        .args(["-s", "format", "jpeg", path, "--out", &tmp])
        .output()
        .await
        .map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(tmp)
}

#[cfg(not(target_os = "macos"))]
async fn convert_heic_to_jpeg(_path: &str) -> Result<String, String> {
    Err("HEIC is only supported on macOS".to_string())
}
