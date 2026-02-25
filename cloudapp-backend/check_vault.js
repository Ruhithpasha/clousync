const { supabaseAdmin } = require("./src/config/supabase");
require("dotenv").config();

async function checkEmbeddings() {
  try {
    const { data: images, error } = await supabaseAdmin
      .from("images")
      .select("id, original_name, embedding, tags");

    if (error) throw error;

    console.log(`Total images in DB: ${images.length}`);

    const countWithEmbeddings = images.filter(
      (img) => img.embedding !== null,
    ).length;
    console.log(`Images with embeddings: ${countWithEmbeddings}`);

    if (countWithEmbeddings > 0) {
      const sample = images.find((img) => img.embedding !== null);
      console.log(`Sample image: ${sample.original_name}`);
      // Embeddings are usually stored as strings in Supabase if not using pgvector extension properly,
      // or as arrays if using the library.
      console.log(`Embedding type: ${typeof sample.embedding}`);
      if (typeof sample.embedding === "string") {
        try {
          const parsed = JSON.parse(sample.embedding);
          console.log(`Parsed length: ${parsed.length}`);
        } catch (e) {
          console.log(
            `Embedding starts with: ${sample.embedding.substring(0, 50)}...`,
          );
        }
      } else if (Array.isArray(sample.embedding)) {
        console.log(`Array length: ${sample.embedding.length}`);
      }
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

checkEmbeddings();
