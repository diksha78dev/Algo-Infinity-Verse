/* chord-simulator.js */

const UI = {
    newNodeId: document.getElementById('newNodeId'),
    btnAddNode: document.getElementById('btnAddNode'),
    startNodeSelect: document.getElementById('startNodeSelect'),
    targetKey: document.getElementById('targetKey'),
    btnLookup: document.getElementById('btnLookup'),
    nodeInspector: document.getElementById('nodeInspector'),
    logTerminal: document.getElementById('logTerminal'),
    canvas: document.getElementById('chordCanvas')
};

const ctx = UI.canvas.getContext('2d');
let cw, ch;
let rx, ry, rRadius; // Ring parameters

function resize() {
    cw = UI.canvas.width = UI.canvas.parentElement.clientWidth;
    ch = UI.canvas.height = UI.canvas.parentElement.clientHeight;
    rx = cw / 2;
    ry = ch / 2;
    rRadius = Math.min(cw, ch) / 2.5;
}
window.addEventListener('resize', resize);
resize();

function log(msg, type = '') {
    const div = document.createElement('div');
    div.className = `log-entry ${type ? 'log-' + type : ''}`;
    div.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
    UI.logTerminal.appendChild(div);
    UI.logTerminal.scrollTop = UI.logTerminal.scrollHeight;
}

// --- Chord Protocol State ---
const M = 6;
const MAX_KEYS = 64; // 2^M

class ChordNode {
    constructor(id) {
        this.id = id;
        this.finger = new Array(M).fill(null);
        this.keys = [];
        this.predecessor = null;
        this.successor = null;
    }
}

let chordNodes = []; // List of ChordNode sorted by ID
let selectedNode = null;
let lookupPath = []; // Path of node IDs visited during active query
let activeLookupTarget = null;
let currentHopIndex = 0;
let animateHopProgress = 0;

function initChord() {
    chordNodes = [];
    lookupPath = [];
    activeLookupTarget = null;
    selectedNode = null;
    
    // Add 3 default nodes
    addNode(8);
    addNode(32);
    addNode(48);
    
    updateFingers();
    distributeKeys();
    updateUI();
}

function updateUI() {
    // Populate startNodeSelect
    UI.startNodeSelect.innerHTML = '';
    chordNodes.forEach(node => {
        const option = document.createElement('option');
        option.value = node.id;
        option.innerText = `Node ${node.id}`;
        UI.startNodeSelect.appendChild(option);
    });

    // Inspect selected node
    if (selectedNode) {
        inspectNode(selectedNode.id);
    } else {
        UI.nodeInspector.innerHTML = `<p class="text-secondary">Click on any node in the ring to inspect its predecessor, successor, and Finger Table.</p>`;
    }
}

function addNode(id) {
    if (chordNodes.some(n => n.id === id)) {
        log(`Node ${id} already exists on the ring.`, "error");
        return;
    }
    
    const newNode = new ChordNode(id);
    chordNodes.push(newNode);
    chordNodes.sort((a, b) => a.id - b.id);
    
    // Link successor and predecessor
    for (let i = 0; i < chordNodes.length; i++) {
        const current = chordNodes[i];
        const next = chordNodes[(i + 1) % chordNodes.length];
        const prev = chordNodes[(i - 1 + chordNodes.length) % chordNodes.length];
        
        current.successor = next;
        current.predecessor = prev;
    }
    
    log(`Node ${id} joined the Chord ring.`, "success");
    updateFingers();
    distributeKeys();
    updateUI();
}

function removeNode(id) {
    if (chordNodes.length <= 1) {
        log("Cannot remove the last remaining node on the ring.", "error");
        return;
    }
    
    const idx = chordNodes.findIndex(n => n.id === id);
    if (idx === -1) return;
    
    const deleted = chordNodes[idx];
    chordNodes.splice(idx, 1);
    
    // Relink successor/predecessor
    for (let i = 0; i < chordNodes.length; i++) {
        const current = chordNodes[i];
        const next = chordNodes[(i + 1) % chordNodes.length];
        const prev = chordNodes[(i - 1 + chordNodes.length) % chordNodes.length];
        
        current.successor = next;
        current.predecessor = prev;
    }
    
    log(`Node ${id} left the Chord ring.`, "warn");
    
    if (selectedNode && selectedNode.id === id) {
        selectedNode = null;
    }
    
    updateFingers();
    distributeKeys();
    updateUI();
}

function updateFingers() {
    chordNodes.forEach(node => {
        for (let k = 1; k <= M; k++) {
            const start = (node.id + Math.pow(2, k - 1)) % MAX_KEYS;
            node.finger[k - 1] = findSuccessorImmediate(start);
        }
    });
}

function findSuccessorImmediate(id) {
    // Find first node >= id on the ring (taking wrap-around into account)
    for (let i = 0; i < chordNodes.length; i++) {
        if (chordNodes[i].id >= id) {
            return chordNodes[i];
        }
    }
    // Wrap around to first node
    return chordNodes[0];
}

function distributeKeys() {
    // Clear node keys
    chordNodes.forEach(n => n.keys = []);
    
    // We arbitrarily simulate 10 keys distributed across the ring
    const sampleKeys = [5, 14, 22, 35, 41, 47, 50, 58, 60, 63];
    sampleKeys.forEach(k => {
        const succ = findSuccessorImmediate(k);
        succ.keys.push(k);
    });
}

function startLookup(startId, keyId) {
    lookupPath = [startId];
    activeLookupTarget = keyId;
    currentHopIndex = 0;
    animateHopProgress = 0;
    
    log(`Lookup query started from Node ${startId} for Key ${keyId}...`, "info");
    stepLookup();
}

function stepLookup() {
    const currentNodeId = lookupPath[lookupPath.length - 1];
    const currentNode = chordNodes.find(n => n.id === currentNodeId);
    
    // Check if current node is successor for keyId
    // A node is successor for keyId if keyId lies in interval (predecessor, node]
    const predId = currentNode.predecessor.id;
    if (isBetweenLeftOpen(activeLookupTarget, predId, currentNodeId)) {
        log(`Key ${activeLookupTarget} successfully resolved at successor Node ${currentNodeId}!`, "success");
        activeLookupTarget = null; // Query finished
        return;
    }
    
    // Else find closest preceding node using Finger Table
    const nextHopNode = closestPrecedingNode(currentNode, activeLookupTarget);
    if (nextHopNode.id === currentNode.id) {
        // Fallback to successor
        const succ = currentNode.successor;
        log(`Query hopped to successor Node ${succ.id} because finger table did not yield a closer preceding node.`, "warn");
        lookupPath.push(succ.id);
    } else {
        log(`Query routed through finger table to Node ${nextHopNode.id}.`);
        lookupPath.push(nextHopNode.id);
    }
}

function closestPrecedingNode(node, id) {
    for (let i = M - 1; i >= 0; i--) {
        const fingerNode = node.finger[i];
        if (fingerNode && isBetweenOpen(fingerNode.id, node.id, id)) {
            return fingerNode;
        }
    }
    return node;
}

// Helpers for ring intervals
function isBetweenLeftOpen(id, left, right) {
    if (left < right) {
        return id > left && id <= right;
    } else {
        return id > left || id <= right; // wrap around
    }
}

function isBetweenOpen(id, left, right) {
    if (left < right) {
        return id > left && id < right;
    } else {
        return id > left || id < right; // wrap around
    }
}

function inspectNode(id) {
    const node = chordNodes.find(n => n.id === id);
    if (!node) return;
    
    selectedNode = node;
    
    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>Node ${node.id}</strong>
            <button class="btn btn-warning" onclick="removeNode(${node.id})" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">
                <i class="fas fa-trash"></i> Leave Ring
            </button>
        </div>
        <p class="mt-2">Successor: <strong>Node ${node.successor.id}</strong></p>
        <p>Predecessor: <strong>Node ${node.predecessor.id}</strong></p>
        <p>Stored Keys: <strong>[${node.keys.join(', ')}]</strong></p>
        
        <table class="inspector-table">
            <thead>
                <tr>
                    <th>Finger (i)</th>
                    <th>Start (n + 2^(i-1))</th>
                    <th>Successor Node</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    for (let i = 1; i <= M; i++) {
        const start = (node.id + Math.pow(2, i - 1)) % MAX_KEYS;
        const targetNode = node.finger[i - 1];
        html += `
            <tr>
                <td>${i}</td>
                <td>${start}</td>
                <td style="color:#0984e3; font-weight:bold;">Node ${targetNode.id}</td>
            </tr>
        `;
    }
    
    html += `
            </tbody>
        </table>
    `;
    
    UI.nodeInspector.innerHTML = html;
}

// --- Draw Code ---
function getRingCoords(id) {
    const angle = (id / MAX_KEYS) * Math.PI * 2 - Math.PI / 2;
    return {
        x: rx + Math.cos(angle) * rRadius,
        y: ry + Math.sin(angle) * rRadius
    };
}

function render() {
    ctx.clearRect(0, 0, cw, ch);
    
    // 1. Draw Ring Circle
    ctx.beginPath();
    ctx.arc(rx, ry, rRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 2. Draw slots (0-63 tick marks)
    for (let i = 0; i < MAX_KEYS; i++) {
        const startCoords = getRingCoords(i);
        const angle = (i / MAX_KEYS) * Math.PI * 2 - Math.PI / 2;
        const tx = rx + Math.cos(angle) * (rRadius + 5);
        const ty = ry + Math.sin(angle) * (rRadius + 5);
        
        ctx.beginPath();
        ctx.moveTo(startCoords.x, startCoords.y);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // 3. Draw hop animation if active
    if (activeLookupTarget !== null && lookupPath.length > 0) {
        animateHopProgress += 0.02;
        
        const fromId = lookupPath[currentHopIndex];
        const toId = lookupPath[currentHopIndex + 1];
        
        if (toId !== undefined) {
            const p1 = getRingCoords(fromId);
            const p2 = getRingCoords(toId);
            
            // Draw connection line
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = '#3fb950';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw animating packet dot
            const px = p1.x + (p2.x - p1.x) * animateHopProgress;
            const py = p1.y + (p2.y - p1.y) * animateHopProgress;
            ctx.beginPath();
            ctx.arc(px, py, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#3fb950';
            ctx.fill();
            
            if (animateHopProgress >= 1) {
                currentHopIndex++;
                animateHopProgress = 0;
                stepLookup();
            }
        }
    }

    // 4. Draw active nodes
    chordNodes.forEach(node => {
        const coords = getRingCoords(node.id);
        
        // Glow if selected
        if (selectedNode && selectedNode.id === node.id) {
            ctx.beginPath();
            ctx.arc(coords.x, coords.y, 18, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(9, 132, 227, 0.3)';
            ctx.fill();
        }
        
        ctx.beginPath();
        ctx.arc(coords.x, coords.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#0984e3';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px Poppins';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`N${node.id}`, coords.x, coords.y);
        
        // Draw key count indicator on node
        if (node.keys.length > 0) {
            ctx.fillStyle = '#e28743';
            ctx.fillRect(coords.x + 8, coords.y - 12, 10, 10);
            ctx.fillStyle = '#fff';
            ctx.font = '7px Fira Code';
            ctx.fillText(node.keys.length, coords.x + 13, coords.y - 7);
        }
    });

    // 5. Draw active lookup target key on ring
    if (activeLookupTarget !== null) {
        const kCoords = getRingCoords(activeLookupTarget);
        ctx.beginPath();
        ctx.arc(kCoords.x, kCoords.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#e28743';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.stroke();
        
        ctx.fillStyle = '#e28743';
        ctx.font = '8px Fira Code';
        ctx.fillText(`K${activeLookupTarget}`, kCoords.x, kCoords.y - 10);
    }
    
    requestAnimationFrame(render);
}

// Global click handler to select node in ring
UI.canvas.addEventListener('click', (e) => {
    const rect = UI.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (let i = 0; i < chordNodes.length; i++) {
        const coords = getRingCoords(chordNodes[i].id);
        const dist = Math.hypot(coords.x - mx, coords.y - my);
        if (dist <= 15) {
            inspectNode(chordNodes[i].id);
            break;
        }
    }
});

// Controls Action listeners
UI.btnAddNode.addEventListener('click', () => {
    const val = parseInt(UI.newNodeId.value);
    if (isNaN(val) || val < 0 || val >= MAX_KEYS) return;
    addNode(val);
});

UI.btnLookup.addEventListener('click', () => {
    const startId = parseInt(UI.startNodeSelect.value);
    const key = parseInt(UI.targetKey.value);
    if (isNaN(startId) || isNaN(key) || key < 0 || key >= MAX_KEYS) return;
    startLookup(startId, key);
});

// Exposure for inspector leave-button onclick
window.removeNode = removeNode;

// Init
initChord();
render();
