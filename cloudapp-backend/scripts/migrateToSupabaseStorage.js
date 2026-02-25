/**
 * migrateToSupabaseStorage.js
 *
 * One-time migration script: backs up ALL existing Cloudinary images
 * into the Supabase Storage `image-backups` bucket.
 *
 * For each image in the DB that has no `backup_path`:
 *   1. Download the image from its Cloudinary URL
 *   2. Upload to Supabase Storage at: {user_id}/{public_id}
 *   3. Save the backup_path back into the `images` table
 *
 * Usage:
 *   cd cloudapp-backend
 *   node scripts/migrateToSupabaseStorage.js
 *
 * Safe to re-run: skips images that already have a backup_path.
 * Also skips images whose Cloudinary URL is broken (404/error).
 */

require("dotenv").config();
const { supabaseAdmin } = require("../src/config/supabase");

const BACKUP_BUCKET = "image-backups";
const CONCURRENCY = 3; // Download/upload N images at a time
const DELAY_MS = 300; // Delay between batches to avoid rate limits

// ─── Helpers ────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Guess mime type from Cloudinary URL */
function guessMimeType(url) {
  const ext = url.split("?")[0].split(".").pop().toLowerCase();
  const map = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    bmp: "image/bmp",
    tiff: "image/tiff",
    tif: "image/tiff",
  };
  return map[ext] || "image/jpeg";
}

/** Download an image from a URL and return a Buffer */
async function downloadImage(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "CloudSync-Backup-Migration/1.0" },
    signal: AbortSignal.timeout(30_000), // 30s timeout
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} fetching ${url}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/** Upload a buffer to Supabase Storage, return the storage path */
async function uploadToSupabase(buffer, storagePath, mimeType) {
  const { error } = await supabaseAdmin.storage
    .from(BACKUP_BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: true, // overwrite if it already exists
    });

  if (error) throw error;
  return storagePath;
}

/** Mark the image record with its backup_path */
async function saveBackupPath(imageId, backupPath) {
  const { error } = await supabaseAdmin
    .from("images")
    .update({ backup_path: backupPath })
    .eq("id", imageId);

  if (error) throw error;
}

/** Ensure the image-backups bucket exists */
async function ensureBucketExists() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((b) => b.id === BACKUP_BUCKET);

  if (!exists) {
    console.log(`📦 Creating bucket "${BACKUP_BUCKET}"...`);
    const { error } = await supabaseAdmin.storage.createBucket(BACKUP_BUCKET, {
      public: false,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/bmp",
        "image/tiff",
      ],
    });
    if (error && !error.message.includes("already exists")) throw error;
    console.log(`✅ Bucket "${BACKUP_BUCKET}" created.\n`);
  } else {
    console.log(`✅ Bucket "${BACKUP_BUCKET}" already exists.\n`);
  }
}

// ─── Process a single image ──────────────────────────────────────────────────

async function processImage(img, index, total) {
  const label = `[${index}/${total}] ${img.original_name} (${img.id.slice(0, 8)}...)`;

  try {
    const storagePath = `${img.user_id}/${img.public_id}`;
    const mimeType = guessMimeType(img.cloudinary_url);

    process.stdout.write(`  ⬇  Downloading  ${label}...`);
    const buffer = await downloadImage(img.cloudinary_url);
    process.stdout.write(` ${(buffer.length / 1024).toFixed(1)}KB\n`);

    process.stdout.write(`  ⬆  Uploading to Supabase Storage...`);
    await uploadToSupabase(buffer, storagePath, mimeType);
    process.stdout.write(` ✅\n`);

    await saveBackupPath(img.id, storagePath);
    console.log(`  💾 DB updated: backup_path = ${storagePath}\n`);

    return { status: "success", id: img.id, name: img.original_name };
  } catch (err) {
    console.error(`\n  ❌ Failed: ${label}\n     ${err.message}\n`);
    return {
      status: "failed",
      id: img.id,
      name: img.original_name,
      error: err.message,
    };
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function migrate() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   CloudSync → Supabase Storage Migration Tool   ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // 1. Ensure bucket exists
  await ensureBucketExists();

  // 2. Fetch ALL images without a backup_path
  console.log("🔍 Fetching images without a Supabase Storage backup...");
  const { data: images, error: fetchError } = await supabaseAdmin
    .from("images")
    .select(
      "id, user_id, public_id, original_name, cloudinary_url, backup_path",
    )
    .is("backup_path", null) // Only images with no backup yet
    .not("cloudinary_url", "is", null) // Must have a Cloudinary URL
    .not("public_id", "is", null) // Must have a public_id
    .order("created_at", { ascending: true }); // Oldest first

  if (fetchError) {
    console.error("❌ Failed to fetch images:", fetchError.message);
    process.exit(1);
  }

  const total = images.length;
  if (total === 0) {
    console.log("✅ All images already have backups. Nothing to migrate!\n");
    process.exit(0);
  }

  console.log(`📂 Found ${total} image(s) to back up.\n`);
  console.log("─".repeat(54));

  // 3. Process in batches
  const results = [];
  for (let i = 0; i < total; i += CONCURRENCY) {
    const batch = images.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((img, j) => processImage(img, i + j + 1, total)),
    );
    results.push(...batchResults);

    // Small delay between batches to be nice to Cloudinary's CDN
    if (i + CONCURRENCY < total) await sleep(DELAY_MS);
  }

  // 4. Summary
  const succeeded = results.filter((r) => r.status === "success");
  const failed = results.filter((r) => r.status === "failed");

  console.log("─".repeat(54));
  console.log("\n📊 Migration Summary:");
  console.log(`   ✅  Backed up successfully : ${succeeded.length}`);
  console.log(`   ❌  Failed                 : ${failed.length}`);
  console.log(`   📦  Total processed        : ${results.length}`);

  if (failed.length > 0) {
    console.log("\n⚠️  Failed images:");
    failed.forEach((f) => console.log(`   • ${f.name} — ${f.error}`));
    console.log(
      "\n   Tip: Failed images may have been deleted from Cloudinary already.\n" +
        "   They still appear in the DB but their URL is broken.\n",
    );
  }

  console.log("\n✅ Migration complete!\n");
  process.exit(failed.length > 0 ? 1 : 0);
}

migrate().catch((err) => {
  console.error("\n💥 Unexpected fatal error:", err);
  process.exit(1);
});
