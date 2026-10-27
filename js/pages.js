let pagesJsonData = [];
let currentPageIndex = 0;

async function loadPages() {
  const response = await fetch('data/pages.json');
  pagesJsonData = await response.json();
  renderPage();
}

function renderPage() {
  const page = pagesJsonData[currentPageIndex];
  const container = document.getElementById('page-content');

  container.innerHTML = '';
  container.className = 'page-blocks';
  container.style.setProperty('--text-scale', page.textScale ?? 1);

  page.blocks.forEach(block => {
    const el = renderBlock(block);
    if (el) container.appendChild(el);
  });

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
    case 'click-regions':
      return renderClickRegionsBlock(block);
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
    case 'path-graph':
      return renderPathGraphBlock(block);
    case 'route-maze':
      return renderRouteMazeBlock(block);
    case 'label-diagram':
      return renderLabelDiagramBlock(block);
    default:
      console.warn('Unknown block type:', block.type);
      return null;
  }
}

document.getElementById('prev-btn').addEventListener('click', () => goToPage(currentPageIndex - 1));
document.getElementById('next-btn').addEventListener('click', () => goToPage(currentPageIndex + 1));
document.getElementById('certificate-btn').addEventListener('click', () => goToPage(findCertificatePageIndex()));

loadPages();