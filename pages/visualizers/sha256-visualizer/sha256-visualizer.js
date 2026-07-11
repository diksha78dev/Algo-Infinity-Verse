/**
 * sha256-visualizer.js
 * Client-side SHA-256 step-by-step logic and visualization
 */

document.addEventListener('DOMContentLoaded', () => {
  new SHA256Visualizer();
});

class SHA256Visualizer {
  constructor() {
    this.cacheDOM();
    this.bindEvents();
    this.constants = this.getConstants();
    this.reset();
  }

  cacheDOM() {
    this.els = {
      input: document.getElementById('messageInput'),
      btnReset: document.getElementById('btnReset'),
      btnStep: document.getElementById('btnStep'),
      btnFastForward: document.getElementById('btnFastForward'),

      // Phase elements
      paddingGrid: document.getElementById('padding-grid'),
      scheduleGrid: document.getElementById('schedule-grid'),
      roundCounter: document.getElementById('roundCounter'),
      finalHashOutput: document.getElementById('finalHashOutput'),

      // Registers
      regA: document.querySelector('#reg-a .reg-val'),
      regB: document.querySelector('#reg-b .reg-val'),
      regC: document.querySelector('#reg-c .reg-val'),
      regD: document.querySelector('#reg-d .reg-val'),
      regE: document.querySelector('#reg-e .reg-val'),
      regF: document.querySelector('#reg-f .reg-val'),
      regG: document.querySelector('#reg-g .reg-val'),
      regH: document.querySelector('#reg-h .reg-val'),

      // Operation values
      valK: document.getElementById('val-k'),
      valW: document.getElementById('val-w'),
      valT1: document.getElementById('val-t1'),
      valT2: document.getElementById('val-t2'),

      // Status badges
      statusPadding: document.getElementById('status-padding'),
      statusSchedule: document.getElementById('status-schedule'),
      statusCompression: document.getElementById('status-compression'),
    };
  }

  bindEvents() {
    this.els.btnReset.addEventListener('click', () => this.reset());
    this.els.btnStep.addEventListener('click', () => this.stepForward());
    this.els.btnFastForward.addEventListener('click', () => this.fastForward());
  }

  reset() {
    this.state = {
      phase: 0, // 0: Init, 1: Padding, 2: Schedule, 3: Compression, 4: Final
      round: 0,
      message: this.els.input.value || 'abc',
      blocks: [], // Array of 512-bit blocks (each block is 64 bytes)
      W: [], // Message schedule for current block
      H: [
        // Initial hash values (first 32 bits of fractional parts of square roots of first 8 primes)
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
        0x5be0cd19,
      ],
      // Working variables
      a: 0,
      b: 0,
      c: 0,
      d: 0,
      e: 0,
      f: 0,
      g: 0,
      h: 0,
      currentBlockIdx: 0,
      autoPlayInterval: null,
    };

    this.updateUI();
    this.clearGrids();

    this.els.statusPadding.textContent = 'Pending';
    this.els.statusSchedule.textContent = 'Pending';
    this.els.statusCompression.textContent = 'Pending';
    this.els.statusPadding.className = 'status-badge';
    this.els.statusSchedule.className = 'status-badge';
    this.els.statusCompression.className = 'status-badge';
    this.els.finalHashOutput.textContent = 'Waiting for computation...';

    // Initial setup for A-H
    [
      this.state.a,
      this.state.b,
      this.state.c,
      this.state.d,
      this.state.e,
      this.state.f,
      this.state.g,
      this.state.h,
    ] = this.state.H;

    this.updateRegistersUI();
  }

  clearGrids() {
    this.els.paddingGrid.innerHTML = '<div class="empty-state">Waiting to start...</div>';
    this.els.scheduleGrid.innerHTML = '<div class="empty-state">Waiting to start...</div>';
  }

  stepForward() {
    if (this.state.phase === 0) {
      this.processPadding();
    } else if (this.state.phase === 1) {
      this.generateSchedule();
    } else if (this.state.phase === 2) {
      this.state.phase = 3;
      this.els.statusCompression.textContent = 'Active';
      this.els.statusCompression.className = 'status-badge active';
      this.processRound();
    } else if (this.state.phase === 3) {
      this.processRound();
    }
  }

  fastForward() {
    if (this.state.autoPlayInterval) {
      clearInterval(this.state.autoPlayInterval);
      this.state.autoPlayInterval = null;
      this.els.btnFastForward.innerHTML = '<i class="fas fa-forward"></i> Fast Forward';
    } else {
      this.els.btnFastForward.innerHTML = '<i class="fas fa-pause"></i> Pause';
      this.state.autoPlayInterval = setInterval(() => {
        if (this.state.phase === 4) {
          clearInterval(this.state.autoPlayInterval);
          this.state.autoPlayInterval = null;
          this.els.btnFastForward.innerHTML = '<i class="fas fa-forward"></i> Fast Forward';
          return;
        }
        this.stepForward();
      }, 50); // 50ms per step
    }
  }

  // Phase 1
  processPadding() {
    this.state.phase = 1;
    this.els.statusPadding.textContent = 'Done';
    this.els.statusPadding.className = 'status-badge done';
    this.els.statusSchedule.textContent = 'Active';
    this.els.statusSchedule.className = 'status-badge active';

    const msgStr = this.state.message;
    let bytes = [];
    for (let i = 0; i < msgStr.length; i++) {
      bytes.push(msgStr.charCodeAt(i));
    }
    const bitLen = bytes.length * 8;

    // Append 1 bit (0x80)
    bytes.push(0x80);

    // Pad with 0s until length % 64 == 56 bytes
    while (bytes.length % 64 !== 56) {
      bytes.push(0);
    }

    // Append 64-bit length (big endian). Since we only deal with small strings in JS, top 32 bits are 0.
    bytes.push(0, 0, 0, 0);
    bytes.push((bitLen >>> 24) & 0xff);
    bytes.push((bitLen >>> 16) & 0xff);
    bytes.push((bitLen >>> 8) & 0xff);
    bytes.push(bitLen & 0xff);

    this.state.blocks = [];
    for (let i = 0; i < bytes.length; i += 64) {
      this.state.blocks.push(bytes.slice(i, i + 64));
    }

    // Visualize first block padding
    this.els.paddingGrid.innerHTML = '';
    const b0 = this.state.blocks[0];
    b0.forEach((byte, idx) => {
      const div = document.createElement('div');
      let cls = 'msg';
      if (idx >= msgStr.length && idx < msgStr.length + 1) cls = 'pad1';
      else if (idx >= b0.length - 8) cls = 'len';
      else if (idx > msgStr.length) cls = 'pad0';

      div.className = `hex-cell ${cls}`;
      div.textContent = this.toHex8(byte);
      this.els.paddingGrid.appendChild(div);
    });
  }

  // Phase 2
  generateSchedule() {
    this.state.phase = 2;
    this.els.statusSchedule.textContent = 'Done';
    this.els.statusSchedule.className = 'status-badge done';

    const block = this.state.blocks[this.state.currentBlockIdx];
    const W = new Array(64);

    // First 16 words
    for (let t = 0; t < 16; t++) {
      W[t] =
        (block[t * 4] << 24) |
        (block[t * 4 + 1] << 16) |
        (block[t * 4 + 2] << 8) |
        block[t * 4 + 3];
    }

    // Remaining 48 words
    for (let t = 16; t < 64; t++) {
      const s0 = this.ROTR(7, W[t - 15]) ^ this.ROTR(18, W[t - 15]) ^ (W[t - 15] >>> 3);
      const s1 = this.ROTR(17, W[t - 2]) ^ this.ROTR(19, W[t - 2]) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0;
    }

    this.state.W = W;

    // Visualize Schedule
    this.els.scheduleGrid.innerHTML = '';
    W.forEach((word, idx) => {
      const div = document.createElement('div');
      div.className = 'hex-cell';
      div.textContent = `W${idx}: ${this.toHex32(word)}`;
      this.els.scheduleGrid.appendChild(div);
    });
  }

  // Phase 3 Loop
  processRound() {
    if (this.state.round >= 64) {
      // End of block compression
      this.state.H[0] = (this.state.H[0] + this.state.a) | 0;
      this.state.H[1] = (this.state.H[1] + this.state.b) | 0;
      this.state.H[2] = (this.state.H[2] + this.state.c) | 0;
      this.state.H[3] = (this.state.H[3] + this.state.d) | 0;
      this.state.H[4] = (this.state.H[4] + this.state.e) | 0;
      this.state.H[5] = (this.state.H[5] + this.state.f) | 0;
      this.state.H[6] = (this.state.H[6] + this.state.g) | 0;
      this.state.H[7] = (this.state.H[7] + this.state.h) | 0;

      this.state.currentBlockIdx++;
      if (this.state.currentBlockIdx < this.state.blocks.length) {
        // Prepare next block
        this.state.round = 0;
        this.state.phase = 1;
        [
          this.state.a,
          this.state.b,
          this.state.c,
          this.state.d,
          this.state.e,
          this.state.f,
          this.state.g,
          this.state.h,
        ] = this.state.H;
        this.generateSchedule();
        return;
      } else {
        // Done entirely
        this.state.phase = 4;
        this.els.statusCompression.textContent = 'Done';
        this.els.statusCompression.className = 'status-badge done';
        this.finishHash();
        return;
      }
    }

    const t = this.state.round;
    const W = this.state.W;
    const K = this.constants.K;
    const { a, b, c, d, e, f, g, h } = this.state;

    const S1 = this.ROTR(6, e) ^ this.ROTR(11, e) ^ this.ROTR(25, e);
    const ch = (e & f) ^ (~e & g);
    const temp1 = (h + S1 + ch + K[t] + W[t]) | 0;

    const S0 = this.ROTR(2, a) ^ this.ROTR(13, a) ^ this.ROTR(22, a);
    const maj = (a & b) ^ (a & c) ^ (b & c);
    const temp2 = (S0 + maj) | 0;

    // Shift variables
    this.state.h = g;
    this.state.g = f;
    this.state.f = e;
    this.state.e = (d + temp1) | 0;
    this.state.d = c;
    this.state.c = b;
    this.state.b = a;
    this.state.a = (temp1 + temp2) | 0;

    // Update UI
    this.els.roundCounter.textContent = t + 1;
    this.els.valK.textContent = this.toHex32(K[t]);
    this.els.valW.textContent = this.toHex32(W[t]);
    this.els.valT1.textContent = this.toHex32(temp1);
    this.els.valT2.textContent = this.toHex32(temp2);

    this.updateRegistersUI();

    // Highlight Schedule Grid
    Array.from(this.els.scheduleGrid.children).forEach((el) => el.classList.remove('highlight'));
    if (this.els.scheduleGrid.children[t]) {
      this.els.scheduleGrid.children[t].classList.add('highlight');
      this.els.scheduleGrid.children[t].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    this.state.round++;
  }

  finishHash() {
    const finalHashStr = this.state.H.map((val) => this.toHex32(val)).join('');
    this.els.finalHashOutput.textContent = finalHashStr;
  }

  updateUI() {
    this.els.roundCounter.textContent = this.state.round;
  }

  updateRegistersUI() {
    this.els.regA.textContent = this.toHex32(this.state.a);
    this.els.regB.textContent = this.toHex32(this.state.b);
    this.els.regC.textContent = this.toHex32(this.state.c);
    this.els.regD.textContent = this.toHex32(this.state.d);
    this.els.regE.textContent = this.toHex32(this.state.e);
    this.els.regF.textContent = this.toHex32(this.state.f);
    this.els.regG.textContent = this.toHex32(this.state.g);
    this.els.regH.textContent = this.toHex32(this.state.h);

    // Add pulse animation class briefly
    const regs = [
      this.els.regA,
      this.els.regB,
      this.els.regC,
      this.els.regD,
      this.els.regE,
      this.els.regF,
      this.els.regG,
      this.els.regH,
    ];
    regs.forEach((r) => {
      const parent = r.parentElement;
      parent.classList.add('updated');
      setTimeout(() => parent.classList.remove('updated'), 200);
    });
  }

  // Utils
  ROTR(n, x) {
    return (x >>> n) | (x << (32 - n));
  }

  toHex32(num) {
    return (num >>> 0).toString(16).padStart(8, '0');
  }

  toHex8(num) {
    return (num >>> 0).toString(16).padStart(2, '0');
  }

  getConstants() {
    return {
      K: [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4,
        0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
        0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
        0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
        0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
        0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
        0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116,
        0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
        0xc67178f2,
      ],
    };
  }
}
