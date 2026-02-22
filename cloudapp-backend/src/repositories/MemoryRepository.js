const { supabaseAdmin } = require("../config/supabase");

class MemoryRepository {
  async create(memoryData) {
    const { data, error } = await supabaseAdmin
      .from("memories")
      .insert([memoryData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async findAllByUserId(userId) {
    const { data, error } = await supabaseAdmin
      .from("memories")
      .select(
        `
        *,
        source_image:source_image_id (*)
      `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }

  async findById(id, userId) {
    const { data, error } = await supabaseAdmin
      .from("memories")
      .select(
        `
        *,
        source_image:source_image_id (*)
      `,
      )
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) throw error;
    return data;
  }

  async update(id, userId, updates) {
    const { data, error } = await supabaseAdmin
      .from("memories")
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
      .from("memories")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;
    return true;
  }
}

module.exports = new MemoryRepository();
