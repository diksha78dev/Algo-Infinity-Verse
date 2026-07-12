/**
 * dining-philosophers.js
 * Visualizes the Dining Philosophers concurrency problem using HTML5 Canvas.
 */

document.addEventListener('DOMContentLoaded', () => {
  new DiningPhilosophersVisualizer();
});

const STATES = {
  THINKING: 'THINKING',
  HUNGRY: 'HUNGRY',
  EATING: 'EATING',
};

const COLORS = {
  [STATES.THINKING]: '#64748b',
  [STATES.HUNGRY]: '#f59e0b',
  [STATES.EATING]: '#10b981',
  DEADLOCK: '#ef4444',
  FORK_AVAILABLE: '#cbd5e1',
  FORK_HELD: '#f59e0b',
};

class DiningPhilosophersVisualizer {
  constructor() {
    this.cacheDOM();
    this.bindEvents();

    this.numPhilosophers = 5;
    this.philosophers = [];
    this.forks = []; // false = available, true = held

    this.isRunning = false;
    this.isDeadlockForced = false;
    this.useHierarchy = false;

    this.animationId = null;
    this.tickRate = 1000; // ms per logic tick
    this.lastTick = 0;

    this.initCanvas();
    this.resetSimulation();
    this.startRenderLoop();
  }

  cacheDOM() {
    this.els = {
      canvas: document.getElementById('dpCanvas'),
      btnToggleSim: document.getElementById('btnToggleSim'),
      btnReset: document.getElementById('btnReset'),
      btnForceDeadlock: document.getElementById('btnForceDeadlock'),
      toggleHierarchy: document.getElementById('toggleHierarchy'),

      globalBadge: document.getElementById('globalStateBadge'),
      statThinking: document.getElementById('statThinking'),
      statHungry: document.getElementById('statHungry'),
      statEating: document.getElementById('statEating'),

      logContainer: document.getElementById('logContainer'),
      btnClearLog: document.getElementById('btnClearLog'),
    };
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resizeCanvas());

    this.els.btnToggleSim.addEventListener('click', () => this.toggleSimulation());
    this.els.btnReset.addEventListener('click', () => this.resetSimulation());
    this.els.btnForceDeadlock.addEventListener('click', () => this.forceDeadlock());

    this.els.toggleHierarchy.addEventListener('change', (e) => {
      this.useHierarchy = e.target.checked;
      this.log(
        `System: Resource Hierarchy Mitigation ${this.useHierarchy ? 'ENABLED' : 'DISABLED'}.`,
        'system'
      );
    });

    this.els.btnClearLog.addEventListener('click', () => {
      this.els.logContainer.innerHTML = '';
    });
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

  resetSimulation() {
    this.isRunning = false;
    this.isDeadlockForced = false;

    this.philosophers = [];
    this.forks = Array(this.numPhilosophers)
      .fill(null)
      .map(() => ({ owner: null }));

    for (let i = 0; i < this.numPhilosophers; i++) {
      this.philosophers.push({
        id: i,
        state: STATES.THINKING,
        progress: 0, // progress towards next state
        hasLeftFork: false,
        hasRightFork: false,
        eatingTime: 0,
      });
    }

    this.els.btnToggleSim.innerHTML = '<i class="fas fa-play"></i> Start Random Simulation';
    this.updateBadge('IDLE', 'idle');
    this.updateStats();
  }

  toggleSimulation() {
    this.isRunning = !this.isRunning;
    this.isDeadlockForced = false;

    if (this.isRunning) {
      this.els.btnToggleSim.innerHTML = '<i class="fas fa-pause"></i> Pause Simulation';
      this.updateBadge('RUNNING', 'running');
      this.log('System: Random simulation started.', 'system');
    } else {
      this.els.btnToggleSim.innerHTML = '<i class="fas fa-play"></i> Resume Simulation';
      this.updateBadge('PAUSED', 'idle');
      this.log('System: Simulation paused.', 'system');
    }
  }

  forceDeadlock() {
    this.isRunning = true;
    this.isDeadlockForced = true;
    this.els.btnToggleSim.innerHTML = '<i class="fas fa-pause"></i> Pause Simulation';
    this.updateBadge('FORCING DEADLOCK...', 'running');
    this.log('System: Forcing symmetric resource requests (Deadlock scenario)...', 'deadlock');

    // Reset state so everyone wants to eat immediately
    this.philosophers.forEach((p) => {
      p.state = STATES.HUNGRY;
      p.hasLeftFork = false;
      p.hasRightFork = false;
      p.progress = 1.0;
    });

    this.forks.forEach((f) => (f.owner = null));
    this.updateStats();
  }

  log(message, type = 'system') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;

    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;

    entry.textContent = `[${time}] ${message}`;
    this.els.logContainer.appendChild(entry);
    this.els.logContainer.scrollTop = this.els.logContainer.scrollHeight;
  }

  updateStats() {
    const thinking = this.philosophers.filter((p) => p.state === STATES.THINKING).length;
    const hungry = this.philosophers.filter((p) => p.state === STATES.HUNGRY).length;
    const eating = this.philosophers.filter((p) => p.state === STATES.EATING).length;

    this.els.statThinking.textContent = thinking;
    this.els.statHungry.textContent = hungry;
    this.els.statEating.textContent = eating;

    if (
      hungry === this.numPhilosophers &&
      this.philosophers.every((p) => p.hasLeftFork || p.hasRightFork)
    ) {
      // Everyone is hungry and holds exactly one fork -> Deadlock
      this.updateBadge('DEADLOCK!', 'deadlock');
    } else if (this.isRunning && !this.isDeadlockForced) {
      this.updateBadge('RUNNING', 'running');
    }
  }

  updateBadge(text, type) {
    this.els.globalBadge.textContent = text;
    this.els.globalBadge.className = `status-badge ${type}`;
  }

  startRenderLoop() {
    const loop = (timestamp) => {
      const dt = timestamp - this.lastTick;
      if (dt > 100) {
        // Limit logic updates
        this.logicTick();
        this.lastTick = timestamp;
      }
      this.render();
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  logicTick() {
    if (!this.isRunning) return;

    let deadlocked = true;

    for (let i = 0; i < this.numPhilosophers; i++) {
      const p = this.philosophers[i];

      // Fork Indices
      const leftForkIdx = i;
      const rightForkIdx = (i + 1) % this.numPhilosophers;

      let firstFork = leftForkIdx;
      let secondFork = rightForkIdx;

      // Resource Hierarchy Mitigation: Always request lowest numbered fork first
      if (this.useHierarchy) {
        if (leftForkIdx > rightForkIdx) {
          firstFork = rightForkIdx;
          secondFork = leftForkIdx;
        }
      }

      if (p.state === STATES.THINKING) {
        deadlocked = false;
        if (!this.isDeadlockForced) {
          // Random chance to get hungry
          if (Math.random() < 0.1) {
            p.state = STATES.HUNGRY;
            this.log(`P${p.id} is now HUNGRY.`, 'hungry');
          }
        }
      } else if (p.state === STATES.HUNGRY) {
        const holdsFirst = this.forks[firstFork].owner === p.id;
        const holdsSecond = this.forks[secondFork].owner === p.id;

        if (!holdsFirst && !holdsSecond) {
          // Try acquire first fork
          if (this.forks[firstFork].owner === null) {
            this.forks[firstFork].owner = p.id;
            this.log(`P${p.id} acquired Fork ${firstFork}.`, 'system');
            deadlocked = false;
          }
        } else if (holdsFirst && !holdsSecond) {
          // Try acquire second fork
          if (this.forks[secondFork].owner === null) {
            this.forks[secondFork].owner = p.id;
            p.state = STATES.EATING;
            p.eatingTime = 5; // Eat for 5 ticks
            this.log(`P${p.id} acquired Fork ${secondFork} and started EATING.`, 'eating');
            deadlocked = false;
          }
        }
      } else if (p.state === STATES.EATING) {
        deadlocked = false;
        p.eatingTime--;
        if (p.eatingTime <= 0) {
          // Release forks and start thinking
          this.forks[firstFork].owner = null;
          this.forks[secondFork].owner = null;
          p.state = STATES.THINKING;
          this.log(`P${p.id} finished eating, released forks, and is THINKING.`, 'thinking');
        }
      }
    }

    this.updateStats();

    if (deadlocked && this.philosophers.every((p) => p.state === STATES.HUNGRY)) {
      // Already deadlocked
      this.isRunning = false;
      this.log('SYSTEM HALTED: Deadlock Detected.', 'deadlock');
      this.updateBadge('DEADLOCK DETECTED', 'deadlock');
    }
  }

  render() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    const cx = this.width / 2;
    const cy = this.height / 2;
    const tableRadius = Math.min(cx, cy) * 0.5;

    // Draw Table
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, tableRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
    this.ctx.fill();
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    this.ctx.stroke();

    const angleStep = (Math.PI * 2) / this.numPhilosophers;

    // Draw Forks
    for (let i = 0; i < this.numPhilosophers; i++) {
      // The fork is between i and (i+1)%N
      const angle = i * angleStep + angleStep / 2 - Math.PI / 2;
      const dist = tableRadius * 0.6;

      let fx = cx + Math.cos(angle) * dist;
      let fy = cy + Math.sin(angle) * dist;

      // If held, move it towards the owner
      const owner = this.forks[i].owner;
      if (owner !== null) {
        const ownerAngle = owner * angleStep - Math.PI / 2;
        fx = cx + Math.cos(ownerAngle) * (tableRadius * 0.75);
        fy = cy + Math.sin(ownerAngle) * (tableRadius * 0.75);
      }

      this.ctx.save();
      this.ctx.translate(fx, fy);
      this.ctx.rotate(owner !== null ? angle + Math.PI / 4 : angle);

      this.ctx.beginPath();
      this.ctx.moveTo(0, -10);
      this.ctx.lineTo(0, 10);
      this.ctx.lineWidth = 3;
      this.ctx.strokeStyle = owner !== null ? COLORS.FORK_HELD : COLORS.FORK_AVAILABLE;
      this.ctx.stroke();

      // Tines
      this.ctx.beginPath();
      this.ctx.moveTo(-4, -10);
      this.ctx.lineTo(-4, -5);
      this.ctx.moveTo(4, -10);
      this.ctx.lineTo(4, -5);
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      this.ctx.restore();

      // Fork Label
      this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
      this.ctx.font = '10px "Fira Code"';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      // Only draw label near original position
      const lx = cx + Math.cos(angle) * (tableRadius * 0.4);
      const ly = cy + Math.sin(angle) * (tableRadius * 0.4);
      this.ctx.fillText(`F${i}`, lx, ly);
    }

    // Draw Philosophers (Plates)
    for (let i = 0; i < this.numPhilosophers; i++) {
      const p = this.philosophers[i];
      const angle = i * angleStep - Math.PI / 2;
      const dist = tableRadius * 0.9;
      const px = cx + Math.cos(angle) * dist;
      const py = cy + Math.sin(angle) * dist;

      let color = COLORS[p.state];
      if (this.els.globalBadge.textContent.includes('DEADLOCK')) {
        color = COLORS.DEADLOCK;
      }

      // Plate
      this.ctx.beginPath();
      this.ctx.arc(px, py, 35, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      this.ctx.fill();
      this.ctx.lineWidth = p.state === STATES.EATING ? 4 : 2;
      this.ctx.strokeStyle = color;
      this.ctx.stroke();

      // Inner food (if eating)
      if (p.state === STATES.EATING) {
        this.ctx.beginPath();
        this.ctx.arc(px, py, 20, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
        this.ctx.fill();
      }

      // Name
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '600 14px Poppins';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(`P${p.id}`, px, py - 5);

      // State
      this.ctx.fillStyle = color;
      this.ctx.font = '500 10px Poppins';
      this.ctx.fillText(p.state, px, py + 12);
    }
  }
}
