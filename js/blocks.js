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

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function buildGuidePoints(edge, fromNode, toNode) {
  const points = [];

  if (edge.controlPoints && edge.controlPoints.length) {
    edge.controlPoints.forEach(p => points.push(p));
  } else if (edge.cx !== undefined && edge.cy !== undefined) {
    points.push({ x: edge.cx, y: edge.cy });
  }

  return [{ x: fromNode.x, y: fromNode.y }, ...points, { x: toNode.x, y: toNode.y }];
}

function buildSegments(guidePoints) {
  const n = guidePoints.length;

  if (n === 2) {
    const [p0, p1] = guidePoints;
    return [{ start: p0, control: midpoint(p0, p1), end: p1 }];
  }

  if (n === 3) {
    return [{ start: guidePoints[0], control: guidePoints[1], end: guidePoints[2] }];
  }

  const segments = [];
  for (let i = 1; i < n - 1; i++) {
    const start = i === 1 ? guidePoints[0] : midpoint(guidePoints[i - 1], guidePoints[i]);
    const end = i === n - 2 ? guidePoints[n - 1] : midpoint(guidePoints[i], guidePoints[i + 1]);
    segments.push({ start, control: guidePoints[i], end });
  }
  return segments;
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

  let imageRatio = 1;

  function updateImageRatio() {
    if (img.naturalWidth && img.naturalHeight) {
      imageRatio = img.naturalWidth / img.naturalHeight;
    }
  }

  function getEdgesFrom(nodeId) {
    return block.edges.filter(edge => edge.from === nodeId);
  }

  function angleBetween(fromPoint, toPoint) {
    const dx = (toPoint.x - fromPoint.x) * imageRatio;
    const dy = toPoint.y - fromPoint.y;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  }

  function getArrowAngle(edge, fromNode, guidePoints) {
    if (edge.arrowRotation !== undefined) {
      return edge.arrowRotation;
    }
    return angleBetween(fromNode, guidePoints[1]);
  }

  function createArrowIcon(angleDeg, debugStyle) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.classList.add('maze-arrow-floating');
    if (debugStyle) svg.classList.add('maze-arrow-floating-debug');
    svg.style.transform = `rotate(${angleDeg}deg)`;

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'M2 12 L18 12 M12 6 L18 12 L12 18');
    svg.appendChild(path);
    return svg;
  }

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

  if (block.showAllEdges) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.classList.add('maze-debug-edges');

    block.edges.forEach(edge => {
      const from = nodesById[edge.from];
      const to = nodesById[edge.to];
      if (!from || !to) return;

      const guidePoints = buildGuidePoints(edge, from, to);
      const segments = buildSegments(guidePoints);

      segments.forEach(seg => {
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', `M ${seg.start.x} ${seg.start.y} Q ${seg.control.x} ${seg.control.y}, ${seg.end.x} ${seg.end.y}`);
        svg.appendChild(path);
      });

      guidePoints.slice(1, -1).forEach(cp => {
        const dot = document.createElementNS(svgNS, 'circle');
        dot.setAttribute('cx', cp.x);
        dot.setAttribute('cy', cp.y);
        dot.setAttribute('r', 0.6);
        dot.classList.add('maze-debug-control-dot');
        svg.appendChild(dot);
      });
    });

    wrapper.appendChild(svg);
  }

  if (block.showAllChoiceArrows) {
    block.nodes.forEach(node => {
      getEdgesFrom(node.id).forEach(edge => {
        const toNode = nodesById[edge.to];
        const guidePoints = buildGuidePoints(edge, node, toNode);
        const angle = getArrowAngle(edge, node, guidePoints);
        const posX = edge.arrowX ?? node.x;
        const posY = edge.arrowY ?? node.y;

        const marker = document.createElement('div');
        marker.className = 'maze-arrow-debug-marker';
        marker.style.left = posX + '%';
        marker.style.top = posY + '%';
        marker.title = `${edge.from} -> ${edge.to} (${edge.label || ''})`;
        marker.appendChild(createArrowIcon(angle, true));
        wrapper.appendChild(marker);
      });
    });
  }

  if (block.previewAllArrows) {
  block.nodes.forEach(node => {
    getEdgesFrom(node.id).forEach(edge => {
      const toNode = nodesById[edge.to];
      const guidePoints = buildGuidePoints(edge, node, toNode);
      const angle = getArrowAngle(edge, node, guidePoints);
      const posX = edge.arrowX ?? node.x;
      const posY = edge.arrowY ?? node.y;

      const marker = document.createElement('div');
      marker.className = 'maze-arrow-preview-marker';
      marker.style.left = posX + '%';
      marker.style.top = posY + '%';
      marker.title = `${edge.from} -> ${edge.to} (${edge.label || ''})`;
      marker.appendChild(createArrowIcon(angle, false));
      wrapper.appendChild(marker);
    });
  });
}

  const token = document.createElement('div');
  token.className = 'maze-token';
  wrapper.appendChild(token);

  const message = document.createElement('div');
  message.className = 'maze-message';
  wrapper.appendChild(message);

  let currentNodeId = block.startNode;

  function positionToken(nodeId) {
    const node = nodesById[nodeId];
    token.style.left = node.x + '%';
    token.style.top = node.y + '%';
  }

  function clearChoices() {
    wrapper.querySelectorAll('.maze-choice-btn').forEach(btn => btn.remove());
  }

  function renderChoices(nodeId) {
    clearChoices();
    const fromNode = nodesById[nodeId];

    getEdgesFrom(nodeId).forEach(edge => {
      const toNode = nodesById[edge.to];
      const guidePoints = buildGuidePoints(edge, fromNode, toNode);
      const angle = getArrowAngle(edge, fromNode, guidePoints);
      const posX = edge.arrowX ?? fromNode.x;
      const posY = edge.arrowY ?? fromNode.y;

      const btn = document.createElement('div');
      btn.className = 'maze-choice-btn';
      btn.style.left = posX + '%';
      btn.style.top = posY + '%';
      btn.title = edge.label || '';
      btn.appendChild(createArrowIcon(angle, false));
      btn.addEventListener('click', () => moveTo(edge));
      wrapper.appendChild(btn);
    });
  }

  function animateSegment(fromPoint, controlPoint, toPoint, onComplete, duration) {
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const oneMinusT = 1 - t;

      const x = oneMinusT * oneMinusT * fromPoint.x
              + 2 * oneMinusT * t * controlPoint.x
              + t * t * toPoint.x;
      const y = oneMinusT * oneMinusT * fromPoint.y
              + 2 * oneMinusT * t * controlPoint.y
              + t * t * toPoint.y;

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

  function animateAlongSegments(segments, onComplete, totalDuration = 1200) {
    const segDuration = totalDuration / segments.length;
    let index = 0;

    function runSegment() {
      const seg = segments[index];
      animateSegment(seg.start, seg.control, seg.end, () => {
        index++;
        if (index < segments.length) {
          runSegment();
        } else if (onComplete) {
          onComplete();
        }
      }, segDuration);
    }

    runSegment();
  }

  function moveTo(edge) {
    const fromNode = nodesById[currentNodeId];
    const toNode = nodesById[edge.to];
    const guidePoints = buildGuidePoints(edge, fromNode, toNode);
    const segments = buildSegments(guidePoints);

    clearChoices();
    message.textContent = '';
    message.className = 'maze-message';

    animateAlongSegments(segments, () => {
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