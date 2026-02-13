const { supabaseAdmin } = require("../config/supabase");

class ProfileRepository {
  async findById(userId) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async update(userId, updates) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .upsert(
        { ...updates, id: userId, updated_at: new Date() },
        { onConflict: "id" },
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updatePlan(userId, plan, storageLimit) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          plan,
          storage_limit: storageLimit,
          updated_at: new Date(),
        },
        { onConflict: "id" },
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

module.exports = new ProfileRepository();
