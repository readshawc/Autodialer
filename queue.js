/**
 * queue.js — Call queue & state manager
 *
 * Stores contacts, call history, and dialer state in memory.
 * For scaling to a full call center, swap this with a Redis or
 * PostgreSQL backend — the interface stays the same.
 */

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  contacts: [],          // { id, name, phone, addedAt }
  callLog: {},           // contactId → { status, attempts: [{ts, rings, outcome, callControlId}] }
  activeCallId: null,    // callControlId currently in progress
  activeContactId: null, // contact being called right now
  running: false,
  params: {
    maxRings: 6,
    retryAfterMinutes: 30,
    maxAttempts: 5,
    callIntervalSeconds: 5,
  },
};

const STATUSES = {
  PENDING: "pending",
  CALLING: "calling",
  NO_ANSWER: "no_answer",
  ANSWERED: "answered",
  VOICEMAIL: "voicemail",
  SKIPPED: "skipped",
  MAXED_OUT: "maxed_out",
};

// ─── Contacts ─────────────────────────────────────────────────────────────────
function addContact(name, phone) {
  const id = Math.random().toString(36).slice(2, 9);
  const contact = { id, name, phone, addedAt: Date.now() };
  state.contacts.push(contact);
  state.callLog[id] = { status: STATUSES.PENDING, attempts: [] };
  return contact;
}

function addContacts(list) {
  return list.map(({ name, phone }) => addContact(name, phone));
}

function removeContact(id) {
  state.contacts = state.contacts.filter((c) => c.id !== id);
  delete state.callLog[id];
}

function resetContact(id) {
  state.callLog[id] = { status: STATUSES.PENDING, attempts: [] };
}

function skipContact(id) {
  if (state.callLog[id]) state.callLog[id].status = STATUSES.SKIPPED;
}

function getContacts() {
  return state.contacts.map((c) => ({
    ...c,
    log: state.callLog[c.id] || { status: STATUSES.PENDING, attempts: [] },
  }));
}

// ─── Call log ─────────────────────────────────────────────────────────────────
function recordAttempt(contactId, { rings, outcome, callControlId }) {
  const log = state.callLog[contactId];
  if (!log) return;
  log.attempts.push({ ts: Date.now(), rings, outcome, callControlId });
  log.status = outcome === "answered" ? STATUSES.ANSWERED
    : outcome === "voicemail" ? STATUSES.VOICEMAIL
    : STATUSES.NO_ANSWER;

  // Mark maxed out if hit attempt limit
  if (log.status === STATUSES.NO_ANSWER && log.attempts.length >= state.params.maxAttempts) {
    log.status = STATUSES.MAXED_OUT;
  }
}

// ─── Queue logic ──────────────────────────────────────────────────────────────
function getNextContact() {
  const now = Date.now();
  const retryMs = state.params.retryAfterMinutes * 60 * 1000;

  for (const contact of state.contacts) {
    const log = state.callLog[contact.id];
    if (!log) continue;

    // Skip terminal statuses
    if ([STATUSES.ANSWERED, STATUSES.SKIPPED, STATUSES.MAXED_OUT].includes(log.status)) continue;

    // Skip if currently calling
    if (log.status === STATUSES.CALLING) continue;

    // Skip if max attempts reached
    if (log.attempts.length >= state.params.maxAttempts) continue;

    // If previously failed, check retry window
    if (log.status === STATUSES.NO_ANSWER || log.status === STATUSES.VOICEMAIL) {
      const last = log.attempts[log.attempts.length - 1];
      if (last && now - last.ts < retryMs) continue;
    }

    return contact;
  }
  return null;
}

// ─── Dialer state ─────────────────────────────────────────────────────────────
function setRunning(val) { state.running = val; }
function setActiveCall(contactId, callControlId) {
  state.activeContactId = contactId;
  state.activeCallId = callControlId;
  if (contactId && state.callLog[contactId]) {
    state.callLog[contactId].status = STATUSES.CALLING;
  }
}
function clearActiveCall() {
  state.activeContactId = null;
  state.activeCallId = null;
}
function setParams(updates) {
  Object.assign(state.params, updates);
}
function getState() {
  return {
    running: state.running,
    activeContactId: state.activeContactId,
    activeCallId: state.activeCallId,
    params: state.params,
    contacts: getContacts(),
    stats: {
      total: state.contacts.length,
      answered: Object.values(state.callLog).filter((l) => l.status === STATUSES.ANSWERED).length,
      noAnswer: Object.values(state.callLog).filter((l) => l.status === STATUSES.NO_ANSWER).length,
      pending: Object.values(state.callLog).filter((l) => l.status === STATUSES.PENDING).length,
      maxedOut: Object.values(state.callLog).filter((l) => l.status === STATUSES.MAXED_OUT).length,
    },
  };
}

module.exports = {
  addContact, addContacts, removeContact, resetContact, skipContact,
  getContacts, recordAttempt, getNextContact,
  setRunning, setActiveCall, clearActiveCall, setParams, getState,
  state, STATUSES,
};
