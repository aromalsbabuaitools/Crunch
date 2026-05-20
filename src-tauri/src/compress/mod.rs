pub mod images;
pub mod pdf;

use serde::Serialize;

#[derive(Serialize)]
pub struct CompressResult {
    pub output_path: String,
    pub original_size: u64,
    pub compressed_size: u64,
}
