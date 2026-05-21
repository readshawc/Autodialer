const express = require("express");
const router = express.Router();
const dialer = require("../services/dialer");
const queue = require("../services/queue");

// GET /calls/state — full app state (contacts, stats, params, active call)
router.get("/state", (req, res) => {
  res.json(queue.getState());
});

// POST /calls/start — begin the dialing loop
router.post("/start", (req, res) => {
  queue.setRunning(true);
  dialer.start();
  res.json({ ok: true, message: "Dialer started" });
});

// POST /calls/stop — pause the dialer
router.post("/stop", (req, res) => {
  dialer.stop();
  res.json({ ok: true, message: "Dialer stopped" });
});

// PATCH /calls/params — update dialing parameters on the fly
// Body: { maxRings, retryAfterMinutes, maxAttempts, callIntervalSeconds }
router.patch("/params", (req, res) => {
  const allowed = ["maxRings", "retryAfterMinutes", "maxAttempts", "callIntervalSeconds"];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      const val = Number(req.body[key]);
      if (!isNaN(val) && val > 0) updates[key] = val;
    }
  }
  queue.setParams(updates);
  res.json({ ok: true, params: queue.state.params });
});

module.exports = router;
