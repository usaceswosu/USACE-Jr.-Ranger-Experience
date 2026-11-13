let pagesJsonData = [];
let currentPageIndex = 0;
let pageFlip = null;
let certificateOpen = false;

const pageContents = [];
const pageSheets = [];

const DESIGN_WIDTH = 1200;
const SCALE_MIN_PAGE_WIDTH = 700;

const DEFAULT_LOCKED_BLOCKS = [
  { type: 'heading', text: 'Junior Ranger Certificate' },
  { type: 'unlock-notice', text: 'Complete {remaining} more {activities} to unlock your Junior Ranger Certificate.' }
];

async function loadPages() {
  const response = await fetch('data/pages.json');
  pagesJsonData = await response.json();
  buildFlipbook();
}

function isCertificatePage(page) {
  return page.id === PROGRESS_SETTINGS.certificatePageId;
}

function isPageLocked(page) {
  return isCertificatePage(page) && PROGRESS_SETTINGS.lockCertificate && !certificateUnlocked();
}

function blocksForPage(page) {
  if (isPageLocked(page)) return page.lockedBlocks || DEFAULT_LOCKED_BLOCKS;
  return page.blocks;
}

function fillPage(index) {
  const page = pagesJsonData[index];
  const content = pageContents[index];

  content.innerHTML = '';
  content.style.setProperty('--text-scale', page.textScale ?? 1);

  blocksForPage(page).forEach(block => {
    const el = renderBlock(block);
    if (el) content.appendChild(el);
  });

  if (isCertificatePage(page)) certificateOpen = !isPageLocked(page);
}

function refreshDynamicPages() {
  pagesJsonData.forEach((page, index) => {
    if (!pageContents[index]) return;
    if (findBlockOfType(page.blocks, 'checklist')) {
      fillPage(index);
    } else if (isCertificatePage(page) && (isPageLocked(page) || !certificateOpen)) {
      fillPage(index);
    }
  });
}

function renderUnlockNoticeBlock(block) {
  const remaining = remainingToUnlock();

  const wrapper = document.createElement('div');
  wrapper.className = 'block-unlock-notice';

  const count = document.createElement('div');
  count.className = 'un-count';
  count.textContent = remaining;
  wrapper.appendChild(count);

  const text = document.createElement('p');
  text.className = 'un-text';
  text.textContent = block.text
    .replace('{remaining}', remaining)
    .replace('{activities}', remaining === 1 ? 'activity' : 'activities');
  wrapper.appendChild(text);

  return wrapper;
}

function applyPageScale() {
  if (!pageFlip) return;
  const rect = pageFlip.getBoundsRect();
  const pageWidth = rect.pageWidth;
  const pageHeight = rect.height;
  const scale = pageWidth >= SCALE_MIN_PAGE_WIDTH ? Math.min(1, pageWidth / DESIGN_WIDTH) : 1;

  pageSheets.forEach(sheet => {
    sheet.style.width = (pageWidth / scale) + 'px';
    sheet.style.height = (pageHeight / scale) + 'px';
    sheet.style.transform = 'scale(' + scale + ')';
  });
}

function onSpreadShown() {
  const collection = pageFlip.getPageCollection();
  const spread = collection.getSpread()[collection.getCurrentSpreadIndex()] || [];

  currentPageIndex = spread.length ? spread[0] : 0;

  spread.forEach(index => {
    const page = pagesJsonData[index];
    if (page && page.autoTick) completeActivity(page.autoTick);
  });

  document.getElementById('prev-btn').disabled = spread.includes(0);
  document.getElementById('next-btn').disabled = spread.includes(pagesJsonData.length - 1);

  updateProgressUI();
}

function goToPage(index) {
  if (!pageFlip || index < 0 || index >= pagesJsonData.length) return;
  pageFlip.flip(index);
}

function buildFlipbook() {
  const container = document.getElementById('flipbook');
  const pageElements = [];

  pagesJsonData.forEach((page, index) => {
    const pageEl = document.createElement('div');
    pageEl.className = 'page-flip-page';

    const sheet = document.createElement('div');
    sheet.className = 'page-sheet';

    const content = document.createElement('div');
    content.className = 'page-blocks';

    sheet.appendChild(content);
    pageEl.appendChild(sheet);
    container.appendChild(pageEl);

    pageElements.push(pageEl);
    pageSheets.push(sheet);
    pageContents.push(content);
    fillPage(index);
  });

  pageFlip = new St.PageFlip(container, {
    width: 550,
    height: 711,
    size: 'stretch',
    minWidth: 550,
    maxWidth: 1000,
    minHeight: 711,
    maxHeight: 1294,
    usePortrait: true,
    showCover: true,
    useMouseEvents: false,
    showPageCorners: false,
    disableFlipByClick: true,
    flippingTime: 800
  });

  pageFlip.on('flip', onSpreadShown);
  pageFlip.on('init', () => {
    applyPageScale();
    onSpreadShown();
  });
  pageFlip.on('changeOrientation', applyPageScale);
  pageFlip.on('update', applyPageScale);

  pageFlip.loadFromHTML(pageElements);

  window.addEventListener('resize', () => requestAnimationFrame(applyPageScale));
  updateProgressUI();
}

function renderBlock(block) {
  switch (block.type) {
    case 'heading':
      return renderHeadingBlock(block);
    case 'subheading':
      return renderSubheadingBlock(block);
    case 'paragraph':
      return renderParagraphBlock(block);
    case 'image':
      return renderImageBlock(block);
    case 'checklist':
      return renderChecklistBlock(block);
    case 'click-regions':
      return renderClickRegionsBlock(block);
    case 'match-chain':
      return renderMatchChainBlock(block);
    case 'columns':
      return renderColumnsBlock(block);
    case 'text-input':
      return renderTextInputBlock(block);
    case 'letter-fill':
      return renderLetterFillBlock(block);
    case 'true-false':
      return renderTrueFalseBlock(block);
    case 'text-with-image':
      return renderTextWithImageBlock(block);
    case 'float-wrap':
      return renderFloatWrapBlock(block);
    case 'path-graph':
      return renderPathGraphBlock(block);
    case 'route-maze':
      return renderRouteMazeBlock(block);
    case 'label-diagram':
      return renderLabelDiagramBlock(block);
    case 'fact-nest':
      return renderFactNestBlock(block);
    case 'certificate':
      return renderCertificateBlock(block);
    case 'speech-bubble':
      return renderSpeechBubbleBlock(block);
    case 'unlock-notice':
      return renderUnlockNoticeBlock(block);
    default:
      console.warn('Unknown block type:', block.type);
      return null;
  }
}

document.getElementById('prev-btn').addEventListener('click', () => { if (pageFlip) pageFlip.flipPrev(); });
document.getElementById('next-btn').addEventListener('click', () => { if (pageFlip) pageFlip.flipNext(); });
document.getElementById('checklist-btn').addEventListener('click', () => goToPage(findPageIndex('checklist')));
document.getElementById('certificate-btn').addEventListener('click', () => goToPage(findPageIndex(PROGRESS_SETTINGS.certificatePageId)));

loadPages();
