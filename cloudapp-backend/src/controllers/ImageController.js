const fs = require("fs");
const ImageRepository = require("../repositories/ImageRepository");
const { uploadImage, deleteImage } = require("../utils/cloudinaryUtils");
const cloudinary = require("../config/cloudinary");
const { supabaseAdmin } = require("../config/supabase");
const {
  generateImageTags,
  generateEmbedding,
  classifyImageWithCLIP,
  generateCLIPImageEmbedding,
  generateCLIPTextEmbedding,
} = require("../utils/aiUtils");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "cloudsync_secure_share_key_2024";

// Supabase Storage bucket used for free image backups
const BACKUP_BUCKET = "image-backups";

class ImageController {
  async upload(req, res) {
    try {
      const userId = req.user.id;
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // 1. Get user profile and current usage
      let profile = await require("../repositories/ProfileRepository").findById(
        userId,
      );

      // If profile doesn't exist (trigger failed or row deleted), create a default one
      if (!profile) {
        profile = await require("../repositories/ProfileRepository").updatePlan(
          userId,
          "FREE",
          104857600,
        );
      }

      const currentUsage = await ImageRepository.getTotalUsedStorage(userId);
      const limit = profile?.storage_limit || 104857600; // Default 100MB
      const newFileSize = req.file.size;

      if (currentUsage + newFileSize > limit) {
        // Cleanup local file if it exists
        if (req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(403).json({
          error: "Storage limit reached",
          message: `You have used ${(currentUsage / (1024 * 1024)).toFixed(2)}MB of your ${(limit / (1024 * 1024)).toFixed(2)}MB limit. Please upgrade.`,
        });
      }

      // 2. Upload to Cloudinary
      const cloudinaryResult = await uploadImage(
        req.file.path,
        req.file.originalname,
      );

      // --- AI FEATURES ---
      let tags = [];
      let embedding = null;

      console.log(`[AI-DEBUG] Starting CLIP AI Analysis for user: ${userId}`);

      // --- CLIP CLASSIFICATION (Categorization) ---
      try {
        const category = await classifyImageWithCLIP(req.file.path);
        if (category && category !== "Other") {
          tags = [category.toUpperCase()];
        }
      } catch (clipErr) {
        console.error(
          `[AI-DEBUG] CLIP categorization failed:`,
          clipErr.message,
        );
      }

      // --- CLIP EMBEDDING (Semantic Search Engine) ---
      try {
        console.log(`[AI-DEBUG] Generating CLIP Semantic Embedding...`);
        embedding = await generateCLIPImageEmbedding(req.file.path);
        if (embedding) {
          console.log(
            `[AI-DEBUG] Embedding generated (Dim: ${embedding.length})`,
          );
        }
      } catch (embErr) {
        console.error(`[AI-DEBUG] Semantic embedding failed:`, embErr.message);
      }

      // 3. Save to DB
      const { albumId } = req.body;
      const imageData = {
        user_id: userId,
        album_id: albumId || null,
        original_name: req.file.originalname,
        storage_path: req.file.filename,
        cloudinary_url: cloudinaryResult.secure_url,
        public_id: cloudinaryResult.public_id,
        file_size: newFileSize,
        tags: tags,
        embedding: embedding,
      };

      const dbData = await ImageRepository.create(imageData);

      // --- SUPABASE STORAGE BACKUP (free, no Cloudinary paid plan needed) ---
      // The local file still exists at this point — we save it to Supabase Storage
      // so we can restore it later if Cloudinary loses the image.
      let backupPath = null;
      try {
        if (fs.existsSync(req.file.path)) {
          const fileBuffer = fs.readFileSync(req.file.path);
          backupPath = `${userId}/${cloudinaryResult.public_id}`;

          const { error: storageErr } = await supabaseAdmin.storage
            .from(BACKUP_BUCKET)
            .upload(backupPath, fileBuffer, {
              contentType: req.file.mimetype,
              upsert: true,
            });

          if (storageErr) {
            // Non-fatal — log and continue. Image still uploaded to Cloudinary.
            console.warn(
              `[BACKUP] Supabase Storage backup failed (non-fatal): ${storageErr.message}`,
            );
            backupPath = null;
          } else {
            console.log(
              `[BACKUP] Backup saved to Supabase Storage: ${backupPath}`,
            );
            // Patch backup_path into the DB record
            await supabaseAdmin
              .from("images")
              .update({ backup_path: backupPath })
              .eq("id", dbData.id);
          }
        }
      } catch (backupErr) {
        // Non-fatal — never block the upload response because of a backup failure
        console.warn(`[BACKUP] Backup error (non-fatal):`, backupErr.message);
      }

      // Cleanup local file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(201).json({
        ...dbData,
        backup_path: backupPath,
        status: "available",
      });
    } catch (error) {
      console.error("ImageController Upload Error:", error);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: "Upload failed", message: error.message });
    }
  }

  async search(req, res) {
    try {
      const userId = req.user.id;
      const { q, query } = req.query;
      const searchTerm = q || query;

      if (!searchTerm) {
        return res.status(400).json({ error: "Search query is required" });
      }

      console.log(
        `[SEARCH] AI Neural Search for: "${searchTerm}" for user: ${userId}`,
      );

      // 1. Convert text query to CLIP vector
      const queryEmbedding = await generateCLIPTextEmbedding(searchTerm);

      if (!queryEmbedding) {
        // Fallback to basic text search if AI fails
        console.warn(
          `[SEARCH] AI Embedding failed, falling back to basic search`,
        );
        const allImages = await ImageRepository.findAllByUserId(userId);
        const filtered = allImages.filter(
          (img) =>
            img.original_name
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            img.tags?.some((t) =>
              t.toLowerCase().includes(searchTerm.toLowerCase()),
            ),
        );
        return res.json(
          filtered.map((img) => ({ ...img, status: "available" })),
        );
      }

      // 2. Perform vector search in Supabase
      let results = await ImageRepository.searchByEmbedding(
        userId,
        queryEmbedding,
      );

      // 3. Smart Fallback: If AI finds nothing, try basic keyword match
      if (results.length === 0) {
        console.log(
          `[SEARCH] Neural search found 0 results for "${searchTerm}", falling back to keyword search`,
        );
        const allImages = await ImageRepository.findAllByUserId(userId);
        results = allImages.filter(
          (img) =>
            img.original_name
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            img.tags?.some((t) =>
              t.toLowerCase().includes(searchTerm.toLowerCase()),
            ),
        );
      }

      res.json(results.map((img) => ({ ...img, status: "available" })));
    } catch (error) {
      console.error("ImageController Search Error:", error);
      res.status(500).json({ error: "Search failed", message: error.message });
    }
  }

  async list(req, res) {
    try {
      const userId = req.user.id;
      const images = await ImageRepository.findAllByUserId(userId);
      res.json(images.map((img) => ({ ...img, status: "available" })));
    } catch (error) {
      console.error("ImageController List Error:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch images", message: error.message });
    }
  }

  async update(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { album_id } = req.body;
      const updated = await ImageRepository.update(id, userId, {
        album_id: album_id || null,
      });
      res.json(updated);
    } catch (error) {
      console.error("ImageController Update Error:", error);
      res
        .status(500)
        .json({ error: "Failed to update image", message: error.message });
    }
  }

  async findSimilar(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      // 1. Get the source image's embedding
      const sourceImage = await ImageRepository.findById(id, userId);
      if (!sourceImage || !sourceImage.embedding) {
        return res.status(404).json({
          error: "Source image or AI data not found. Try re-indexing.",
        });
      }

      console.log(
        `[SIMILAR] Finding memories related to: ${sourceImage.original_name}`,
      );

      // 2. Perform vector search using this embedding
      const similarImages = await ImageRepository.searchByEmbedding(
        userId,
        sourceImage.embedding,
        0.6, // Increased threshold for high-quality Memories
        12, // Up to 12 photos for a rich collage
      );

      // Filter out the source image itself from the results
      const curatedMemories = similarImages.filter((img) => img.id !== id);

      res.json({
        source: sourceImage,
        memories: curatedMemories.map((img) => ({
          ...img,
          status: "available",
        })),
      });
    } catch (error) {
      console.error("ImageController Similar Search Error:", error);
      res
        .status(500)
        .json({ error: "Failed to generate memories", message: error.message });
    }
  }

  async bulkUpdate(req, res) {
    try {
      const userId = req.user.id;
      const { imageIds, album_id } = req.body;
      if (!Array.isArray(imageIds) || imageIds.length === 0) {
        return res
          .status(400)
          .json({ error: "imageIds must be a non-empty array" });
      }
      const updated = await ImageRepository.bulkUpdateAlbum(
        imageIds,
        userId,
        album_id,
      );
      res.json(updated);
    } catch (error) {
      console.error("ImageController BulkUpdate Error:", error);
      res
        .status(500)
        .json({ error: "Bulk update failed", message: error.message });
    }
  }

  async restore(req, res) {
    // Legacy route kept for backward compatibility
    const { filename } = req.params;
    return res.status(410).json({
      error: "This restore method is deprecated.",
      message: "Use POST /api/images/:id/restore instead.",
    });
  }

  /**
   * Restore a Cloudinary image using the FREE Supabase Storage backup.
   *
   * Flow:
   *   1. Look up image record in Supabase DB (gets public_id + backup_path)
   *   2. Download the backup file from Supabase Storage
   *   3. Re-upload the buffer to Cloudinary using upload_stream (same public_id)
   *   4. Update cloudinary_url in Supabase DB with the fresh URL
   *   5. Return updated image
   *
   * This is 100% free — no paid Cloudinary plan required.
   */
  async restoreFromMetadata(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      // 1. Fetch image record from Supabase
      const image = await ImageRepository.findById(id, userId);
      if (!image) {
        return res
          .status(404)
          .json({ error: "Image record not found in database" });
      }

      // Determine backup_path: use stored value or reconstruct from userId + public_id
      const backupPath = image.backup_path || `${userId}/${image.public_id}`;

      if (!image.public_id) {
        return res.status(400).json({
          error: "No Cloudinary public_id found. Cannot restore.",
        });
      }

      console.log(
        `[RESTORE] Attempting restore for: ${image.original_name} (ID: ${id})`,
      );
      console.log(`[RESTORE] Backup path: ${backupPath}`);
      console.log(`[RESTORE] Public ID: ${image.public_id}`);

      // 2. Download the backup file from Supabase Storage
      console.log(
        `[RESTORE] Downloading from Supabase bucket: ${BACKUP_BUCKET}...`,
      );
      const { data: fileData, error: downloadErr } = await supabaseAdmin.storage
        .from(BACKUP_BUCKET)
        .download(backupPath);

      if (downloadErr || !fileData) {
        console.error(
          "[RESTORE] Supabase Storage download failed:",
          downloadErr?.message,
        );
        return res.status(404).json({
          error: "Backup not found in Supabase Storage",
          message:
            "This image was uploaded before the backup system was enabled, " +
            "or the backup was not saved successfully at upload time. " +
            "You will need to re-upload the original image manually.",
          backup_path: backupPath,
        });
      }

      // 3. Convert Blob → Buffer and re-upload to Cloudinary using the original public_id
      const arrayBuffer = await fileData.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      console.log(
        `[RESTORE] Re-uploading ${buffer.length} bytes to Cloudinary...`,
      );

      console.log(
        `[RESTORE] Re-uploading ${buffer.length} bytes to Cloudinary...`,
      );

      const cloudinaryResult = await new Promise((resolve, reject) => {
        console.log(
          `[RESTORE] Cloudinary upload_stream starting for ${image.public_id}`,
        );
        cloudinary.uploader
          .upload_stream(
            {
              public_id: image.public_id, // Reuse the exact same public_id
              overwrite: true,
              resource_type: "image",
            },
            (err, result) => {
              if (err) {
                console.error(`[RESTORE] Cloudinary upload_stream error:`, err);
                reject(err);
              } else {
                console.log(`[RESTORE] Cloudinary upload_stream success!`);
                resolve(result);
              }
            },
          )
          .end(buffer);
      });

      // 4. Update the cloudinary_url in Supabase DB
      const freshUrl = cloudinaryResult.secure_url;
      const updated = await ImageRepository.update(id, userId, {
        cloudinary_url: freshUrl,
      });

      console.log(
        `[RESTORE] ✅ Successfully restored ${image.public_id} → ${freshUrl}`,
      );

      // 5. Return the updated record
      res.json({
        message: "Image successfully restored from Supabase Storage backup",
        image: { ...updated, status: "available" },
        restoredUrl: freshUrl,
      });
    } catch (error) {
      console.error("ImageController RestoreFromMetadata Error:", error);
      res.status(500).json({
        error: "Failed to restore image",
        message: error.message,
      });
    }
  }

  async delete(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      // 1. Get image info to get public_id
      const image = await ImageRepository.findById(id, userId);
      if (!image) return res.status(404).json({ error: "Image not found" });

      // 2. Delete from Cloudinary
      await deleteImage(image.public_id);

      // 3. Delete from DB
      await ImageRepository.delete(id, userId);

      res.json({ message: "Image deleted successfully" });
    } catch (error) {
      console.error("ImageController Delete Error:", error);
      res.status(500).json({ error: "Delete failed", message: error.message });
    }
  }

  async share(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const image = await ImageRepository.findById(id, userId);
      if (!image) return res.status(404).json({ error: "Image not found" });

      // Generate a 24h token
      const token = jwt.sign({ imageId: id, userId: userId }, JWT_SECRET, {
        expiresIn: "24h",
      });

      res.json({ token, expiresIn: "24h" });
    } catch (error) {
      console.error("ImageController Share Error:", error);
      res.status(500).json({ error: "Failed to generate share link" });
    }
  }

  async resolveShare(req, res) {
    try {
      const { token } = req.params;
      const decoded = jwt.verify(token, JWT_SECRET);

      // Use admin repository access because this is a public link
      const { supabaseAdmin } = require("../config/supabase");
      const { data: image, error } = await supabaseAdmin
        .from("images")
        .select("*")
        .eq("id", decoded.imageId)
        .single();

      if (error || !image)
        return res.status(404).send("Link expired or image not found.");

      // For debugging/analytics we could log the view here

      // Redirect to the actual Cloudinary URL
      res.redirect(image.cloudinary_url);
    } catch (error) {
      console.error("ImageController ResolveShare Error:", error);
      res.status(403).send("This link has expired or is invalid.");
    }
  }

  async getRestorable(req, res) {
    try {
      const userId = req.user.id;
      const { data: images, error } = await supabaseAdmin
        .from("images")
        .select("*")
        .eq("user_id", userId)
        .not("backup_path", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Generate signed URLs for previews (valid for 1 hour)
      const imagesWithPreviews = await Promise.all(
        images.map(async (img) => {
          const { data } = await supabaseAdmin.storage
            .from(BACKUP_BUCKET)
            .createSignedUrl(img.backup_path, 3600);
          return {
            ...img,
            supabase_preview_url: data?.signedUrl,
            status: "available",
          };
        }),
      );

      res.json(imagesWithPreviews);
    } catch (error) {
      console.error("ImageController GetRestorable Error:", error);
      res.status(500).json({ error: "Failed to fetch restorable images" });
    }
  }

  /**
   * Bulk check if images exist on Cloudinary.
   * Helps identify which images were deleted and need restoration.
   */
  async checkCloudinaryStatusBulk(req, res) {
    try {
      const { imageIds } = req.body;
      const userId = req.user.id;

      if (!Array.isArray(imageIds)) {
        return res.status(400).json({ error: "imageIds must be an array" });
      }

      // Fetch the public_ids from our DB
      const { data: images, error } = await supabaseAdmin
        .from("images")
        .select("id, public_id")
        .in("id", imageIds.slice(0, 100)) // Cloudinary limit is 100
        .eq("user_id", userId);

      if (error) throw error;

      const publicIds = images.map((img) => img.public_id);

      // Call Cloudinary API to get info on these resources
      const cloudRes = await cloudinary.api.resources_by_ids(publicIds);
      const existingPublicIds = new Set(
        cloudRes.resources.map((r) => r.public_id),
      );

      // Determine which ones are missing
      const statusResults = images.map((img) => ({
        id: img.id,
        isDeleted: !existingPublicIds.has(img.public_id),
      }));

      res.json(statusResults);
    } catch (error) {
      console.error("ImageController CheckStatus Error:", error);
      res.status(500).json({ error: "Failed to check image status" });
    }
  }
}

module.exports = new ImageController();
