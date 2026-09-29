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
  const bulletStart = block.bulletStartIndex ?? Infinity;

  block.paragraphs.forEach((text, index) => {
    let line;

    if (block.bulletIcon && index >= bulletStart) {
      line = document.createElement('div');
      line.className = 'bullet-line';

      const bulletImg = document.createElement('img');
      bulletImg.src = block.bulletIcon;
      bulletImg.className = 'bullet-icon';
      line.appendChild(bulletImg);

      const span = document.createElement('span');
      span.textContent = text;
      line.appendChild(span);
    } else {
      line = document.createElement('p');
      line.textContent = text;
    }

    wrapper.appendChild(line);

    if (index === insertAfter) {
      wrapper.appendChild(img);
    }
  });

  if (insertAfter === -1) {
    wrapper.insertBefore(img, wrapper.children[block.heading ? 1 : 0]);
  }

  return wrapper;
}

function renderPathGraphBlock(block) {
  const wrapper = document.createElement('div');
  wrapper.className = 'block-path-graph';

  const img = document.createElement('img');
  img.src = block.image;
  img.className = 'path-graph-img';
  wrapper.appendChild(img);

  const nodesById = {};
  block.nodes.forEach(node => { nodesById[node.id] = node; });

  if (block.showAllNodes) {
    block.nodes.forEach(node => {
      const marker = document.createElement('div');
      marker.className = 'maze-debug-node';
      marker.style.left = node.x + '%';
      marker.style.top = node.y + '%';
      marker.title = node.id;
      wrapper.appendChild(marker);
    });
  }

  const token = document.createElement('div');
  token.className = 'maze-token';
  wrapper.appendChild(token);

  const message = document.createElement('div');
  message.className = 'maze-message';
  wrapper.appendChild(message);

  let currentNodeId = block.startNode;
  let imageRatio = 1;

  function updateImageRatio() {
    if (img.naturalWidth && img.naturalHeight) {
      imageRatio = img.naturalWidth / img.naturalHeight;
    }
  }

  function getEdgesFrom(nodeId) {
    return block.edges.filter(edge => edge.from === nodeId);
  }

  function positionToken(nodeId) {
    const node = nodesById[nodeId];
    token.style.left = node.x + '%';
    token.style.top = node.y + '%';
  }

  function angleBetween(fromNode, toNode) {
    const dx = (toNode.x - fromNode.x) * imageRatio;
    const dy = toNode.y - fromNode.y;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  }

  function createArrowIcon(angleDeg) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.classList.add('maze-arrow-icon');
    svg.style.transform = `rotate(${angleDeg}deg)`;

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'M2 12 L18 12 M12 6 L18 12 L12 18');
    svg.appendChild(path);
    return svg;
  }

  function clearChoices() {
    wrapper.querySelectorAll('.maze-choice-btn').forEach(btn => btn.remove());
  }

  function renderChoices(nodeId) {
    clearChoices();
    const fromNode = nodesById[nodeId];

    getEdgesFrom(nodeId).forEach(edge => {
      const target = nodesById[edge.to];
      const angle = angleBetween(fromNode, target);

      const btn = document.createElement('button');
      btn.className = 'maze-choice-btn';
      btn.style.left = target.x + '%';
      btn.style.top = target.y + '%';
      btn.title = edge.label || '';
      btn.appendChild(createArrowIcon(angle));
      btn.addEventListener('click', () => moveTo(edge));
      wrapper.appendChild(btn);
    });
  }

  function animateTokenTo(fromNode, toNode, controlNode, onComplete, duration = 1000) {
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const oneMinusT = 1 - t;

      const x = oneMinusT * oneMinusT * fromNode.x
              + 2 * oneMinusT * t * controlNode.x
              + t * t * toNode.x;
      const y = oneMinusT * oneMinusT * fromNode.y
              + 2 * oneMinusT * t * controlNode.y
              + t * t * toNode.y;

      token.style.left = x + '%';
      token.style.top = y + '%';

      if (t < 1) {
        requestAnimationFrame(step);
      } else if (onComplete) {
        onComplete();
      }
    }

    requestAnimationFrame(step);
  }

  function moveTo(edge) {
    const fromNode = nodesById[currentNodeId];
    const toNode = nodesById[edge.to];
    const controlNode = {
      x: edge.cx ?? (fromNode.x + toNode.x) / 2,
      y: edge.cy ?? (fromNode.y + toNode.y) / 2
    };

    clearChoices();
    message.textContent = '';
    message.className = 'maze-message';

    animateTokenTo(fromNode, toNode, controlNode, () => {
      currentNodeId = edge.to;

      if (toNode.finish) {
        message.textContent = 'Great Job, Junior Ranger!';
        message.className = 'maze-message maze-message-success';
        return;
      }

      renderChoices(edge.to);
    });
  }

  function init() {
    updateImageRatio();
    positionToken(currentNodeId);
    renderChoices(currentNodeId);
  }

  if (img.complete) {
    init();
  } else {
    img.addEventListener('load', init);
  }

  return wrapper;
}