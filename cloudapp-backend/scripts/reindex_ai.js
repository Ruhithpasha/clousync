const { supabaseAdmin } = require("../src/config/supabase");
const { generateCLIPImageEmbedding } = require("../src/utils/aiUtils");
const path = require("path");

async function reindex() {
  console.log("🚀 Starting AI Re-indexing...");

  try {
    // 1. Fetch all images that don't have embeddings
    const { data: images, error } = await supabaseAdmin
      .from("images")
      .select("id, cloudinary_url, original_name")
      .is("embedding", null);

    if (error) throw error;

    console.log(`📂 Found ${images.length} images to re-index.`);

    if (images.length === 0) {
      console.log("✅ All images are already indexed. Nothing to do!");
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      console.log(
        `\n[${i + 1}/${images.length}] Processing: ${img.original_name}`,
      );

      try {
        // Generate embedding using the Cloudinary URL directly
        // Transformers RawImage.read() supports URLs!
        const embedding = await generateCLIPImageEmbedding(img.cloudinary_url);

        if (embedding) {
          const { error: updateError } = await supabaseAdmin
            .from("images")
            .update({ embedding })
            .eq("id", img.id);

          if (updateError) throw updateError;

          console.log(`✅ Successfully indexed: ${img.original_name}`);
          successCount++;
        } else {
          console.error(
            `❌ Failed to generate embedding for: ${img.original_name}`,
          );
          failCount++;
        }
      } catch (innerErr) {
        console.error(
          `❌ Error processing ${img.original_name}:`,
          innerErr.message,
        );
        failCount++;
      }
    }

    console.log("\n--- 🏁 Re-indexing Result ---");
    console.log(`✅ Successfully indexed: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log("----------------------------\n");
  } catch (err) {
    console.error("FATAL ERROR during re-indexing:", err);
  } finally {
    process.exit();
  }
}

reindex();
