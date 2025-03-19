use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    println!("Testing embedding generation with a sample text...");

    // Import the get_embedding function directly
    let sample_text = "This is a test email to verify embedding generation works correctly.";
    let embedding = assist_embeddings::embedding::get_embedding(sample_text)?;

    println!(
        "Successfully generated embedding with {} dimensions",
        embedding.len()
    );

    // Print first few values of the embedding
    let preview: Vec<f32> = embedding.iter().take(5).cloned().collect();
    println!("First few values: {:?}", preview);

    Ok(())
}
