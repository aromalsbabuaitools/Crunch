use base64::Engine;
use image::{DynamicImage, ImageFormat};
use std::io::Cursor;

const THUMB_SIZE: u32 = 200;

#[tauri::command]
pub async fn get_thumbnail(path: String) -> Result<String, String> {
    let ext = std::path::Path::new(&path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let img = match ext.as_str() {
        "pdf" => generate_pdf_thumbnail(&path)?,
        _ => {
            image::open(&path).map_err(|e| e.to_string())?
        }
    };

    let thumb = img.thumbnail(THUMB_SIZE, THUMB_SIZE);
    let mut buf = Cursor::new(Vec::new());
    thumb
        .write_to(&mut buf, ImageFormat::WebP)
        .map_err(|e| e.to_string())?;

    let encoded = base64::engine::general_purpose::STANDARD.encode(buf.into_inner());
    Ok(format!("data:image/webp;base64,{encoded}"))
}

fn generate_pdf_thumbnail(path: &str) -> Result<DynamicImage, String> {
    // Return a placeholder gradient image for PDFs (Ghostscript rendering is async/complex)
    // A proper PDF rasterizer would be integrated here (e.g., pdfium-render)
    let mut img = image::RgbaImage::new(200, 260);
    for (x, y, pixel) in img.enumerate_pixels_mut() {
        let r = (176u8).saturating_add((x as f32 / 200.0 * 40.0) as u8);
        let g = 50u8;
        let b = (255u8).saturating_sub((y as f32 / 260.0 * 80.0) as u8);
        *pixel = image::Rgba([r, g, b, 255]);
    }

    // Draw a simple "PDF" indicator — white rectangle
    for y in 80..180 {
        for x in 40..160 {
            img.put_pixel(x, y, image::Rgba([255, 255, 255, 30]));
        }
    }

    let _ = path; // used in future when PDF rasterizer is available
    Ok(DynamicImage::ImageRgba8(img))
}
