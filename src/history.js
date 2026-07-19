const fs = require('fs');
const path = require('path');

const HISTORY_PATH = path.join(__dirname, '..', 'data', 'history.json');
const MAX_ENTRIES = 200;

function loadHistory() {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function saveHistory(history) {
  fs.mkdirSync(path.dirname(HISTORY_PATH), { recursive: true });
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}

function recordPost(entry, history) {
  const updated = [...history, entry].slice(-MAX_ENTRIES);
  saveHistory(updated);
  return updated;
}

module.exports = { loadHistory, saveHistory, recordPost };
