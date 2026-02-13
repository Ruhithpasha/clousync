const { supabaseAdmin } = require("../config/supabase");

class AlbumRepository {
  async findAllByUserId(userId) {
    const { data, error } = await supabaseAdmin
      .from("albums")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }

  async create(albumData) {
    const { data, error } = await supabaseAdmin
      .from("albums")
      .insert([albumData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id, userId, updates) {
    const { data, error } = await supabaseAdmin
      .from("albums")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(id, userId) {
    const { error } = await supabaseAdmin
      .from("albums")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;
    return true;
  }
}

module.exports = new AlbumRepository();
