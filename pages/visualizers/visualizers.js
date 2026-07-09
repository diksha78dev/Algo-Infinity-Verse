feat: API Rate Limiting Visualizer
#1973
Open
diksha78dev
wants to merge 2 commits into
Eshajha19:main
from
diksha78dev:feat/api-rate-limiter-visualizer
+628
Lines changed: 628 additions & 0 deletions
Conversation14 (14)
Commits2 (2)
Checks0 (0)
Files changed3 (3)
Pull request toolbar
Open
feat: API Rate Limiting Visualizer
#1973
diksha78dev
wants to merge 2 commits into
Eshajha19:main
from
diksha78dev:feat/api-rate-limiter-visualizer
0 / 3 viewed
0 of 3 files viewed
Filter files…
File tree
pages/visualizers/api-rate-limiter-visualizer
api-rate-limiter-visualizer.css
1
api-rate-limiter-visualizer.html
3
api-rate-limiter-visualizer.js
3
‎pages/visualizers/api-rate-limiter-visualizer/api-rate-limiter-visualizer.css‎
+269
Lines changed: 269 additions & 0 deletions
Original file line number	Original file line	Diff line number	Diff line change
/* =========================================
   API Rate Limiter Visualizer Styles
   ========================================= */
.gw-body {
  margin: 0;
  padding: 0;
  background-color: #0f172a;
  color: #f8fafc;
  font-family: 'Poppins', sans-serif;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.gw-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 2rem;
  background-color: #1e293b;
  border-bottom: 1px solid #334155;
}
.gw-workspace {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.panel-left {
  width: 350px;
  background: #1e293b;
  border-right: 1px solid #334155;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  overflow-y: auto;
}
.panel-right {
  flex: 1;
  background-color: #0f172a;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  overflow: hidden;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #334155;
}
.panel-header h3 {
  margin: 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 1.1rem;
  color: #38bdf8;
}
.control-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.config-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.target-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.target-selector label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #cbd5e1;
}
select {
  padding: 0.5rem;
  background: #0f172a;
  color: #f8fafc;
  border: 1px solid #334155;
  border-radius: 4px;
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
}
.action-buttons {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}
button {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 6px;
  font-family: 'Orbitron', sans-serif;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
.btn-primary {
  background: #0284c7;
  color: white;
}
.btn-primary:hover {
  background: #0369a1;
}
.btn-secondary {
  background: #334155;
  color: white;
}
.btn-secondary:hover {
  background: #475569;
}
Comment on lines R109 to R140
coderabbitai[bot] commented 53 minutes ago
@coderabbitai[bot]
coderabbitai[bot]
52m ago
Contributor
🎯 Functional Correctness | 🟠 Major | ⚡ Quick win

No keyboard focus styles for buttons — WCAG 2.2 violation.

The button, .btn-primary, and .btn-secondary rules define :hover states but no :focus-visible styles. Keyboard users cannot see which button is focused. Add a visible focus indicator.

♿ Proposed fix: add focus-visible styles
📝 Committable suggestion
🧰 Tools
🤖 Prompt for AI Agents
Source: Coding guidelines

Write a reply
.log-console {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 1rem;
  font-family: 'Fira Code', monospace;
  font-size: 0.8rem;
  color: #10b981;
  flex: 1;
  overflow-y: auto;
  line-height: 1.5;
}
.state-badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  background: #334155;
  color: white;
  font-weight: bold;
}
.state-badge.success {
  background: #10b981;
}
.state-badge.error {
  background: #ef4444;
}
.state-badge.warn {
  background: #f59e0b;
}
/* Visualization Canvas */
.visualization-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 900px;
  height: 100%;
  gap: 2rem;
  position: relative;
}
.bucket-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}
.bucket {
  width: 150px;
  height: 200px;
  border: 4px solid #334155;
  border-top: none;
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 16px;
  position: relative;
  overflow: hidden;
  background: rgba(30, 41, 59, 0.4);
}
.bucket-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(56, 189, 248, 0.5);
  transition: height 0.3s ease;
}
.bucket-label {
  font-family: 'Fira Code', monospace;
  font-weight: bold;
  color: #38bdf8;
  font-size: 1.2rem;
}
.requests-track {
  width: 80%;
  height: 100px;
  position: relative;
  border-bottom: 2px dashed #334155;
}
.req-packet {
  position: absolute;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #38bdf8;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.8rem;
  transition:
    left 0.5s linear,
    opacity 0.3s;
  box-shadow: 0 0 10px #38bdf8;
}
.req-packet.accepted {
  background: #10b981;
  box-shadow: 0 0 10px #10b981;
}
.req-packet.rejected {
  background: #ef4444;
  box-shadow: 0 0 10px #ef4444;
  animation: drop-packet 0.5s forwards;
}
@keyframes drop-packet {
  0% {
    transform: translateY(-50%);
    opacity: 1;
  }
  100% {
    transform: translateY(100px) rotate(45deg);
    opacity: 0;
  }
}
‎pages/visualizers/api-rate-limiter-visualizer/api-rate-limiter-visualizer.html‎
+132
Lines changed: 132 additions & 0 deletions
Original file line number	Original file line	Diff line number	Diff line change
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>API Rate Limiting Visualizer | Algo Infinity Verse</title>
    <meta
      name="description"
      content="Simulate and visualize Token Bucket, Leaky Bucket, Fixed Window, and Sliding Window rate limiting algorithms."
Comment on line R9
coderabbitai[bot] commented 53 minutes ago
@coderabbitai[bot]
coderabbitai[bot]
53m ago
Contributor
🗄️ Data Integrity & Integration | 🟡 Minor | ⚡ Quick win

🧩 Analysis chain
Add “Fixed Window” to the catalog description.
pages/visualizers/visualizers.js still says “Token Bucket, Leaky Bucket, and Sliding Window,” which drops one of the four algorithms shown in the visualizer.

🤖 Prompt for AI Agents
Write a reply
    />
    <link
      href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Poppins:wght@300;400;500;600;700&family=Fira+Code:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
    />
    <link rel="stylesheet" href="/styles.css" />
    <link rel="stylesheet" href="api-rate-limiter-visualizer.css" />
  </head>
  <body class="gw-body">
    <nav class="navbar gw-nav">
      <div class="nav-logo">
        <span class="logo-text">∞</span>
        <span class="logo-title">Algo Infinity Verse</span>
      </div>
      <div class="engine-badge"><i class="fas fa-tachometer-alt"></i> Rate Limiter Simulator</div>
    </nav>
    <main class="gw-workspace">
      <div class="panel-left">
        <div class="panel-header">
          <h3><i class="fas fa-sliders-h"></i> Configuration</h3>
        </div>
        <div class="control-section">
          <div class="target-selector">
            <label for="algorithmSelect">Algorithm</label>
            <select id="algorithmSelect">
              <option value="token_bucket">Token Bucket</option>
              <option value="leaky_bucket">Leaky Bucket</option>
              <option value="fixed_window">Fixed Window</option>
              <option value="sliding_window">Sliding Window</option>
            </select>
          </div>
          <div class="config-grid">
            <div class="target-selector">
              <label id="capacityLabel">Bucket Capacity / Limit</label>
Comment on line R52
coderabbitai[bot] commented 53 minutes ago
@coderabbitai[bot]
coderabbitai[bot]
53m ago
Contributor
🎯 Functional Correctness | 🟠 Major | ⚡ Quick win

Labels are not associated with their inputs for screen readers.

capacityLabel and refillLabel have id attributes for JS text updates but lack for attributes pointing to capacityInput and refillRateInput. Screen readers cannot announce the input purpose. Add for attributes to each label.

♿ Proposed fix for label associations
Also applies to: 73-73

🤖 Prompt for AI Agents
Source: Coding guidelines

Write a reply
              <input
                type="number"
                id="capacityInput"
                value="5"
                min="1"
                max="50"
                style="
                  padding: 0.5rem;
                  background: #0f172a;
                  color: #f8fafc;
                  border: 1px solid #334155;
                  border-radius: 4px;
                  font-family: 'Fira Code', monospace;
                  width: 100%;
                  box-sizing: border-box;
                "
              />
            </div>
            <div class="target-selector" id="refillRateContainer">
              <label id="refillLabel">Refill Rate (tokens/sec)</label>
              <input
                type="number"
                id="refillRateInput"
                value="2"
                min="1"
                max="20"
                style="
                  padding: 0.5rem;
                  background: #0f172a;
                  color: #f8fafc;
                  border: 1px solid #334155;
                  border-radius: 4px;
                  font-family: 'Fira Code', monospace;
                  width: 100%;
                  box-sizing: border-box;
                "
              />
            </div>
          </div>
          <div class="action-buttons">
            <button id="btnSendRequest" class="btn-primary">
              <i class="fas fa-paper-plane"></i> Send Request
            </button>
            <button id="btnBurst" class="btn-primary" style="background: #8b5cf6">
              <i class="fas fa-bolt"></i> Burst (5x)
            </button>
            <button id="btnReset" class="btn-secondary">
              <i class="fas fa-rotate-left"></i> Reset
            </button>
          </div>
        </div>
        <div class="panel-header" style="margin-top: 2rem">
          <h3><i class="fas fa-terminal"></i> Traffic Logs</h3>
          <span id="requestStatus" class="state-badge">IDLE</span>
        </div>
        <div class="log-console" id="logOutput">Ready to receive requests...</div>
Comment on line R111
coderabbitai[bot] commented 53 minutes ago
@coderabbitai[bot]
coderabbitai[bot]
53m ago
Contributor
🎯 Functional Correctness | 🟠 Major | ⚡ Quick win

Log console lacks aria-live for dynamic content announcements.

The traffic log updates dynamically via logMessage, but screen readers won't announce new entries. Add aria-live="polite" and role="log" to the log console.

♿ Proposed fix for log console accessibility
📝 Committable suggestion
🤖 Prompt for AI Agents
Source: Coding guidelines

Write a reply
      </div>
      <div class="panel-right">
        <div class="visualization-area">
          <div class="bucket-container" id="bucketContainer">
            <div class="bucket">
              <div class="bucket-fill" id="bucketFill"></div>
            </div>
            <div class="bucket-label" id="bucketStatus">Tokens: 5 / 5</div>
          </div>
          <div class="requests-track" id="requestsTrack">
            <!-- Animated requests will appear here -->
          </div>
        </div>
      </div>
    </main>
    <script src="api-rate-limiter-visualizer.js"></script>
  </body>
</html>
‎pages/visualizers/api-rate-limiter-visualizer/api-rate-limiter-visualizer.js‎
+227
Lines changed: 227 additions & 0 deletions
Original file line number	Original file line	Diff line number	Diff line change
document.addEventListener('DOMContentLoaded', () => {
  const btnSendRequest = document.getElementById('btnSendRequest');
  const btnBurst = document.getElementById('btnBurst');
  const btnReset = document.getElementById('btnReset');
  const logOutput = document.getElementById('logOutput');
  const requestStatus = document.getElementById('requestStatus');
  const algorithmSelect = document.getElementById('algorithmSelect');
  const capacityInput = document.getElementById('capacityInput');
  const refillRateInput = document.getElementById('refillRateInput');
  const bucketFill = document.getElementById('bucketFill');
  const bucketStatus = document.getElementById('bucketStatus');
  const requestsTrack = document.getElementById('requestsTrack');
  const refillRateContainer = document.getElementById('refillRateContainer');
  const capacityLabel = document.getElementById('capacityLabel');
  let state = {
    tokens: 0,
    capacity: 5,
    refillRate: 2,
    lastRefill: Date.now(),
    windowStart: Date.now(),
    requestCount: 0,
    slidingWindowLog: [],
  };
  function setStatus(status, type) {
    requestStatus.textContent = status;
    requestStatus.className = `state-badge ${type}`;
  }
  function logMessage(msg, type = 'info') {
    const color = type === 'error' ? '#ef4444' : type === 'warn' ? '#f59e0b' : '#10b981';
    logOutput.innerHTML += `<br><span style="color:${color}">> ${msg}</span>`;
    logOutput.scrollTop = logOutput.scrollHeight;
Comment on lines R33 to R36
coderabbitai[bot] commented 53 minutes ago
@coderabbitai[bot]
coderabbitai[bot]
53m ago
Contributor
🔒 Security & Privacy | 🟠 Major | ⚡ Quick win

innerHTML += with unsanitized content — XSS risk and O(n²) re-parse.

logMessage injects msg via innerHTML += without escaping. All current call sites pass static strings, so there's no immediate exploit, but this degrades security posture for future changes. Additionally, innerHTML += re-parses the entire log on each call, which degrades as the log grows.

🔒 Proposed fix: use DOM APIs instead of innerHTML
📝 Committable suggestion
🤖 Prompt for AI Agents
Write a reply
  }
  function updateVisuals() {
    let fillPercentage = 0;
    switch (algorithmSelect.value) {
      case 'token_bucket':
        fillPercentage = (state.tokens / state.capacity) * 100;
        bucketStatus.textContent = `Tokens: ${Math.floor(state.tokens)} / ${state.capacity}`;
        break;
      case 'leaky_bucket':
        // For leaky bucket, tokens represent "water" in the bucket
        fillPercentage = (state.tokens / state.capacity) * 100;
        bucketStatus.textContent = `Water: ${Math.floor(state.tokens)} / ${state.capacity}`;
        break;
      case 'fixed_window':
      case 'sliding_window':
        fillPercentage = (state.requestCount / state.capacity) * 100;
        bucketStatus.textContent = `Requests: ${state.requestCount} / ${state.capacity}`;
        break;
    }
    bucketFill.style.height = `${Math.min(100, Math.max(0, fillPercentage))}%`;
  }
  function updateLogic() {
    const now = Date.now();
    const algorithm = algorithmSelect.value;
    state.capacity = parseInt(capacityInput.value) || 5;
    state.refillRate = parseInt(refillRateInput.value) || 2;
    if (algorithm === 'token_bucket') {
      const elapsed = (now - state.lastRefill) / 1000;
      const tokensToAdd = elapsed * state.refillRate;
      if (tokensToAdd >= 1) {
        state.tokens = Math.min(state.capacity, state.tokens + tokensToAdd);
        state.lastRefill = now;
      }
    } else if (algorithm === 'leaky_bucket') {
      // Leak water over time
      const elapsed = (now - state.lastRefill) / 1000;
      const leaked = elapsed * state.refillRate;
      if (leaked >= 1) {
        state.tokens = Math.max(0, state.tokens - leaked);
        state.lastRefill = now;
      }
    } else if (algorithm === 'fixed_window') {
      // Reset window every 10 seconds for visualization purposes
      const windowSize = 10000;
      if (now - state.windowStart > windowSize) {
        state.windowStart = now;
        state.requestCount = 0;
        logMessage('--- New Fixed Window Started ---', 'info');
      }
    } else if (algorithm === 'sliding_window') {
      // Remove logs older than window size (10 seconds)
      const windowSize = 10000;
      state.slidingWindowLog = state.slidingWindowLog.filter((time) => now - time < windowSize);
      state.requestCount = state.slidingWindowLog.length;
    }
    updateVisuals();
  }
  function checkRateLimit() {
    const algorithm = algorithmSelect.value;
    const now = Date.now();
    let allowed = false;
    if (algorithm === 'token_bucket') {
      if (state.tokens >= 1) {
        state.tokens--;
        allowed = true;
      }
    } else if (algorithm === 'leaky_bucket') {
      if (state.tokens < state.capacity) {
        state.tokens++;
        allowed = true;
      }
    } else if (algorithm === 'fixed_window') {
      if (state.requestCount < state.capacity) {
        state.requestCount++;
        allowed = true;
      }
    } else if (algorithm === 'sliding_window') {
      if (state.slidingWindowLog.length < state.capacity) {
        state.slidingWindowLog.push(now);
        state.requestCount++;
        allowed = true;
      }
    }
    return allowed;
  }
  function handleAlgorithmChange() {
    const algo = algorithmSelect.value;
    if (algo === 'token_bucket' || algo === 'leaky_bucket') {
      refillRateContainer.style.display = 'flex';
      capacityLabel.textContent =
        algo === 'token_bucket' ? 'Bucket Capacity (Tokens)' : 'Bucket Capacity (Water)';
    } else {
      refillRateContainer.style.display = 'none';
      capacityLabel.textContent = 'Request Limit (per 10s window)';
    }
    resetSimulation();
  }
  function resetSimulation() {
    state.capacity = parseInt(capacityInput.value) || 5;
    state.refillRate = parseInt(refillRateInput.value) || 2;
    state.tokens = algorithmSelect.value === 'token_bucket' ? state.capacity : 0;
    state.lastRefill = Date.now();
    state.windowStart = Date.now();
    state.requestCount = 0;
    state.slidingWindowLog = [];
    requestsTrack.innerHTML = '';
    logOutput.innerHTML = '> Simulation reset. Ready to receive requests...';
    setStatus('IDLE', '');
    updateVisuals();
  }
  function animateRequest(isAllowed) {
    const req = document.createElement('div');
    req.className = 'req-packet';
    req.innerHTML = '<i class="fas fa-envelope"></i>';
    requestsTrack.appendChild(req);
Comment on lines R162 to R166
coderabbitai[bot] commented 53 minutes ago
@coderabbitai[bot]
coderabbitai[bot]
53m ago
Contributor
🎯 Functional Correctness | 🟡 Minor | ⚡ Quick win

Dynamically created icon lacks aria-hidden="true".

The envelope icon injected via req.innerHTML is decorative but not hidden from screen readers. Add aria-hidden="true" to the <i> element.

♿ Proposed fix for icon accessibility
📝 Committable suggestion
🤖 Prompt for AI Agents
Source: Coding guidelines

Write a reply
    // Force reflow
    void req.offsetWidth;
    req.style.left = '80%';
    setTimeout(() => {
      if (isAllowed) {
        req.classList.add('accepted');
        req.style.left = '100%';
        req.style.opacity = '0';
      } else {
        req.classList.add('rejected');
      }
      setTimeout(() => {
        if (requestsTrack.contains(req)) {
          requestsTrack.removeChild(req);
        }
      }, 500);
    }, 500);
  }
  function sendSingleRequest() {
    const isAllowed = checkRateLimit();
    updateVisuals();
    if (isAllowed) {
      logMessage('Request Accepted (200 OK)', 'success');
      setStatus('200 OK', 'success');
    } else {
      logMessage('Request Throttled (429 Too Many Requests)', 'error');
      setStatus('429 TOO MANY REQUESTS', 'error');
    }
    animateRequest(isAllowed);
  }
  btnSendRequest.addEventListener('click', sendSingleRequest);
  btnBurst.addEventListener('click', () => {
    let count = 0;
    const interval = setInterval(() => {
      if (count >= 5) {
        clearInterval(interval);
        return;
      }
      sendSingleRequest();
      count++;
    }, 200);
  });
Comment on lines R207 to R217
coderabbitai[bot] commented 53 minutes ago
@coderabbitai[bot]
coderabbitai[bot]
53m ago
Contributor
🎯 Functional Correctness | 🟠 Major | ⚡ Quick win

Burst interval is not cleared on reset — requests continue after reset.

The setInterval inside the burst handler is scoped to the closure and never tracked. If the user clicks Reset during a burst, resetSimulation clears the visual state but the interval keeps firing sendSingleRequest against the fresh state, producing unexpected accepted/dropped requests.

🐛 Proposed fix: track and clear burst interval
🤖 Prompt for AI Agents
Write a reply
  btnReset.addEventListener('click', resetSimulation);
  algorithmSelect.addEventListener('change', handleAlgorithmChange);
  capacityInput.addEventListener('change', resetSimulation);
  refillRateInput.addEventListener('change', resetSimulation);
  // Initialize
  handleAlgorithmChange();
  setInterval(updateLogic, 100);
});
