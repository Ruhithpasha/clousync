const { supabaseAdmin } = require("../config/supabase");

class ImageRepository {
  async create(imageData) {
    const { data, error } = await supabaseAdmin
      .from("images")
      .insert([imageData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getTotalUsedStorage(userId) {
    const { data, error } = await supabaseAdmin
      .from("images")
      .select("file_size")
      .eq("user_id", userId);

    if (error) throw error;
    return data.reduce((sum, img) => sum + (img.file_size || 0), 0);
  }

  async findAllByUserId(userId) {
    const { data, error } = await supabaseAdmin
      .from("images")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }

  async findById(id, userId) {
    const { data, error } = await supabaseAdmin
      .from("images")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) throw error;
    return data;
  }

  async update(id, userId, updates) {
    const { data, error } = await supabaseAdmin
      .from("images")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async bulkUpdateAlbum(imageIds, userId, albumId) {
    const { data, error } = await supabaseAdmin
      .from("images")
      .update({ album_id: albumId || null })
      .in("id", imageIds)
      .eq("user_id", userId)
      .select();

    if (error) throw error;
    return data;
  }

  async findByAlbumId(albumId, userId) {
    const { data, error } = await supabaseAdmin
      .from("images")
      .select("*")
      .eq("user_id", userId)
      .eq("album_id", albumId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }

  async delete(id, userId) {
    const { error } = await supabaseAdmin
      .from("images")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;
    return true;
  }

  async searchByEmbedding(
    userId,
    embedding,
    matchThreshold = 0.25, // Adjusted for balanced discovery
    matchCount = 15,
  ) {
    const { data, error } = await supabaseAdmin.rpc("match_images", {
      query_embedding: embedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
      p_user_id: userId, // Pass userId explicitly
    });

    if (error) throw error;
    return data;
  }
}

module.exports = new ImageRepository();
