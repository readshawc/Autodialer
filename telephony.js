const telnyx = require("telnyx");

function getClient() {
  const key = (process.env.TELNYX_API_KEY || "").trim();
  console.log("🔑 Using Telnyx key starting with:", key.substring(0, 8));
  return telnyx(key);
}

module.exports = {
  initCall: async ({ to, from, webhookUrl }) => {
    const client = getClient();
    const result = await client.calls.create({
      to,
      from,
      connection_id: process.env.TELNYX_CONNECTION_ID,
      webhook_url: webhookUrl,
      answering_machine_detection: "detect_beep",
    });
    console.log("📞 Telnyx call created:", JSON.stringify(result.data));
    return result.data;
  },

  hangUp: async (callControlId) => {
    const client = getClient();
    await client.calls.hangup(callControlId);
  },

  getCallStatus: async (callControlId) => {
    const client = getClient();
    return client.calls.retrieve(callControlId);
  },
};
