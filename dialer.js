const telephony = require("./telephony");
const queue = require("./queue");

let dialerTimer = null;

async function tick() {
  const { state } = queue;
  if (!state.running) return;
  if (state.activeCallId) return;

  const next = queue.getNextContact();
  if (!next) {
    console.log("📋 No more contacts to call. Stopping dialer.");
    queue.setRunning(false);
    return;
  }

  try {
    console.log(`📞 Calling ${next.name} at ${next.phone}…`);
    console.log(`🔑 API Key starts with: ${(process.env.TELNYX_API_KEY||"").substring(0,6)}`);
    console.log(`📡 Connection ID: ${process.env.TELNYX_CONNECTION_ID}`);
    console.log(`📱 From number: ${process.env.TELNYX_PHONE_NUMBER}`);

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
    queue.recordAttempt(next.id, { rings: 0, outcome: "error", callControlId: null });
    queue.clearActiveCall();
  }
}

function start() {
  if (dialerTimer) return;
  console.log("▶ Dialer started");
  dialerTimer = setInterval(tick, 1500);
}

function stop() {
  if (dialerTimer) {
    clearInterval(dialerTimer);
    dialerTimer = null;
  }
  queue.setRunning(false);
  console.log("⏹ Dialer stopped");
}

async function handleCallEvent(event) {
  const { event_type, payload } = event;
  const callControlId = payload?.call_control_id;
  const { state } = queue;
  if (callControlId !== state.activeCallId) return;
  console.log(`📡 Call event: ${event_type}`);
  switch (event_type) {
    case "call.answered":
      queue.recordAttempt(state.activeContactId, { rings: payload.ring_count||1, outcome: "answered", callControlId });
      break;
    case "call.machine.detection.ended":
      if ((payload.result||"").startsWith("machine")) {
        await telephony.hangUp(callControlId);
        queue.recordAttempt(state.activeContactId, { rings: payload.ring_count||0, outcome: "voicemail", callControlId });
        queue.clearActiveCall();
      }
      break;
    case "call.hangup":
      const alreadyRecorded = queue.state.callLog[state.activeContactId]?.attempts.some(a=>a.callControlId===callControlId);
      if (!alreadyRecorded) queue.recordAttempt(state.activeContactId, { rings: payload.ring_count||0, outcome: "no_answer", callControlId });
      queue.clearActiveCall();
      break;
  }
}

module.exports = { start, stop, handleCallEvent };
