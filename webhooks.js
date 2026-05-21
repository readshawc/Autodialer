const express = require("express");
const router = express.Router();
const dialer = require("./dialer");

/**
 * POST /webhooks/telnyx
 *
 * Telnyx sends real-time call events here.
 * We forward them to the dialer engine for processing.
 *
 * Events we care about:
 *   call.answered              — someone picked up
 *   call.machine.detection.ended — AMD result (human or voicemail)
 *   call.hangup                — call ended
 */
router.post("/telnyx", async (req, res) => {
  // Acknowledge immediately — Telnyx expects a fast 200 response
  res.sendStatus(200);

  try {
    const event = req.body?.data;
    if (!event) return;
    await dialer.handleCallEvent(event);
  } catch (err) {
    console.error("Webhook handling error:", err.message);
  }
});

module.exports = router;
