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

  page.blocks.forEach(block => {
    const el = renderBlock(block);
    if (el) container.appendChild(el);
  });
}

function renderBlock(block) {
  switch (block.type) {
    case 'heading':
      return renderHeadingBlock(block);
    case 'paragraph':
      return renderParagraphBlock(block);
    case 'image':
      return renderImageBlock(block);
    case 'click-regions':
      return renderClickRegionsBlock(block);
    case 'text-with-image':
      return renderTextWithImageBlock(block);
    default:
      console.warn('Unknown block type:', block.type);
      return null;
  }
}

document.getElementById('next-btn').addEventListener('click', () => {
  if (currentPageIndex < pagesJsonData.length - 1) {
    currentPageIndex++;
    renderPage();
  }
});

document.getElementById('prev-btn').addEventListener('click', () => {
  if (currentPageIndex > 0) {
    currentPageIndex--;
    renderPage();
  }
});

loadPages();