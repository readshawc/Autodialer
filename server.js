const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const callRoutes = require("./routes/calls");
const contactRoutes = require("./routes/contacts");
const webhookRoutes = require("./routes/webhooks");
const authMiddleware = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Security ────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.options("*", cors()); // Handle preflight requests
app.use(express.json());

// Rate limiting — 100 requests per minute per IP
app.use(rateLimit({ windowMs: 60_000, max: 100 }));

// ─── Health check (no auth needed) ───────────────────────────────────────────
app.get("/health", (req, res) => res.json({ status: "ok", ts: new Date().toISOString() }));

// ─── Webhooks (no auth — Telnyx calls these) ─────────────────────────────────
app.use("/webhooks", webhookRoutes);

// ─── Protected routes ─────────────────────────────────────────────────────────
app.use("/calls", authMiddleware, callRoutes);
app.use("/contacts", authMiddleware, contactRoutes);

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong", message: err.message });
});

app.listen(PORT, () => console.log(`✅ Dialer backend running on port ${PORT}`));
