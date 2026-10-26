const PROGRESS_SETTINGS = {
  required: 7,
  lockCertificate: false,
  certificatePageId: 'certificate'
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

function certificateUnlocked() {
  return progress.completed.size >= PROGRESS_SETTINGS.required;
}

function findCertificatePageIndex() {
  return pagesJsonData.findIndex(page => page.id === PROGRESS_SETTINGS.certificatePageId);
}

function canVisitPage(index) {
  if (!PROGRESS_SETTINGS.lockCertificate) return true;
  if (index !== findCertificatePageIndex()) return true;
  return certificateUnlocked();
}

function showNotice(text) {
  const notice = document.getElementById('progress-notice');
  if (!notice) return;
  notice.textContent = text;
  clearTimeout(showNotice.timer);
  showNotice.timer = setTimeout(() => { notice.textContent = ''; }, 3500);
}

function showLockedNotice() {
  const remaining = PROGRESS_SETTINGS.required - progress.completed.size;
  showNotice('Complete ' + remaining + ' more ' + (remaining === 1 ? 'activity' : 'activities') + ' to unlock your certificate.');
}

function updateProgressUI() {
  const counter = document.getElementById('progress-counter');
  if (counter) {
    counter.textContent = 'Activities: ' + progress.completed.size + ' / ' + PROGRESS_SETTINGS.required;
  }
  const button = document.getElementById('certificate-btn');
  if (button) {
    button.hidden = !(certificateUnlocked() && findCertificatePageIndex() !== -1);
  }
}

function createCompleteOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'maze-message maze-message-success';
  overlay.textContent = 'Great Job, Junior Ranger!';
  return overlay;
}

function goToPage(index) {
  if (index < 0 || index >= pagesJsonData.length) return;
  if (!canVisitPage(index)) {
    showLockedNotice();
    return;
  }
  currentPageIndex = index;
  renderPage();
}