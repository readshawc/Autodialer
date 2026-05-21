/**
 * telephony.js — Provider-agnostic telephony layer
 *
 * To swap providers in the future, only this file needs to change.
 * The rest of the app calls initCall(), hangUp(), and getCallStatus()
 * without knowing which provider is underneath.
 *
 * Current provider: Telnyx
 * Future options:   Twilio, Bandwidth, Vonage (just swap the adapter below)
 */

const https = require("https");

const PROVIDER = process.env.TELEPHONY_PROVIDER || "telnyx";

// ─── Telnyx Adapter ───────────────────────────────────────────────────────────
const telnyxAdapter = {
  /**
   * Place an outbound call.
   * Returns { callControlId, status }
   */
  async initCall({ to, from, webhookUrl, connectionId }) {
    const body = JSON.stringify({
      to,
      from,
      connection_id: connectionId || process.env.TELNYX_CONNECTION_ID,
      webhook_url: webhookUrl,
      // AMD — hang up automatically if voicemail detected
      answering_machine_detection: "detect_beep",
      answering_machine_detection_config: {
        total_analysis_time_millis: 3500,
        after_greeting_silence_millis: 800,
        between_words_silence_millis: 50,
        greeting_duration_millis: 1500,
        initial_silence_millis: 2000,
        maximum_number_of_words: 5,
        maximum_silence_after_word_millis: 200,
        silence_threshold: 256,
        greeting_total_analysis_time_millis: 7500,
        greeting_silence_duration_millis: 2000,
      },
    });

    return telnyxRequest("POST", "/v2/calls", body);
  },

  /** Hang up an active call */
  async hangUp(callControlId) {
    return telnyxRequest("POST", `/v2/calls/${callControlId}/actions/hangup`, "{}");
  },

  /** Retrieve live call status */
  async getCallStatus(callControlId) {
    return telnyxRequest("GET", `/v2/calls/${callControlId}`, null);
  },
};

// ─── HTTP helper for Telnyx ───────────────────────────────────────────────────
function telnyxRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.telnyx.com",
      path,
      method,
      headers: {
        Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
        "Content-Type": "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) reject(new Error(parsed.errors?.[0]?.detail || "Telnyx error"));
          else resolve(parsed.data || parsed);
        } catch (e) {
          reject(new Error("Invalid JSON from Telnyx"));
        }
      });
    });

    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────
const adapters = { telnyx: telnyxAdapter };

function getAdapter() {
  const adapter = adapters[PROVIDER];
  if (!adapter) throw new Error(`Unknown telephony provider: ${PROVIDER}`);
  return adapter;
}

module.exports = {
  initCall: (opts) => getAdapter().initCall(opts),
  hangUp: (id) => getAdapter().hangUp(id),
  getCallStatus: (id) => getAdapter().getCallStatus(id),
};
