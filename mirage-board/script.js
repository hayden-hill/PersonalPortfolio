(function () {
  const svg = document.getElementById('board');
  const nodesGroup = document.getElementById('nodes');
  const tokenShelf = document.getElementById('token-shelf');
  const resetBtn = document.getElementById('resetBtn');
  const snapToggle = document.getElementById('snapToggle');

  /**
   * Utility: parse the current translate() from a <g transform> attribute.
   */
  function parseTranslate(transformStr) {
    const match = /translate\(([-0-9.]+),\s*([-0-9.]+)\)/.exec(transformStr || '');
    if (!match) return { x: 0, y: 0 };
    return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
  }

  function setTranslate(el, x, y) {
    el.setAttribute('transform', `translate(${x},${y})`);
  }

  function getSvgPoint(evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const ctm = svg.getScreenCTM();
    return pt.matrixTransform(ctm.inverse());
  }

  function getNodeCenters() {
    const centers = [];
    nodesGroup.querySelectorAll('.node').forEach(node => {
      const id = node.getAttribute('data-id');
      const { x, y } = parseTranslate(node.getAttribute('transform'));
      centers.push({ id, x, y, el: node });
    });
    return centers;
  }

  function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function nearestNode(point) {
    const centers = getNodeCenters();
    let nearest = null;
    let nearestDist = Infinity;
    centers.forEach(c => {
      const d = distance(point, c);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = c;
      }
    });
    return nearest;
  }

  function createDraggableToken(protoToken) {
    const color = protoToken.getAttribute('data-color') || '#ff6b6b';
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('token');
    group.setAttribute('data-color', color);

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', '16');
    circle.setAttribute('fill', color);
    circle.setAttribute('stroke', '#1e272e');
    circle.setAttribute('stroke-width', '2');

    const label = protoToken.querySelector('.token-text')?.textContent || '';
    const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textEl.setAttribute('x', '0');
    textEl.setAttribute('y', '5');
    textEl.setAttribute('class', 'token-text');
    textEl.textContent = label;

    group.appendChild(circle);
    group.appendChild(textEl);

    // Start in shelf area stacked to the right of prototypes
    const base = parseTranslate(tokenShelf.getAttribute('transform'));
    const initialX = base.x + 100 + Math.random() * 40;
    const initialY = base.y + 40 + Math.random() * 200;
    setTranslate(group, initialX, initialY);

    svg.appendChild(group);
    makeGroupDraggable(group);
    return group;
  }

  function makeGroupDraggable(group) {
    let isDragging = false;
    let grabOffset = { x: 0, y: 0 };
    let lastPos = { x: 0, y: 0 };

    const onPointerDown = (evt) => {
      evt.preventDefault();
      const point = getSvgPoint(evt);
      const current = parseTranslate(group.getAttribute('transform'));
      grabOffset.x = point.x - current.x;
      grabOffset.y = point.y - current.y;
      isDragging = true;
      document.body.classList.add('dragging');
      group.setPointerCapture?.(evt.pointerId);
    };

    const onPointerMove = (evt) => {
      if (!isDragging) return;
      const point = getSvgPoint(evt);
      const next = { x: point.x - grabOffset.x, y: point.y - grabOffset.y };
      lastPos = next;
      setTranslate(group, next.x, next.y);
    };

    const onPointerUp = (evt) => {
      if (!isDragging) return;
      isDragging = false;
      document.body.classList.remove('dragging');
      if (snapToggle.checked) {
        const near = nearestNode(lastPos);
        if (near) {
          setTranslate(group, near.x, near.y);
          highlightNode(near.id);
        }
      }
    };

    group.addEventListener('pointerdown', onPointerDown);
    svg.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  function highlightNode(nodeId) {
    nodesGroup.querySelectorAll('.node').forEach(n => n.classList.remove('active'));
    const el = nodesGroup.querySelector(`.node[data-id="${nodeId}"]`);
    if (el) el.classList.add('active');
  }

  function spawnInitialTokens() {
    const prototypes = tokenShelf.querySelectorAll('.token');
    // Clone 5 tokens to play with
    const count = 6;
    for (let i = 0; i < count; i++) {
      const proto = prototypes[i % prototypes.length];
      createDraggableToken(proto);
    }
  }

  function resetTokens() {
    // Remove all tokens that are children of svg but not under the shelf group
    svg.querySelectorAll('g.token').forEach(t => {
      if (!tokenShelf.contains(t)) t.remove();
    });
    spawnInitialTokens();
  }

  function wireShelfProtoDragToClone() {
    // Clicking a shelf token clones a new draggable
    tokenShelf.querySelectorAll('g.token').forEach(proto => {
      proto.style.cursor = 'copy';
      proto.addEventListener('click', () => {
        createDraggableToken(proto);
      });
    });
  }

  // Controls
  resetBtn.addEventListener('click', resetTokens);

  // Init
  wireShelfProtoDragToClone();
  spawnInitialTokens();
})();

