const express = require("express");
const router = express.Router();
const queue = require("./queue");

// GET /contacts — list all contacts with their call logs
router.get("/", (req, res) => {
  res.json(queue.getContacts());
});

// POST /contacts — add a single contact
// Body: { name, phone }
router.post("/", (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) return res.status(400).json({ error: "name and phone are required" });
  const contact = queue.addContact(name.trim(), phone.trim());
  res.status(201).json(contact);
});

// POST /contacts/bulk — import multiple contacts
// Body: [{ name, phone }, ...]
router.post("/bulk", (req, res) => {
  const list = req.body;
  if (!Array.isArray(list) || list.length === 0) {
    return res.status(400).json({ error: "Send an array of { name, phone } objects" });
  }
  const valid = list.filter((c) => c.name && c.phone);
  const added = queue.addContacts(valid);
  res.status(201).json({ added: added.length, contacts: added });
});

// DELETE /contacts/:id — remove a contact
router.delete("/:id", (req, res) => {
  queue.removeContact(req.params.id);
  res.json({ ok: true });
});

// POST /contacts/:id/reset — reset call history for a contact
router.post("/:id/reset", (req, res) => {
  queue.resetContact(req.params.id);
  res.json({ ok: true });
});

// POST /contacts/:id/skip — skip a contact permanently
router.post("/:id/skip", (req, res) => {
  queue.skipContact(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
