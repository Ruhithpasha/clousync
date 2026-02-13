const { supabaseAdmin } = require("./supabaseAdmin");

async function testConnection() {
  try {
    console.log("Testing Supabase Admin connection...");
    const { data, error } = await supabaseAdmin
      .from("images")
      .select("count", { count: "exact", head: true });

    if (error) {
      console.error("Connection failed or table 'images' missing:", error);
    } else {
      console.log("Successfully connected to 'images' table. Count:", data);
    }

    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("count", { count: "exact", head: true });
    if (profileError) {
      console.error("Table 'profiles' missing:", profileError);
    } else {
      console.log("Successfully connected to 'profiles' table.");
    }
  } catch (err) {
    console.error("Uncaught error during connection test:", err);
  }
}

testConnection();
