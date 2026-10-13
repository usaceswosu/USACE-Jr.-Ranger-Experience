let pagesJsonData = [];
let currentPageIndex = 0;
const completedActivities = new Set();
const activityDescriptions = {
  'click-regions': 'Find the gear for a kayak trip',
  'path-graph': 'Navigate the bicycle safety maze',
  'true-false': 'Take the USACE history quiz'
};

const activityBlockTypes = new Set(['click-regions', 'true-false', 'path-graph']);

async function loadPages() {
  const response = await fetch('data/pages.json');
  const sourcePages = await response.json();
  const contentPages = sourcePages.flatMap(page => {
    const textBlocks = page.blocks.filter(block => !activityBlockTypes.has(block.type));
    const activityBlocks = page.blocks.filter(block => activityBlockTypes.has(block.type));
    const titleBlock = textBlocks.find(block => block.heading || block.text);
    const title = titleBlock?.heading || titleBlock?.text || `Page ${page.page}`;

    return [
      ...(textBlocks.length ? [{ ...page, blocks: textBlocks, section: 'Text', title }] : []),
      ...(activityBlocks.length ? [{ ...page, blocks: activityBlocks, section: 'Activity', title }] : [])
    ];
  });
  const activityPages = contentPages.filter(page => page.section === 'Activity');
  pagesJsonData = [
    {
      section: 'Contents',
      title: 'Choose an activity',
      activities: activityPages.map(page => ({
        id: `activity-${page.page}`,
        pageIndex: contentPages.indexOf(page) + 1,
        title: page.title.replace(/^History of the /, ''),
        description: activityDescriptions[page.blocks[0].type],
        image: page.blocks[0].image
          || page.blocks[0].src
          || sourcePages.find(sourcePage => sourcePage.page === page.page)
            ?.blocks.find(block => block.image)?.image,
        imageAlt: `${page.title} activity`
      }))
    },
    ...contentPages
  ];
  renderPage();
}

function renderPage() {
  const page = pagesJsonData[currentPageIndex];
  const container = document.getElementById('page-content');
  const indicator = document.getElementById('page-indicator');
  const pageContainer = document.getElementById('page-container');
  const previousButton = document.getElementById('prev-btn');
  const nextButton = document.getElementById('next-btn');

  container.innerHTML = '';
  container.className = `page-blocks page-${page.section.toLowerCase()}`;
  container.style.setProperty('--text-scale', page.textScale ?? 1);
  if (pageContainer) {
    pageContainer.classList.toggle('activity-page', page.section !== 'Text');
  }

  const label = document.createElement('div');
  label.className = 'page-type-label';
  label.textContent = `${page.section} · ${page.title}`;
  container.appendChild(label);

  if (page.section === 'Contents') {
    container.appendChild(renderContentsPage(page.activities));
  } else {
    page.blocks.forEach(block => {
      const el = renderBlock(block);
      if (el) container.appendChild(el);
    });
  }

  indicator.textContent = `${currentPageIndex + 1} / ${pagesJsonData.length}`;
  previousButton.disabled = currentPageIndex === 0;
  nextButton.disabled = currentPageIndex === pagesJsonData.length - 1;
  document.getElementById('contents-btn').disabled = currentPageIndex === 0;
}

function renderContentsPage(activities) {
  const wrapper = document.createElement('div');
  wrapper.className = 'contents-page';

  const introduction = document.createElement('p');
  introduction.className = 'contents-intro';
  introduction.textContent = 'Choose a picture to jump to an activity. Check it off when you finish.';
  wrapper.appendChild(introduction);

  const grid = document.createElement('div');
  grid.className = 'activity-card-grid';

  activities.forEach(activity => {
    const card = document.createElement('article');
    card.className = 'activity-card';

    const link = document.createElement('a');
    link.className = 'activity-card-link';
    link.href = '#';
    link.setAttribute('aria-label', `Open activity: ${activity.title}`);
    link.addEventListener('click', event => {
      event.preventDefault();
      currentPageIndex = activity.pageIndex;
      renderPage();
    });

    const image = document.createElement('img');
    image.className = 'activity-card-image';
    image.src = activity.image;
    image.alt = activity.imageAlt;
    link.appendChild(image);

    const title = document.createElement('h2');
    title.className = 'activity-card-title';
    title.textContent = activity.title;
    link.appendChild(title);

    const description = document.createElement('p');
    description.className = 'activity-card-description';
    description.textContent = activity.description;
    link.appendChild(description);
    card.appendChild(link);

    const progressLabel = document.createElement('label');
    progressLabel.className = 'activity-completion';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = completedActivities.has(activity.id);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        completedActivities.add(activity.id);
      } else {
        completedActivities.delete(activity.id);
      }
    });
    progressLabel.append(checkbox, document.createTextNode('Completed'));
    card.appendChild(progressLabel);
    grid.appendChild(card);
  });

  wrapper.appendChild(grid);
  return wrapper;
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

document.getElementById('contents-btn').addEventListener('click', () => {
  currentPageIndex = 0;
  renderPage();
});

loadPages();