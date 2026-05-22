const https = require("https");

function telnyxRequest(method, path, body) {
  const apiKey = process.env.TELNYX_API_KEY || "";
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.telnyx.com",
      path,
      method,
      headers: {
        Authorization: "Bearer " + apiKey.trim(),
        "Content-Type": "application/json",
        "Content-Length": body ? Buffer.byteLength(body) : 0,
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            const msg = parsed.errors?.[0]?.detail || parsed.errors?.[0]?.title || JSON.stringify(parsed);
            reject(new Error(msg));
          } else {
            resolve(parsed.data || parsed);
          }
        } catch (e) {
          reject(new Error("Invalid JSON from Telnyx: " + data));
        }
      });
    });

    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

module.exports = {
  initCall: ({ to, from, webhookUrl }) => {
    const body = JSON.stringify({
      to,
      from,
      connection_id: process.env.TELNYX_CONNECTION_ID,
      webhook_url: webhookUrl,
      answering_machine_detection: "detect_beep",
    });
    return telnyxRequest("POST", "/v2/calls", body);
  },
  hangUp: (callControlId) => telnyxRequest("POST", `/v2/calls/${callControlId}/actions/hangup`, "{}"),
  getCallStatus: (callControlId) => telnyxRequest("GET", `/v2/calls/${callControlId}`, null),
};
