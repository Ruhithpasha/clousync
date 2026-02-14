const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No authorization header provided" });
  }

  const token = authHeader.split(" ")[1];
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  req.user = data.user;
  next();
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
