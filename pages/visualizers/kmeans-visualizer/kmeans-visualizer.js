/**
 * kmeans-visualizer.js
 * Client-side K-Means Clustering implementation with Canvas rendering
 */

document.addEventListener('DOMContentLoaded', () => {
  new KMeansVisualizer();
});

class KMeansVisualizer {
  constructor() {
    this.cacheDOM();
    this.bindEvents();

    this.points = [];
    this.centroids = [];
    this.state = 'INIT'; // INIT, ASSIGN, UPDATE, CONVERGED
    this.iteration = 0;
    this.movements = 0;
    this.autoRunInterval = null;
    this.colors = [
      '#ef4444',
      '#3b82f6',
      '#10b981',
      '#f59e0b',
      '#8b5cf6',
      '#ec4899',
      '#14b8a6',
      '#f97316',
      '#6366f1',
      '#84cc16',
    ];

    this.initCanvas();
    this.generateData();
  }

  cacheDOM() {
    this.els = {
      numPoints: document.getElementById('numPoints'),
      numPointsVal: document.getElementById('numPointsVal'),
      numClusters: document.getElementById('numClusters'),
      numClustersVal: document.getElementById('numClustersVal'),

      btnGenerateData: document.getElementById('btnGenerateData'),
      btnInitCentroids: document.getElementById('btnInitCentroids'),
      btnStep: document.getElementById('btnStep'),
      btnAutoRun: document.getElementById('btnAutoRun'),

      statIteration: document.getElementById('stat-iteration'),
      statPhase: document.getElementById('stat-phase'),
      statMovements: document.getElementById('stat-movements'),

      canvas: document.getElementById('kmeansCanvas'),
    };
  }

  bindEvents() {
    this.els.numPoints.addEventListener('input', (e) => {
      this.els.numPointsVal.textContent = e.target.value;
    });

    this.els.numClusters.addEventListener('input', (e) => {
      this.els.numClustersVal.textContent = e.target.value;
    });

    this.els.btnGenerateData.addEventListener('click', () => this.generateData());
    this.els.btnInitCentroids.addEventListener('click', () => this.initCentroids());
    this.els.btnStep.addEventListener('click', () => this.stepForward());
    this.els.btnAutoRun.addEventListener('click', () => this.toggleAutoRun());

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
    this.draw();
  }

  stopAutoRun() {
    if (this.autoRunInterval) {
      clearInterval(this.autoRunInterval);
      this.autoRunInterval = null;
      this.els.btnAutoRun.innerHTML = '<i class="fas fa-play"></i> Auto Run';
    }
  }

  toggleAutoRun() {
    if (this.autoRunInterval) {
      this.stopAutoRun();
    } else {
      this.els.btnAutoRun.innerHTML = '<i class="fas fa-pause"></i> Pause';
      this.autoRunInterval = setInterval(() => {
        if (this.state === 'CONVERGED') {
          this.stopAutoRun();
          return;
        }
        this.stepForward();
      }, 800);
    }
  }

  generateData() {
    this.stopAutoRun();
    const numPoints = parseInt(this.els.numPoints.value);
    this.points = [];
    this.centroids = [];
    this.state = 'INIT';
    this.iteration = 0;
    this.movements = 0;

    this.updateStats('Generate Data');

    // Generate points in pseudo-clusters so it looks nice
    const numClusters = parseInt(this.els.numClusters.value);
    const centers = [];
    for (let i = 0; i < numClusters; i++) {
      centers.push({
        x: 50 + Math.random() * (this.width - 100),
        y: 50 + Math.random() * (this.height - 100),
      });
    }

    for (let i = 0; i < numPoints; i++) {
      const center = centers[Math.floor(Math.random() * centers.length)];
      // Box-Muller transform for normal distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);

      const spread = this.width * 0.08;

      let x = center.x + z0 * spread;
      let y = center.y + z1 * spread;

      // Constrain to bounds
      x = Math.max(10, Math.min(this.width - 10, x));
      y = Math.max(10, Math.min(this.height - 10, y));

      this.points.push({ x, y, cluster: -1 });
    }

    this.els.btnStep.disabled = true;
    this.els.btnAutoRun.disabled = true;

    this.draw();
  }

  initCentroids() {
    this.stopAutoRun();
    const k = parseInt(this.els.numClusters.value);
    this.centroids = [];

    // Randomly pick k points as initial centroids (Forgy method)
    const shuffled = [...this.points].sort(() => 0.5 - Math.random());
    for (let i = 0; i < k; i++) {
      this.centroids.push({
        x: shuffled[i].x,
        y: shuffled[i].y,
        color: this.colors[i % this.colors.length],
      });
    }

    // Reset points
    this.points.forEach((p) => (p.cluster = -1));

    this.state = 'ASSIGN';
    this.iteration = 0;
    this.movements = 0;

    this.updateStats('Init Centroids');

    this.els.btnStep.disabled = false;
    this.els.btnAutoRun.disabled = false;

    this.draw();
  }

  stepForward() {
    if (this.state === 'ASSIGN') {
      this.assignPoints();
    } else if (this.state === 'UPDATE') {
      this.updateCentroids();
    }
  }

  assignPoints() {
    let changed = false;

    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      let minDist = Infinity;
      let closest = -1;

      for (let j = 0; j < this.centroids.length; j++) {
        const c = this.centroids[j];
        const dist = Math.hypot(p.x - c.x, p.y - c.y);
        if (dist < minDist) {
          minDist = dist;
          closest = j;
        }
      }

      if (p.cluster !== closest) {
        p.cluster = closest;
        changed = true;
      }
    }

    if (!changed && this.iteration > 0) {
      this.state = 'CONVERGED';
      this.updateStats('Converged!');
      this.stopAutoRun();
      this.els.btnStep.disabled = true;
    } else {
      this.state = 'UPDATE';
      this.updateStats('Assign Points');
    }

    this.draw();
  }

  updateCentroids() {
    let totalMoved = 0;

    for (let i = 0; i < this.centroids.length; i++) {
      const c = this.centroids[i];
      const clusterPoints = this.points.filter((p) => p.cluster === i);

      if (clusterPoints.length > 0) {
        const sumX = clusterPoints.reduce((sum, p) => sum + p.x, 0);
        const sumY = clusterPoints.reduce((sum, p) => sum + p.y, 0);

        const newX = sumX / clusterPoints.length;
        const newY = sumY / clusterPoints.length;

        const distMoved = Math.hypot(newX - c.x, newY - c.y);
        totalMoved += distMoved;

        c.x = newX;
        c.y = newY;
      }
    }

    this.movements = totalMoved.toFixed(2);
    this.iteration++;

    if (totalMoved < 0.1) {
      this.state = 'CONVERGED';
      this.updateStats('Converged!');
      this.stopAutoRun();
      this.els.btnStep.disabled = true;
    } else {
      this.state = 'ASSIGN';
      this.updateStats('Update Centroids');
    }

    this.draw();
  }

  updateStats(phaseText) {
    this.els.statIteration.textContent = this.iteration;
    this.els.statPhase.textContent = phaseText;
    this.els.statMovements.textContent = this.movements;

    if (this.state === 'CONVERGED') {
      this.els.statPhase.style.color = '#10b981';
    } else {
      this.els.statPhase.style.color = '#fff';
    }
  }

  draw() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw points
    for (const p of this.points) {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);

      if (p.cluster === -1) {
        this.ctx.fillStyle = '#64748b';
      } else {
        this.ctx.fillStyle = this.centroids[p.cluster].color;
      }

      this.ctx.fill();
    }

    // Draw centroids
    for (const c of this.centroids) {
      this.ctx.beginPath();
      // Draw a cross/star shape
      const size = 12;

      this.ctx.moveTo(c.x - size, c.y - size);
      this.ctx.lineTo(c.x + size, c.y + size);
      this.ctx.moveTo(c.x + size, c.y - size);
      this.ctx.lineTo(c.x - size, c.y + size);

      this.ctx.moveTo(c.x, c.y - size * 1.2);
      this.ctx.lineTo(c.x, c.y + size * 1.2);
      this.ctx.moveTo(c.x - size * 1.2, c.y);
      this.ctx.lineTo(c.x + size * 1.2, c.y);

      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 4;
      this.ctx.stroke();

      this.ctx.strokeStyle = c.color;
      this.ctx.lineWidth = 3;
      this.ctx.stroke();

      // White center dot
      this.ctx.beginPath();
      this.ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
      this.ctx.fillStyle = '#fff';
      this.ctx.fill();
    }
  }
}
