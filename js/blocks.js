function renderHeadingBlock(block) {
  const h2 = document.createElement('h2');
  h2.textContent = block.text;
  h2.className = 'block-heading';
  return h2;
}

function renderParagraphBlock(block) {
  const p = document.createElement('p');
  p.textContent = block.text;
  p.className = 'block-paragraph';
  return p;
}

function renderImageBlock(block) {
  const img = document.createElement('img');
  img.src = block.src;
  img.className = 'block-image';
  return img;
}

function renderClickRegionsBlock(block) {
  const wrapper = document.createElement('div');
  wrapper.className = 'block-click-regions';

  const img = document.createElement('img');
  img.src = block.image;
  img.className = 'click-regions-img';
  wrapper.appendChild(img);

  block.targets.forEach(target => {
    const hotspot = document.createElement('div');
    hotspot.className = 'hotspot';
    hotspot.style.left = target.x + '%';
    hotspot.style.top = target.y + '%';
    hotspot.style.width = target.width + '%';
    hotspot.style.height = target.height + '%';

    hotspot.addEventListener('click', () => {
      hotspot.classList.toggle('circled');
    });

    wrapper.appendChild(hotspot);
  });

  return wrapper;
}

function renderTextWithImageBlock(block) {
  const wrapper = document.createElement('div');
  wrapper.className = 'block-text-image';

  if (block.heading) {
    const h2 = document.createElement('h2');
    h2.textContent = block.heading;
    wrapper.appendChild(h2);
  }

  const img = document.createElement('img');
  img.src = block.image;
  img.className = block.imagePosition === 'left' ? 'flow-image flow-left' : 'flow-image flow-right';

  const insertAfter = block.imageAfterParagraph ?? -1;

  block.paragraphs.forEach((text, index) => {
    const p = document.createElement('p');
    p.textContent = text;
    wrapper.appendChild(p);

    if (index === insertAfter) {
      wrapper.appendChild(img);
    }
  });

  if (insertAfter === -1) {
    wrapper.insertBefore(img, wrapper.children[block.heading ? 1 : 0]);
  }

  return wrapper;
}