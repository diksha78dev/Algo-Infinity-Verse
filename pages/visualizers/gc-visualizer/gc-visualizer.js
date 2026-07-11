/**
 * gc-visualizer.js
 * Client-side Mark and Sweep Garbage Collection Simulator
 */

document.addEventListener('DOMContentLoaded', () => {
  new GCVisualizer();
});

class GCVisualizer {
  constructor() {
    this.cacheDOM();
    this.bindEvents();

    this.nodes = [];
    this.edges = [];
    this.nextId = 1;

    // Interaction states
    this.isAddingRef = false;
    this.isDroppingRoot = false;
    this.refSourceNode = null;

    // GC states: IDLE, MARKING, SWEEPING, DONE
    this.gcState = 'IDLE';
    this.gcQueue = [];

    this.colors = {
      root: '#8b5cf6',
      unmarked: '#64748b',
      marked: '#10b981',
      sweeping: '#ef4444',
      edge: 'rgba(255,255,255,0.3)',
      edgeHighlight: '#10b981',
    };

    this.initCanvas();
    this.setupInitialHeap();

    // Animation loop
    this.lastTime = 0;
    requestAnimationFrame((t) => this.animate(t));
  }

  cacheDOM() {
    this.els = {
      btnAlloc: document.getElementById('btnAlloc'),
      btnAddRef: document.getElementById('btnAddRef'),
      btnDropRoot: document.getElementById('btnDropRoot'),
      btnTriggerGC: document.getElementById('btnTriggerGC'),
      btnStep: document.getElementById('btnStep'),
      btnReset: document.getElementById('btnReset'),
      btnCancelRef: document.getElementById('btnCancelRef'),

      statGC: document.getElementById('stat-gc'),
      statHeap: document.getElementById('stat-heap'),

      instructionOverlay: document.getElementById('instructionOverlay'),
      canvas: document.getElementById('gcCanvas'),
    };
  }

  bindEvents() {
    this.els.btnAlloc.addEventListener('click', () => this.allocateObject());
    this.els.btnAddRef.addEventListener('click', () => this.toggleAddRef());
    this.els.btnDropRoot.addEventListener('click', () => this.toggleDropRoot());
    this.els.btnCancelRef.addEventListener('click', () => this.cancelAction());

    this.els.btnTriggerGC.addEventListener('click', () => this.triggerGC());
    this.els.btnStep.addEventListener('click', () => this.stepGC());
    this.els.btnReset.addEventListener('click', () => this.resetMemory());

    this.els.canvas.addEventListener('mousedown', (e) => this.onCanvasClick(e));

    window.addEventListener('resize', () => this.resizeCanvas());
  }

  initCanvas() {
    this.ctx = this.els.canvas.getContext('2d');
    this.resizeCanvas();
  }

  resizeCanvas() {
    const rect = this.els.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.els.canvas.width = rect.width * dpr;
    this.els.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = rect.width;
    this.height = rect.height;
  }

  setupInitialHeap() {
    this.nodes = [];
    this.edges = [];
    this.nextId = 1;

    // Create 2 root nodes
    this.createNode(this.width * 0.3, 100, true);
    this.createNode(this.width * 0.7, 100, true);

    // Create some normal nodes
    this.createNode(this.width * 0.3, 250);
    this.createNode(this.width * 0.7, 250);
    this.createNode(this.width * 0.5, 400);

    // Initial edges
    this.addEdge(1, 3);
    this.addEdge(2, 4);
    this.addEdge(3, 5);
    this.addEdge(4, 5);

    this.updateStats();
  }

  resetMemory() {
    this.cancelAction();
    this.gcState = 'IDLE';
    this.updateStats();
    this.els.btnStep.disabled = true;
    this.els.btnTriggerGC.disabled = false;
    this.els.btnAlloc.disabled = false;
    this.els.btnAddRef.disabled = false;
    this.els.btnDropRoot.disabled = false;
    this.setupInitialHeap();
  }

  createNode(x, y, isRoot = false) {
    const id = this.nextId++;
    this.nodes.push({
      id,
      x: x || 50 + Math.random() * (this.width - 100),
      y: y || 150 + Math.random() * (this.height - 200),
      vx: 0,
      vy: 0,
      radius: 25,
      isRoot,
      marked: false,
      sweeping: false,
    });
    this.updateStats();
    return id;
  }

  addEdge(fromId, toId) {
    // Prevent duplicates and self-loops
    if (fromId === toId) return;
    if (this.edges.some((e) => e.from === fromId && e.to === toId)) return;

    this.edges.push({ from: fromId, to: toId, highlighted: false });
  }

  allocateObject() {
    if (this.gcState !== 'IDLE') return;
    this.createNode(this.width / 2, this.height - 60);
  }

  toggleAddRef() {
    if (this.gcState !== 'IDLE') return;
    this.isAddingRef = !this.isAddingRef;
    this.isDroppingRoot = false;
    this.refSourceNode = null;

    if (this.isAddingRef) {
      this.els.instructionOverlay.classList.remove('hidden');
      this.els.instructionOverlay.innerHTML = `Click first object, then second object to connect. <button id="btnCancelRef" class="btn-small">Cancel</button>`;
      document.getElementById('btnCancelRef').addEventListener('click', () => this.cancelAction());
      this.els.btnAddRef.classList.add('active');
      this.els.canvas.style.cursor = 'crosshair';
    } else {
      this.cancelAction();
    }
  }

  toggleDropRoot() {
    if (this.gcState !== 'IDLE') return;
    this.isDroppingRoot = !this.isDroppingRoot;
    this.isAddingRef = false;
    this.refSourceNode = null;

    if (this.isDroppingRoot) {
      this.els.instructionOverlay.classList.remove('hidden');
      this.els.instructionOverlay.innerHTML = `Click a Root object (purple) to remove its root status. <button id="btnCancelRef" class="btn-small">Cancel</button>`;
      document.getElementById('btnCancelRef').addEventListener('click', () => this.cancelAction());
      this.els.btnDropRoot.classList.add('active');
      this.els.canvas.style.cursor = 'crosshair';
    } else {
      this.cancelAction();
    }
  }

  cancelAction() {
    this.isAddingRef = false;
    this.isDroppingRoot = false;
    this.refSourceNode = null;
    this.els.instructionOverlay.classList.add('hidden');
    this.els.btnAddRef.classList.remove('active');
    this.els.btnDropRoot.classList.remove('active');
    this.els.canvas.style.cursor = 'default';
  }

  onCanvasClick(e) {
    if (this.gcState !== 'IDLE') return;

    const rect = this.els.canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Find clicked node
    let clickedNode = null;
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      const dist = Math.hypot(n.x - clickX, n.y - clickY);
      if (dist <= n.radius) {
        clickedNode = n;
        break;
      }
    }

    if (!clickedNode) {
      if (this.isAddingRef) {
        this.refSourceNode = null;
      }
      return;
    }

    if (this.isAddingRef) {
      if (!this.refSourceNode) {
        this.refSourceNode = clickedNode;
      } else {
        this.addEdge(this.refSourceNode.id, clickedNode.id);
        this.cancelAction();
      }
    } else if (this.isDroppingRoot) {
      if (clickedNode.isRoot) {
        clickedNode.isRoot = false;
        this.cancelAction();
      }
    } else {
      // Toggle root status just on simple click if not in any mode
      // (Optional quality of life feature)
    }
  }

  triggerGC() {
    if (this.gcState !== 'IDLE') return;

    this.cancelAction();
    this.gcState = 'MARKING';

    // Reset markings
    this.nodes.forEach((n) => {
      n.marked = false;
      n.sweeping = false;
    });
    this.edges.forEach((e) => (e.highlighted = false));

    // Find roots
    const roots = this.nodes.filter((n) => n.isRoot);
    this.gcQueue = [...roots];

    // Disable editing UI
    this.els.btnTriggerGC.disabled = true;
    this.els.btnAlloc.disabled = true;
    this.els.btnAddRef.disabled = true;
    this.els.btnDropRoot.disabled = true;
    this.els.btnStep.disabled = false;

    this.updateStats();
  }

  stepGC() {
    if (this.gcState === 'MARKING') {
      if (this.gcQueue.length > 0) {
        const current = this.gcQueue.shift();
        if (!current.marked) {
          current.marked = true;
          // Find out-edges
          const outEdges = this.edges.filter((e) => e.from === current.id);
          outEdges.forEach((e) => {
            e.highlighted = true;
            const target = this.nodes.find((n) => n.id === e.to);
            if (target && !target.marked && !this.gcQueue.includes(target)) {
              this.gcQueue.push(target);
            }
          });
        }
      } else {
        // Done marking
        this.gcState = 'SWEEPING';
      }
    } else if (this.gcState === 'SWEEPING') {
      // Identify unmarked
      let sweptSomething = false;
      for (let i = 0; i < this.nodes.length; i++) {
        const n = this.nodes[i];
        if (!n.marked && !n.sweeping) {
          n.sweeping = true;
          sweptSomething = true;
          break; // one per step for visual effect
        }
      }

      if (!sweptSomething) {
        // Actually remove them
        const toRemove = this.nodes.filter((n) => n.sweeping).map((n) => n.id);
        this.nodes = this.nodes.filter((n) => !n.sweeping);
        this.edges = this.edges.filter(
          (e) => !toRemove.includes(e.from) && !toRemove.includes(e.to)
        );

        this.gcState = 'DONE';
        this.els.btnStep.disabled = true;

        setTimeout(() => {
          this.gcState = 'IDLE';
          this.nodes.forEach((n) => (n.marked = false));
          this.edges.forEach((e) => (e.highlighted = false));
          this.els.btnTriggerGC.disabled = false;
          this.els.btnAlloc.disabled = false;
          this.els.btnAddRef.disabled = false;
          this.els.btnDropRoot.disabled = false;
          this.updateStats();
        }, 1000);
      }
    }

    this.updateStats();
  }

  updateStats() {
    this.els.statHeap.textContent = this.nodes.length;
    this.els.statGC.textContent = this.gcState;

    if (this.gcState === 'IDLE') this.els.statGC.style.color = '#fff';
    if (this.gcState === 'MARKING') this.els.statGC.style.color = this.colors.marked;
    if (this.gcState === 'SWEEPING') this.els.statGC.style.color = this.colors.sweeping;
    if (this.gcState === 'DONE') this.els.statGC.style.color = this.colors.marked;
  }

  // Physics & Rendering
  animate(timestamp) {
    this.lastTime = timestamp;

    this.applyPhysics();
    this.draw();

    requestAnimationFrame((t) => this.animate(t));
  }

  applyPhysics() {
    // Simple force-directed graph to make it look organic
    const repulsion = 2000;
    const attraction = 0.05;
    const damping = 0.85;

    // Repulsion
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const n1 = this.nodes[i];
        const n2 = this.nodes[j];
        const dx = n1.x - n2.x;
        const dy = n1.y - n2.y;
        const dist = Math.hypot(dx, dy) || 1;

        if (dist < 150) {
          const force = repulsion / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          n1.vx += fx;
          n1.vy += fy;
          n2.vx -= fx;
          n2.vy -= fy;
        }
      }
    }

    // Attraction (Edges)
    this.edges.forEach((edge) => {
      const n1 = this.nodes.find((n) => n.id === edge.from);
      const n2 = this.nodes.find((n) => n.id === edge.to);
      if (!n1 || !n2) return;

      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const dist = Math.hypot(dx, dy);

      const targetDist = 120;
      const force = (dist - targetDist) * attraction;

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      n1.vx += fx;
      n1.vy += fy;
      n2.vx -= fx;
      n2.vy -= fy;
    });

    // Update positions
    this.nodes.forEach((n) => {
      if (n.isRoot) {
        // Keep roots near the top
        n.vy += (100 - n.y) * 0.05;
      } else {
        // Pull everything slightly towards center
        n.vx += (this.width / 2 - n.x) * 0.005;
        n.vy += (this.height / 2 - n.y) * 0.005;
      }

      n.vx *= damping;
      n.vy *= damping;

      n.x += n.vx;
      n.y += n.vy;

      // Bounds
      n.x = Math.max(n.radius, Math.min(this.width - n.radius, n.x));
      n.y = Math.max(n.radius, Math.min(this.height - n.radius, n.y));
    });
  }

  draw() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw Edges
    this.edges.forEach((edge) => {
      const n1 = this.nodes.find((n) => n.id === edge.from);
      const n2 = this.nodes.find((n) => n.id === edge.to);
      if (!n1 || !n2) return;

      this.ctx.beginPath();
      this.ctx.moveTo(n1.x, n1.y);
      this.ctx.lineTo(n2.x, n2.y);
      this.ctx.lineWidth = edge.highlighted ? 3 : 1.5;
      this.ctx.strokeStyle = edge.highlighted ? this.colors.edgeHighlight : this.colors.edge;
      this.ctx.stroke();

      // Draw Arrow head
      const angle = Math.atan2(n2.y - n1.y, n2.x - n1.x);
      const headlen = 10;
      // Draw arrow exactly at the edge of the target node
      const targetX = n2.x - Math.cos(angle) * n2.radius;
      const targetY = n2.y - Math.sin(angle) * n2.radius;

      this.ctx.beginPath();
      this.ctx.moveTo(targetX, targetY);
      this.ctx.lineTo(
        targetX - headlen * Math.cos(angle - Math.PI / 6),
        targetY - headlen * Math.sin(angle - Math.PI / 6)
      );
      this.ctx.lineTo(
        targetX - headlen * Math.cos(angle + Math.PI / 6),
        targetY - headlen * Math.sin(angle + Math.PI / 6)
      );
      this.ctx.lineTo(targetX, targetY);
      this.ctx.fillStyle = edge.highlighted ? this.colors.edgeHighlight : this.colors.edge;
      this.ctx.fill();
    });

    // Draw Nodes
    this.nodes.forEach((n) => {
      this.ctx.beginPath();
      this.ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);

      if (n.sweeping) {
        this.ctx.fillStyle = this.colors.sweeping;
        this.ctx.globalAlpha = 0.5;
      } else if (n.marked) {
        this.ctx.fillStyle = this.colors.marked;
      } else if (n.isRoot) {
        this.ctx.fillStyle = this.colors.root;
      } else {
        this.ctx.fillStyle = this.colors.unmarked;
      }

      this.ctx.fill();
      this.ctx.globalAlpha = 1.0;

      // Highlight source node during connection
      if (this.isAddingRef && this.refSourceNode === n) {
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#f59e0b';
        this.ctx.stroke();
      } else {
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        this.ctx.stroke();
      }

      // Draw ID
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '500 12px "Fira Code"';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(`Obj ${n.id}`, n.x, n.y);

      // Draw Root tag
      if (n.isRoot && !n.sweeping) {
        this.ctx.font = '700 10px Poppins';
        this.ctx.fillStyle = '#cbd5e1';
        this.ctx.fillText('ROOT', n.x, n.y - n.radius - 8);
      }
    });
  }
}
