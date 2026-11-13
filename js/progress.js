const PROGRESS_SETTINGS = {
  required: 10,
  lockCertificate: true,
  certificatePageId: 'certificate',
  unlockCode: 'ranger'
};

const progress = {
  completed: new Set(),
  parts: new Map()
};

function isActivityComplete(id) {
  return id !== undefined && progress.completed.has(id);
}

function completeActivity(id) {
  if (id === undefined || progress.completed.has(id)) return;
  progress.completed.add(id);
  updateProgressUI();
}

function isPartComplete(id, part) {
  const done = progress.parts.get(id);
  return done !== undefined && done.has(part);
}

function completePart(id, part, total) {
  if (!progress.parts.has(id)) progress.parts.set(id, new Set());
  progress.parts.get(id).add(part);
  if (progress.parts.get(id).size >= total) completeActivity(id);
}

function backDoorOpen() {
  try {
    return new URLSearchParams(window.location.search).get('ranger') === PROGRESS_SETTINGS.unlockCode;
  } catch (error) {
    return false;
  }
}

function certificateUnlocked() {
  return backDoorOpen() || progress.completed.size >= PROGRESS_SETTINGS.required;
}

function remainingToUnlock() {
  return Math.max(0, PROGRESS_SETTINGS.required - progress.completed.size);
}

function findBlockOfType(blocks, type) {
  for (const block of blocks || []) {
    if (block.type === type) return block;
    const nested = [...(block.children || []), ...(block.columns || []).flat()];
    const found = findBlockOfType(nested, type);
    if (found) return found;
  }
  return null;
}

function totalActivities() {
  for (const page of pagesJsonData) {
    const list = findBlockOfType(page.blocks, 'checklist');
    if (list) return list.items.length;
  }
  return PROGRESS_SETTINGS.required;
}

function findPageIndex(id) {
  return pagesJsonData.findIndex(page => page.id === id);
}

function showNotice(text) {
  const notice = document.getElementById('progress-notice');
  if (!notice) return;
  notice.textContent = text;
  clearTimeout(showNotice.timer);
  showNotice.timer = setTimeout(() => { notice.textContent = ''; }, 3500);
}

function updateProgressUI() {
  const checklistButton = document.getElementById('checklist-btn');
  if (checklistButton) {
    checklistButton.textContent = 'Checklist ' + progress.completed.size + ' / ' + totalActivities();
  }
  const certificateButton = document.getElementById('certificate-btn');
  if (certificateButton) {
    certificateButton.hidden = !(certificateUnlocked() && findPageIndex(PROGRESS_SETTINGS.certificatePageId) !== -1);
  }
  if (typeof refreshDynamicPages === 'function') refreshDynamicPages();
}

function createCompleteOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'maze-message maze-message-success';
  overlay.textContent = 'Great Job, Junior Ranger!';
  return overlay;
}