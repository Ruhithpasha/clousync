const { supabaseAdmin } = require("../config/supabase");

class AdminController {
  async getStats(req, res) {
    try {
      // Parallelize queries to reduce total response time
      const [profilesResult, imagesCountResult, storageResult, activityResult] =
        await Promise.all([
          supabaseAdmin.from("profiles").select("plan"),
          supabaseAdmin
            .from("images")
            .select("*", { count: "exact", head: true }),
          supabaseAdmin.from("images").select("file_size"),
          supabaseAdmin
            .from("images")
            .select(
              `
            id,
            original_name,
            cloudinary_url,
            created_at,
            profiles (username)
          `,
            )
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

      if (profilesResult.error) throw profilesResult.error;
      if (imagesCountResult.error) throw imagesCountResult.error;
      if (storageResult.error) throw storageResult.error;
      if (activityResult.error) throw activityResult.error;

      const profiles = profilesResult.data;
      const latestImages = activityResult.data;
      const totalImages = imagesCountResult.count;

      const totalUsers = profiles.length;
      const planStats = profiles.reduce((acc, p) => {
        acc[p.plan] = (acc[p.plan] || 0) + 1;
        return acc;
      }, {});

      const totalStorageUsed = storageResult.data.reduce(
        (acc, img) => acc + (img.file_size || 0),
        0,
      );

      res.json({
        stats: {
          totalUsers,
          planStats,
          totalImages,
          totalStorageUsed,
        },
        latestActivity: latestImages,
      });
    } catch (error) {
      console.error("AdminController Stats Error:", error);
      res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  }

  async getAllUsers(req, res) {
    try {
      const { data: users, error } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  }

  async updateUserPlan(req, res) {
    try {
      const { userId, plan, storageLimit } = req.body;
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .update({ plan, storage_limit: storageLimit })
        .eq("id", userId)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user plan" });
    }
  }
}

module.exports = new AdminController();
