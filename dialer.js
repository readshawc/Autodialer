/**
 * dialer.js — The calling engine
 *
 * Runs the loop: pick next contact → call → wait → repeat
 * Handles AMD (voicemail detection) hang-ups automatically
 */

const telephony = require("./telephony");
const queue = require("./queue");

let dialerTimer = null;

async function tick() {
  const { state } = queue;
  if (!state.running) return;

  // Already on a call — wait
  if (state.activeCallId) return;

  const next = queue.getNextContact();
  if (!next) {
    console.log("📋 No more contacts to call. Stopping dialer.");
    queue.setRunning(false);
    return;
  }

  try {
    console.log(`📞 Calling ${next.name} at ${next.phone}…`);

    const webhookUrl = `${process.env.BACKEND_URL}/webhooks/telnyx`;
    const result = await telephony.initCall({
      to: next.phone,
      from: process.env.TELNYX_PHONE_NUMBER,
      webhookUrl,
    });

    queue.setActiveCall(next.id, result.call_control_id);
    console.log(`✅ Call initiated — control ID: ${result.call_control_id}`);

  } catch (err) {
    console.error(`❌ Failed to call ${next.name}:`, err.message);
    // Record as failed attempt so we retry later
    queue.recordAttempt(next.id, { rings: 0, outcome: "error", callControlId: null });
    queue.clearActiveCall();
  }
}

function start() {
  if (dialerTimer) return;
  console.log("▶ Dialer started");
  dialerTimer = setInterval(tick, 1500); // Check every 1.5s
}

function stop() {
  if (dialerTimer) {
    clearInterval(dialerTimer);
    dialerTimer = null;
  }
  queue.setRunning(false);
  console.log("⏹ Dialer stopped");
}

/**
 * Called by the webhook handler when Telnyx reports a call event.
 * This is how we learn if someone answered, hung up, or voicemail was detected.
 */
async function handleCallEvent(event) {
  const { event_type, payload } = event;
  const callControlId = payload?.call_control_id;
  const { state } = queue;

  // Only process events for our active call
  if (callControlId !== state.activeCallId) return;

  console.log(`📡 Call event: ${event_type}`);

  switch (event_type) {

    case "call.answered": {
      // Real human answered — record it
      const rings = payload.ring_count || 1;
      queue.recordAttempt(state.activeContactId, {
        rings,
        outcome: "answered",
        callControlId,
      });
      // Don't hang up — let the user handle the live call
      break;
    }

    case "call.machine.detection.ended": {
      // AMD result — if voicemail, hang up immediately
      const result = payload.result; // "human", "machine_start", "machine_end_beep", etc.
      if (result && result.startsWith("machine")) {
        console.log("🤖 Voicemail detected — hanging up");
        await telephony.hangUp(callControlId);
        queue.recordAttempt(state.activeContactId, {
          rings: payload.ring_count || 0,
          outcome: "voicemail",
          callControlId,
        });
        queue.clearActiveCall();
        // Wait the configured interval before next call
        await sleep(state.params.callIntervalSeconds * 1000);
      }
      break;
    }

    case "call.hangup": {
      const rings = payload.ring_count || 0;
      const alreadyRecorded = queue.state.callLog[state.activeContactId]?.attempts
        .some((a) => a.callControlId === callControlId);

      if (!alreadyRecorded) {
        // No answer — hung up without connecting
        queue.recordAttempt(state.activeContactId, {
          rings,
          outcome: "no_answer",
          callControlId,
        });
      }

      queue.clearActiveCall();
      await sleep(state.params.callIntervalSeconds * 1000);
      break;
    }

    default:
      break;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { start, stop, handleCallEvent };
