use anyhow::Result;
use serde_json::json;

// This example demonstrates how a client would use the get_embedding command
// It doesn't actually call Tauri directly but shows the expected format
// of the input and output

#[tokio::main]
async fn main() -> Result<()> {
    println!("Testing get_embedding command with a sample text...");

    // Sample text to embed
    let sample_text = "This is a test email to verify embedding generation works correctly.";

    // Call get_embedding - this would normally be done through Tauri's invoke
    let embedding = assist_embeddings::embedding::get_embedding(sample_text)?;

    // Display the embedding dimensions
    println!(
        "Successfully generated embedding with {} dimensions",
        embedding.len()
    );

    // Print first few values of the embedding
    let preview: Vec<f32> = embedding.iter().take(5).cloned().collect();
    println!("First few values: {:?}", preview);

    // Show how to construct a vector search query with this embedding
    let mut embedding_json = "[".to_string();
    for (i, val) in embedding.iter().enumerate() {
        if i > 0 {
            embedding_json.push_str(", ");
        }
        embedding_json.push_str(&val.to_string());
    }
    embedding_json.push_str("]");

    println!("\nExample SQL query using this embedding:");
    println!("SELECT e.subject, e.text_body, e.date, e.from, v.distance");
    println!(
        "FROM vector_top_k('embeddings_embedding', vector32({}), 5) as v",
        embedding_json
    );
    println!("JOIN embeddings emb ON emb.rowid = v.rowid");
    println!("JOIN email_messages e ON e.id = emb.email_message_id");
    println!("ORDER BY v.distance;");

    Ok(())
}
