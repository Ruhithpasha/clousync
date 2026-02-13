const AlbumRepository = require("../repositories/AlbumRepository");
const ImageRepository = require("../repositories/ImageRepository");

class AlbumController {
  async list(req, res) {
    try {
      const userId = req.user.id;
      const albums = await AlbumRepository.findAllByUserId(userId);
      res.json(albums);
    } catch (error) {
      console.error("AlbumController List Error:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch albums", message: error.message });
    }
  }

  async create(req, res) {
    try {
      const userId = req.user.id;
      const { name, description } = req.body;
      if (!name)
        return res.status(400).json({ error: "Album name is required" });
      const album = await AlbumRepository.create({
        user_id: userId,
        name,
        description,
      });
      res.status(201).json(album);
    } catch (error) {
      console.error("AlbumController Create Error:", error);
      res
        .status(500)
        .json({ error: "Failed to create album", message: error.message });
    }
  }

  async update(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { name, description } = req.body;
      const updated = await AlbumRepository.update(id, userId, {
        name,
        description,
      });
      res.json(updated);
    } catch (error) {
      console.error("AlbumController Update Error:", error);
      res
        .status(500)
        .json({ error: "Failed to update album", message: error.message });
    }
  }

  async delete(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      await AlbumRepository.delete(id, userId);
      res.json({ message: "Album deleted successfully" });
    } catch (error) {
      console.error("AlbumController Delete Error:", error);
      res
        .status(500)
        .json({ error: "Failed to delete album", message: error.message });
    }
  }

  async listImages(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const images = await ImageRepository.findByAlbumId(id, userId);
      res.json(images);
    } catch (error) {
      console.error("AlbumController ListImages Error:", error);
      res
        .status(500)
        .json({
          error: "Failed to fetch album images",
          message: error.message,
        });
    }
  }
}

module.exports = new AlbumController();
