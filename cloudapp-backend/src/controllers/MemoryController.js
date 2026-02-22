const MemoryRepository = require("../repositories/MemoryRepository");
const ImageRepository = require("../repositories/ImageRepository");

class MemoryController {
  async create(req, res) {
    try {
      const userId = req.user.id;
      const { name, sourceImageId, imageIds } = req.body;

      if (!name || !sourceImageId || !imageIds || !Array.isArray(imageIds)) {
        return res
          .status(400)
          .json({ error: "Missing required fields for memory creation" });
      }

      const memoryData = {
        user_id: userId,
        name,
        source_image_id: sourceImageId,
        image_ids: imageIds,
      };

      const dbData = await MemoryRepository.create(memoryData);
      res.status(201).json(dbData);
    } catch (error) {
      console.error("MemoryController Create Error:", error);
      res
        .status(500)
        .json({ error: "Failed to save memory", message: error.message });
    }
  }

  async list(req, res) {
    try {
      const userId = req.user.id;
      const memories = await MemoryRepository.findAllByUserId(userId);
      res.json(memories);
    } catch (error) {
      console.error("MemoryController List Error:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch memories", message: error.message });
    }
  }

  async getDetail(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const memory = await MemoryRepository.findById(id, userId);
      if (!memory) return res.status(404).json({ error: "Memory not found" });

      // Fetch all images participating in the memory
      const { supabaseAdmin } = require("../config/supabase");
      const { data: images, error } = await supabaseAdmin
        .from("images")
        .select("*")
        .in("id", memory.image_ids);

      if (error) throw error;

      res.json({
        ...memory,
        images: images.map((img) => ({ ...img, status: "available" })),
      });
    } catch (error) {
      console.error("MemoryController Detail Error:", error);
      res.status(500).json({
        error: "Failed to fetch memory details",
        message: error.message,
      });
    }
  }

  async update(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { name } = req.body;

      if (!name)
        return res.status(400).json({ error: "Name is required for update" });

      const updated = await MemoryRepository.update(id, userId, { name });
      res.json(updated);
    } catch (error) {
      console.error("MemoryController Update Error:", error);
      res.status(500).json({ error: "Failed to update memory" });
    }
  }

  async delete(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      await MemoryRepository.delete(id, userId);
      res.json({ message: "Memory deleted successfully" });
    } catch (error) {
      console.error("MemoryController Delete Error:", error);
      res.status(500).json({ error: "Failed to delete memory" });
    }
  }
}

module.exports = new MemoryController();
