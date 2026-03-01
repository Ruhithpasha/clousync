const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ CRITICAL: Supabase credentials missing in environment!");
  console.error(
    "Please check your .env file or docker-compose.yml environment section.",
  );
} else {
  console.log(
    "✅ Supabase initialized for Auth (URL: " +
      supabaseUrl.substring(0, 20) +
      "...)",
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.warn(`[Auth] 401: No header for ${req.method} ${req.url}`);
    return res.status(401).json({ error: "No authorization header provided" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    console.warn(`[Auth] 401: Invalid header format for ${req.url}`);
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      console.error(`[Auth] 401 Reject: ${error?.message || "User not found"}`);
      console.error(`[Auth] Token hint: ${token.substring(0, 15)}...`);
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    req.user = data.user;
    next();
  } catch (err) {
    console.error(`[Auth] 500 Error: ${err.message}`);
    return res.status(500).json({ error: "Auth internal error" });
  }
};

// Simple memory cache for admin status (1 minute TTL)
const adminCache = new Map();
const CACHE_TTL = 60 * 1000;

const authenticateAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No authorization header provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) throw new Error("Invalid token format");
    const payload = JSON.parse(Buffer.from(payloadBase64, "base64").toString());
    const userId = payload.sub;

    // Check cache
    const cached = adminCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      if (!cached.isAdmin)
        return res.status(403).json({ error: "Access denied" });

      // Still need to verify token validity even on cache hit,
      // but we can skip the profile DB query
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);
      if (authError || !user)
        return res.status(401).json({ error: "Invalid session" });

      req.user = user;
      return next();
    }

    const [authResult, profileResult] = await Promise.all([
      supabase.auth.getUser(token),
      supabase.from("profiles").select("is_admin").eq("id", userId).single(),
    ]);

    const {
      data: { user },
      error: authError,
    } = authResult;
    const { data: profile, error: profileError } = profileResult;

    if (authError || !user) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    const isAdmin = !profileError && profile?.is_admin;
    adminCache.set(userId, { isAdmin, timestamp: Date.now() });

    if (!isAdmin) {
      return res.status(403).json({ error: "Access denied: Admin only" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Admin Auth Error:", err);
    return res.status(401).json({ error: "Authentication failed" });
  }
};

module.exports = { authenticateUser, authenticateAdmin };
