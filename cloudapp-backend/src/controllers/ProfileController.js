const ProfileRepository = require("../repositories/ProfileRepository");
const ImageRepository = require("../repositories/ImageRepository");

class ProfileController {
  async get(req, res) {
    try {
      const userId = req.user.id;
      let [profile, currentUsage] = await Promise.all([
        ProfileRepository.findById(userId),
        ImageRepository.getTotalUsedStorage(userId),
      ]);

      if (!profile) {
        return res.json({
          username: req.user.user_metadata?.username || "",
          avatar_url: req.user.user_metadata?.avatar_url || "",
          plan: "FREE",
          storage_limit: 104857600,
          storage_usage: currentUsage,
          is_new: true,
        });
      }

      res.json({ ...profile, storage_usage: currentUsage });
    } catch (error) {
      console.error("ProfileController Get Error:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch profile", message: error.message });
    }
  }

  async update(req, res) {
    try {
      const userId = req.user.id;
      const { username, avatar_url } = req.body;
      const profile = await ProfileRepository.update(userId, {
        username,
        avatar_url,
      });
      res.json(profile);
    } catch (error) {
      console.error("ProfileController Update Error:", error);
      res
        .status(500)
        .json({ error: "Failed to update profile", message: error.message });
    }
  }

  async upgradePlan(req, res) {
    try {
      const userId = req.user.id;
      const { plan } = req.body;

      let storageLimit;
      if (plan === "PRO")
        storageLimit = 524288000; // 500MB
      else if (plan === "SUPER")
        storageLimit = 1073741824; // 1GB
      else return res.status(400).json({ error: "Invalid plan type" });

      const profile = await ProfileRepository.updatePlan(
        userId,
        plan,
        storageLimit,
      );
      res.json({ message: `Successfully upgraded to ${plan} plan`, profile });
    } catch (error) {
      console.error("ProfileController Upgrade Error:", error);
      res
        .status(500)
        .json({ error: "Failed to upgrade plan", message: error.message });
    }
  }
}

module.exports = new ProfileController();
