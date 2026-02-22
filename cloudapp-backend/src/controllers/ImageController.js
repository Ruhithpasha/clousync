const fs = require("fs");
const ImageRepository = require("../repositories/ImageRepository");
const { uploadImage, deleteImage } = require("../utils/cloudinaryUtils");
const {
  generateImageTags,
  generateEmbedding,
  classifyImageWithCLIP,
  generateCLIPImageEmbedding,
  generateCLIPTextEmbedding,
} = require("../utils/aiUtils");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "cloudsync_secure_share_key_2024";

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

      // Cleanup local file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(201).json({ ...dbData, status: "available" });
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
    const { filename } = req.params;
    try {
      const path = require("path");
      const localPath = path.join(__dirname, "../../uploads", filename);
      if (!fs.existsSync(localPath)) {
        return res.status(404).json({ error: "Local image file not found" });
      }

      const result = await uploadImage(localPath, filename);
      res.json({
        message: "Image restored to Cloudinary",
        data: {
          filename: filename,
          cloudinaryUrl: result.secure_url,
          cloudinaryPublicId: result.public_id,
          status: "available",
        },
      });
    } catch (err) {
      console.error("ImageController Restore Error:", err);
      res
        .status(500)
        .json({ error: "Failed to restore image", message: err.message });
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
}

module.exports = new ImageController();
