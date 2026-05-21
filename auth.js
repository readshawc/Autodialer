/**
 * auth.js — Simple API key middleware
 *
 * Protects all routes except /health and /webhooks.
 * Set APP_API_KEY in your Railway environment variables.
 * Your frontend sends this key in the Authorization header.
 *
 * For multi-user/team expansion: swap this for JWT tokens.
 */

module.exports = function authMiddleware(req, res, next) {
  const appKey = process.env.APP_API_KEY;

  // If no key is set, warn but allow (useful during initial setup)
  if (!appKey) {
    console.warn("⚠️  APP_API_KEY not set — running without authentication!");
    return next();
  }

  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (token !== appKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
};
