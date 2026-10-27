const answerStore = {};

function renderHeadingBlock(block) {
  const h2 = document.createElement('h2');
  h2.textContent = block.text;
  h2.className = 'block-heading';
  return h2;
}

function renderSubheadingBlock(block) {
  const h3 = document.createElement('h3');
  h3.textContent = block.text;
  h3.className = 'block-subheading';
  return h3;
}

function renderParagraphBlock(block) {
  const p = document.createElement('p');
  p.className = 'block-paragraph';

  if (block.lead) {
    const strong = document.createElement('strong');
    strong.textContent = block.lead + ' ';
    p.appendChild(strong);
  }

  appendTextWithLinks(p, block.text, block.links || []);
  return p;
}

function appendTextWithLinks(parent, text, links) {
  let rest = text;

  links.forEach(link => {
    const index = rest.indexOf(link.text);
    if (index === -1) return;

    parent.appendChild(document.createTextNode(rest.slice(0, index)));

    const a = document.createElement('a');
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';

    const strong = document.createElement('strong');
    strong.textContent = link.text;
    a.appendChild(strong);

    parent.appendChild(a);
    rest = rest.slice(index + link.text.length);
  });

  parent.appendChild(document.createTextNode(rest));
}

function renderImageBlock(block) {
  const img = document.createElement('img');
  img.src = block.src;
  img.className = 'block-image';
  return img;
}

function createFeedbackMark(isCorrect) {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('class', 'feedback-mark ' + (isCorrect ? 'feedback-check' : 'feedback-x'));
  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', isCorrect ? 'M12 54 L38 80 L88 22' : 'M16 16 L84 84 M84 16 L16 84');
  svg.appendChild(path);
  return svg;
}

function renderClickRegionsBlock(block) {
  const wrapper = document.createElement('div');
  wrapper.className = 'block-click-regions';

  const useMarks = block.feedback === 'marks';
  const placed = new Map();
  const correctHotspots = new Set();
  const totalCorrect = block.targets.filter(t => t.correct === true).length;
  const canWin = block.activityId !== undefined && totalCorrect > 0;
  const isParted = block.parts !== undefined;
  let wrongPicks = 0;
  let locked = false;

  if (block.hideTargets) { wrapper.classList.add('targets-hidden'); }
  if (block.shape === 'ellipse') { wrapper.classList.add('shape-ellipse'); }

  const img = document.createElement('img');
  img.src = block.image;
  img.className = 'click-regions-img';
  wrapper.appendChild(img);

  function correctFound() {
    let count = 0;
    if (useMarks) {
      placed.forEach((mark, hotspot) => { if (correctHotspots.has(hotspot)) count++; });
    } else {
      correctHotspots.forEach(hotspot => { if (hotspot.classList.contains('circled')) count++; });
    }
    return count;
  }

  function alreadyDone() {
    return isParted ? isPartComplete(block.activityId, block.part) : isActivityComplete(block.activityId);
  }

  function recordWin() {
    if (isParted) {
      completePart(block.activityId, block.part, block.parts);
    } else {
      completeActivity(block.activityId);
    }
  }

  function showWin() {
    locked = true;
    wrapper.appendChild(createCompleteOverlay());
  }

  function winActivity() {
    locked = true;
    recordWin();
    setTimeout(showWin, 900);
  }

  function resetSelections() {
    locked = true;
    placed.forEach(mark => mark.classList.add('feedback-flashing'));
    setTimeout(() => {
      placed.forEach(mark => mark.remove());
      placed.clear();
      wrongPicks = 0;
      locked = false;
    }, 1500);
  }

  block.targets.forEach(target => {
    const hotspot = document.createElement('div');
    hotspot.className = 'hotspot';
    hotspot.style.left = target.x + '%';
    hotspot.style.top = target.y + '%';
    hotspot.style.width = target.width + '%';
    hotspot.style.height = target.height + '%';
    if (target.rotation) { hotspot.style.transform = `rotate(${target.rotation}deg)`; }
    if (target.correct === true) { correctHotspots.add(hotspot); }

    hotspot.addEventListener('click', () => {
      if (locked) return;

      if (!useMarks) {
        hotspot.classList.toggle('circled');
        if (canWin && correctFound() === totalCorrect) { winActivity(); }
        return;
      }

      if (placed.has(hotspot)) {
        placed.get(hotspot).remove();
        placed.delete(hotspot);
        return;
      }

      const isCorrect = target.correct === true;
      const mark = createFeedbackMark(isCorrect);
      mark.style.left = (target.x + target.width / 2) + '%';
      mark.style.top = (target.y + target.height / 2) + '%';
      wrapper.appendChild(mark);
      placed.set(hotspot, mark);

      if (!isCorrect) {
        wrongPicks++;
        if (block.maxWrong !== undefined && wrongPicks > block.maxWrong) { resetSelections(); }
        return;
      }

      if (canWin && correctFound() === totalCorrect) { winActivity(); }
    });

    wrapper.appendChild(hotspot);
  });

  if (canWin && alreadyDone()) { showWin(); }

  return wrapper;
}

function renderTrueFalseBlock(block) {
  const wrapper = document.createElement('div');
  wrapper.className = 'block-true-false';

  const header = document.createElement('div');
  header.className = 'tf-header';

  const heading = document.createElement('h2');
  heading.textContent = block.heading;
  heading.className = 'tf-heading';
  header.appendChild(heading);

  if (block.columnLabel) {
    const label = document.createElement('div');
    label.className = 'tf-column-label';
    label.textContent = block.columnLabel;
    header.appendChild(label);
  }

  wrapper.appendChild(header);

  const rows = [];
  const canWin = block.activityId !== undefined;

  function allCorrect() {
    return rows.every(r => (r.answer ? r.trueBox.checked : r.falseBox.checked));
  }

  function lockAll() {
    rows.forEach(r => {
      r.trueBox.disabled = true;
      r.falseBox.disabled = true;
    });
  }

  function showWin() {
    lockAll();
    wrapper.appendChild(createCompleteOverlay());
  }

  function checkWin() {
    if (!canWin || !allCorrect()) return;
    lockAll();
    completeActivity(block.activityId);
    setTimeout(showWin, 600);
  }

  block.questions.forEach((q, index) => {
    const row = document.createElement('div');
    row.className = 'tf-row';

    const number = document.createElement('div');
    number.className = 'tf-number';
    number.textContent = index + 1;
    row.appendChild(number);

    const text = document.createElement('div');
    text.className = 'tf-text';
    text.textContent = q.text;
    row.appendChild(text);

    const choices = document.createElement('div');
    choices.className = 'tf-choices';

    const trueBox = document.createElement('input');
    trueBox.type = 'checkbox';
    trueBox.className = 'tf-checkbox';

    const falseBox = document.createElement('input');
    falseBox.type = 'checkbox';
    falseBox.className = 'tf-checkbox';

    trueBox.addEventListener('change', () => {
      if (trueBox.checked) falseBox.checked = false;
      checkWin();
    });
    falseBox.addEventListener('change', () => {
      if (falseBox.checked) trueBox.checked = false;
      checkWin();
    });

    rows.push({ trueBox, falseBox, answer: q.answer });

    choices.appendChild(trueBox);
    choices.appendChild(falseBox);
    row.appendChild(choices);

    wrapper.appendChild(row);
  });

  if (canWin && isActivityComplete(block.activityId)) {
    rows.forEach(r => {
      r.trueBox.checked = r.answer;
      r.falseBox.checked = !r.answer;
    });
    showWin();
  }

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
        completeActivity(block.activityId);
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

function renderColumnsBlock(block) {
  const row = document.createElement('div');
  row.className = 'block-columns';

  block.columns.forEach((columnBlocks, index) => {
    const col = document.createElement('div');
    col.className = 'block-column';

    const weight = block.weights ? block.weights[index] : 1;
    col.style.flex = `${weight} 1 0%`;

    columnBlocks.forEach(child => {
      const el = renderBlock(child);
      if (el) col.appendChild(el);
    });

    row.appendChild(col);
  });

  return row;
}

function renderTextInputBlock(block) {
  const wrapper = document.createElement('div');
  wrapper.className = 'block-text-input';

  const prompt = document.createElement('p');
  prompt.className = 'block-paragraph';
  prompt.textContent = block.prompt;
  wrapper.appendChild(prompt);

  let field;
  if (block.rows && block.rows > 1) {
    field = document.createElement('textarea');
    field.rows = block.rows;
  } else {
    field = document.createElement('input');
    field.type = 'text';
  }
  field.className = 'ti-field';

  if (block.id) {
    if (answerStore[block.id] !== undefined) {
      field.value = answerStore[block.id];
    }
    field.addEventListener('input', () => {
      answerStore[block.id] = field.value;
    });
  }

  wrapper.appendChild(field);

  return wrapper;
}

function checkWord(wordEl, inputs) {
  const filled = inputs.every(input => input.value !== '');
  const correct = inputs.every(input => input.value === input.dataset.answer);
  wordEl.classList.toggle('lf-correct', filled && correct);
  wordEl.classList.toggle('lf-wrong', filled && !correct);
}

function renderLetterFillBlock(block) {
  const wrapper = document.createElement('div');
  wrapper.className = 'block-letter-fill';

  if (block.prompt) {
    const prompt = document.createElement('p');
    prompt.className = 'block-paragraph';
    prompt.textContent = block.prompt;
    wrapper.appendChild(prompt);
  }

  const wordsRow = document.createElement('div');
  wordsRow.className = 'lf-words';
  const allInputs = [];
  const canWin = block.activityId !== undefined;

  function allCorrect() {
    return allInputs.every(input => input.value === input.dataset.answer);
  }

  function showWin() {
    allInputs.forEach(input => { input.disabled = true; });
    wrapper.appendChild(createCompleteOverlay());
  }

  function checkWin() {
    if (!canWin || !allCorrect()) return;
    allInputs.forEach(input => { input.disabled = true; });
    completeActivity(block.activityId);
    setTimeout(showWin, 700);
  }

  block.words.forEach(word => {
    const wordEl = document.createElement('div');
    wordEl.className = 'lf-word';
    const wordInputs = [];

    for (let i = 0; i < word.pattern.length; i++) {
      const ch = word.pattern[i];

      if (ch === '_') {
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 1;
        input.className = 'lf-input';
        input.dataset.answer = word.answer[i].toUpperCase();
        wordInputs.push(input);
        allInputs.push(input);
        wordEl.appendChild(input);
      } else if (ch === ' ') {
        const gap = document.createElement('span');
        gap.className = 'lf-gap';
        wordEl.appendChild(gap);
      } else {
        const letter = document.createElement('span');
        letter.className = 'lf-letter';
        letter.textContent = ch;
        wordEl.appendChild(letter);
      }
    }

    wordInputs.forEach(input => {
      input.addEventListener('input', () => {
        input.value = input.value.toUpperCase();
        const index = allInputs.indexOf(input);
        if (input.value && allInputs[index + 1]) allInputs[index + 1].focus();
        checkWord(wordEl, wordInputs);
        checkWin();
      });

      input.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !input.value) {
          const index = allInputs.indexOf(input);
          if (allInputs[index - 1]) allInputs[index - 1].focus();
        }
      });
    });

    wordsRow.appendChild(wordEl);
  });

  wrapper.appendChild(wordsRow);

  if (canWin && isActivityComplete(block.activityId)) {
    allInputs.forEach(input => { input.value = input.dataset.answer; });
    wordsRow.querySelectorAll('.lf-word').forEach(el => el.classList.add('lf-correct'));
    showWin();
  }

  return wrapper;
}

function polygonCentroid(points) {
  let x = 0;
  let y = 0;
  points.forEach(p => {
    x += p[0];
    y += p[1];
  });
  return [x / points.length, y / points.length];
}

function renderRouteMazeBlock(block) {
  const svgNS = 'http://www.w3.org/2000/svg';
  const speed = block.speed || 40;

  const wrapper = document.createElement('div');
  wrapper.className = 'block-route-maze';

  const img = document.createElement('img');
  img.src = block.image;
  img.className = 'route-maze-img';
  wrapper.appendChild(img);

  const overlay = document.createElementNS(svgNS, 'svg');
  overlay.setAttribute('viewBox', '0 0 100 100');
  overlay.setAttribute('preserveAspectRatio', 'none');
  overlay.classList.add('route-maze-overlay');
  wrapper.appendChild(overlay);

  const token = document.createElement('div');
  token.className = 'maze-token';
  wrapper.appendChild(token);

  const ring = document.createElement('div');
  ring.className = 'maze-stop-ring';
  wrapper.appendChild(ring);

  const message = document.createElement('div');
  message.className = 'maze-message';
  wrapper.appendChild(message);

  const questions = {};
  block.questions.forEach(q => { questions[q.id] = q; });

  function placeToken(point) {
    token.style.left = point[0] + '%';
    token.style.top = point[1] + '%';
  }

  function clearArrows() {
    while (overlay.firstChild) overlay.removeChild(overlay.firstChild);
  }

  function showArrows(questionId) {
    clearArrows();
    const question = questions[questionId];

    question.answers.forEach(answer => {
      const pointsAttr = answer.arrow.map(p => p[0] + ',' + p[1]).join(' ');

      const group = document.createElementNS(svgNS, 'g');
      group.classList.add('rm-arrow');

      const shape = document.createElementNS(svgNS, 'polygon');
      shape.setAttribute('points', pointsAttr);
      shape.classList.add('rm-arrow-shape');
      group.appendChild(shape);

      const hit = document.createElementNS(svgNS, 'polygon');
      hit.setAttribute('points', pointsAttr);
      hit.classList.add('rm-arrow-hit');
      group.appendChild(hit);

      group.addEventListener('click', () => choose(question, answer));
      overlay.appendChild(group);
    });
  }

  function travelAlong(points, onDone) {
    const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
    const lengths = [];
    let total = 0;

    for (let i = 1; i < points.length; i++) {
      const dx = points[i][0] - points[i - 1][0];
      const dy = (points[i][1] - points[i - 1][1]) / ratio;
      const length = Math.hypot(dx, dy);
      lengths.push(length);
      total += length;
    }

    if (total === 0) {
      onDone();
      return;
    }

    const duration = (total / speed) * 1000;
    const startTime = performance.now();

    function step(now) {
      const t = Math.min((now - startTime) / duration, 1);
      let remaining = t * total;
      let i = 0;

      while (i < lengths.length - 1 && remaining > lengths[i]) {
        remaining -= lengths[i];
        i++;
      }

      const f = lengths[i] === 0 ? 1 : Math.min(remaining / lengths[i], 1);
      placeToken([
        points[i][0] + (points[i + 1][0] - points[i][0]) * f,
        points[i][1] + (points[i + 1][1] - points[i][1]) * f
      ]);

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        onDone();
      }
    }

    requestAnimationFrame(step);
  }

  function showSuccess() {
    message.textContent = 'Great Job, Junior Ranger!';
    message.className = 'maze-message maze-message-success';
    completeActivity(block.activityId);
  }

  function choose(question, answer) {
    clearArrows();
    const outbound = [question.hub, polygonCentroid(answer.arrow), ...answer.route];

    if (answer.correct) {
      const trip = answer.next === 'finish' ? outbound : [...outbound, questions[answer.next].hub];
      travelAlong(trip, () => {
        if (answer.next === 'finish') {
          showSuccess();
        } else {
          showArrows(answer.next);
        }
      });
      return;
    }

    travelAlong(outbound, () => {
      const end = outbound[outbound.length - 1];
      ring.style.left = end[0] + '%';
      ring.style.top = end[1] + '%';
      ring.classList.remove('maze-stop-ring-active');
      void ring.offsetWidth;
      ring.classList.add('maze-stop-ring-active');

      setTimeout(() => {
        travelAlong([...outbound].reverse(), () => showArrows(question.id));
      }, 1200);
    });
  }

   placeToken(questions[block.start].hub);

  if (isActivityComplete(block.activityId)) {
    showSuccess();
  } else {
    showArrows(block.start);
  }

  return wrapper;
}

function normalizeAnswer(text) {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

function renderLabelDiagramBlock(block) {
  const svgNS = 'http://www.w3.org/2000/svg';
  const wrapper = document.createElement('div');
  wrapper.className = 'block-label-diagram';

  const img = document.createElement('img');
  img.src = block.image;
  img.className = 'label-diagram-img';
  wrapper.appendChild(img);

  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.classList.add('label-diagram-lines');
  (block.lines || []).forEach(line => {
    const el = document.createElementNS(svgNS, 'line');
    el.setAttribute('x1', line[0]);
    el.setAttribute('y1', line[1]);
    el.setAttribute('x2', line[2]);
    el.setAttribute('y2', line[3]);
    svg.appendChild(el);
  });
  wrapper.appendChild(svg);

  (block.notes || []).forEach(note => {
    const el = document.createElement('p');
    el.className = 'label-diagram-note';
    el.style.left = note.x + '%';
    el.style.top = note.y + '%';
    el.style.width = note.width + '%';
    el.textContent = note.text;
    wrapper.appendChild(el);
  });

  const canWin = block.activityId !== undefined;
  const entries = [];

  function storeKey(field) {
    return block.activityId + ':' + field.id;
  }

  function isCorrect(entry) {
    const typed = normalizeAnswer(entry.input.value);
    return entry.field.answers.some(answer => normalizeAnswer(answer) === typed);
  }

  function lockAll() {
    entries.forEach(entry => { entry.input.disabled = true; });
  }

  function showWin() {
    lockAll();
    wrapper.appendChild(createCompleteOverlay());
  }

  function refresh(entry) {
    const correct = isCorrect(entry);
    entry.box.classList.toggle('ld-correct', correct);
    if (correct) entry.box.classList.remove('ld-wrong');
  }

  function checkWin() {
    if (!canWin || !entries.every(isCorrect)) return;
    lockAll();
    completeActivity(block.activityId);
    setTimeout(showWin, 700);
  }

  block.fields.forEach(field => {
    const box = document.createElement('label');
    box.className = 'label-diagram-field' + (field.align === 'center' ? ' ld-centered' : '');
    box.style.left = field.x + '%';
    box.style.top = field.y + '%';
    box.style.width = field.width + '%';
    box.style.height = field.height + '%';

    if (field.prefix) {
      const prefix = document.createElement('span');
      prefix.className = field.letter ? 'ld-letter' : 'ld-text';
      prefix.textContent = field.prefix;
      box.appendChild(prefix);
    }

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'ld-input';
    input.autocomplete = 'off';
    input.spellcheck = false;
    if (field.inputWidth) input.style.width = field.inputWidth + 'cqw';
    box.appendChild(input);

    if (field.suffix) {
      const suffix = document.createElement('span');
      suffix.className = 'ld-text';
      suffix.textContent = field.suffix;
      box.appendChild(suffix);
    }

    const entry = { field, box, input };
    entries.push(entry);

    const saved = answerStore[storeKey(field)];
    if (saved !== undefined) input.value = saved;

    input.addEventListener('input', () => {
      answerStore[storeKey(field)] = input.value;
      box.classList.remove('ld-wrong');
      refresh(entry);
      checkWin();
    });

    input.addEventListener('blur', () => {
      if (input.value.trim() !== '' && !isCorrect(entry)) box.classList.add('ld-wrong');
    });

    wrapper.appendChild(box);
  });

  if (canWin && isActivityComplete(block.activityId)) {
    entries.forEach(entry => { entry.input.value = entry.field.answers[0]; });
    showWin();
  }

  entries.forEach(refresh);

  return wrapper;
}