/**
 * multiplayer-workspace.js
 * Handles the CodeMirror initialization, UI interactions, and a comprehensive
 * frontend simulation of the WebSockets/CRDT integration for peer collaboration.
 */

document.addEventListener("DOMContentLoaded", () => {
    initWorkspace();
});

const els = {
    roomIdDisplay: document.getElementById('roomIdDisplay'),
    btnCopyLink: document.getElementById('btnCopyLink'),
    participantsList: document.getElementById('participantsList'),
    editorContainer: document.getElementById('editorContainer'),
    btnRunCode: document.getElementById('btnRunCode'),
    consoleOutput: document.getElementById('consoleOutput'),
    btnClearConsole: document.getElementById('btnClearConsole'),
    chatInput: document.getElementById('chatInput'),
    btnSendChat: document.getElementById('btnSendChat'),
    chatMessages: document.getElementById('chatMessages')
};

let editor;
let currentRoomId = '';

function initWorkspace() {
    // 1. Setup Room ID
    setupRoomSession();

    // 2. Initialize CodeMirror
    editor = CodeMirror(els.editorContainer, {
        lineNumbers: true,
        theme: 'dracula',
        mode: 'javascript',
        value: `/**
 * Problem: Two Sum
 * Language: JavaScript
 */

function twoSum(nums, target) {
    const map = new Map();
    
    for (let i = 0; i < nums.length; i++) {
        // Start typing here...
    }
}
`,
        indentUnit: 4,
        matchBrackets: true,
        autoCloseBrackets: true
    });

    // 3. Bind Events
    setupEventListeners();

    // 4. Start Multiplayer Simulation
    simulatePeerConnection();
}

function setupRoomSession() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('room')) {
        currentRoomId = urlParams.get('room');
    } else {
        // Generate new room ID
        currentRoomId = Math.random().toString(36).substring(2, 10).toUpperCase();
        // Update URL without refreshing
        window.history.replaceState({}, '', `?room=${currentRoomId}`);
    }
    els.roomIdDisplay.textContent = currentRoomId;
}

function setupEventListeners() {
    els.btnCopyLink.addEventListener('click', () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            const originalHTML = els.btnCopyLink.innerHTML;
            els.btnCopyLink.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => els.btnCopyLink.innerHTML = originalHTML, 2000);
        });
    });

    els.btnRunCode.addEventListener('click', runMockEvaluation);
    els.btnClearConsole.addEventListener('click', () => els.consoleOutput.innerHTML = '');

    // Chat functionality
    const sendMessage = () => {
        const text = els.chatInput.value.trim();
        if (text) {
            appendChatMessage('You', text, 'self');
            els.chatInput.value = '';
            
            // Mock auto-reply
            if(text.toLowerCase().includes('hello')) {
                setTimeout(() => appendChatMessage('Alex', 'Hey! Let\'s solve this optimally using a Hash Map.', 'peer', '#ec4899'), 1000);
            }
        }
    };

    els.btnSendChat.addEventListener('click', sendMessage);
    els.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}

function appendChatMessage(sender, text, type, color = '') {
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg ${type}`;
    
    if (type === 'peer') {
        msgDiv.innerHTML = `<div class="peer-name" style="color:${color}">${sender}</div>${text}`;
    } else {
        msgDiv.textContent = text;
    }
    
    els.chatMessages.appendChild(msgDiv);
    els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
}

function runMockEvaluation() {
    els.consoleOutput.innerHTML = `<span style="color: #f1fa8c;">> Executing solution...</span><br>`;
    
    setTimeout(() => {
        // Simple mock evaluating logic
        const code = editor.getValue();
        if (code.includes('target - nums[i]') && code.includes('map.set')) {
            els.consoleOutput.innerHTML += `<span class="success">✓ Test Case 1 Passed (Output: [0, 1])</span><br>`;
            els.consoleOutput.innerHTML += `<span class="success">✓ Test Case 2 Passed (Output: [1, 2])</span><br>`;
            els.consoleOutput.innerHTML += `<span class="success">✓ Test Case 3 Passed (Output: [0, 1])</span><br>`;
            els.consoleOutput.innerHTML += `<br><span class="success"><strong>All tests passed! Optimal O(N) solution detected.</strong></span>`;
        } else {
            els.consoleOutput.innerHTML += `<span class="error">✗ Test Case 1 Failed</span><br>`;
            els.consoleOutput.innerHTML += `<span class="error">Output undefined or incorrect. Did you return the indices?</span>`;
        }
    }, 800);
}

// ==========================================
// MULTIPLAYER SIMULATION (ACCEPTANCE CRITERIA)
// ==========================================

// This function simulates the behavior of Yjs/Socket.io connecting
function simulatePeerConnection() {
    setTimeout(() => {
        // 1. Peer Joins
        addParticipant('Alex', 'A', 'var(--cursor-peer1)');
        appendChatMessage('System', 'Alex joined the room.', 'system');

        // 2. Simulate Peer setting up their cursor
        setTimeout(() => {
            simulateRemoteCursor('Alex', 'var(--cursor-peer1)', {line: 9, ch: 8});
            
            // 3. Simulate Peer typing code to demonstrate Concurrent Edits capability
            simulateRemoteTyping('const complement = target - nums[i];\n        ', {line: 9, ch: 8});
        }, 1500);

    }, 3000);
}

function addParticipant(name, initial, color) {
    const avatar = document.createElement('div');
    avatar.className = 'avatar peer-avatar';
    avatar.title = name;
    avatar.textContent = initial;
    avatar.style.backgroundColor = color;
    els.participantsList.appendChild(avatar);
}

// Simulates drawing a remote cursor widget in CodeMirror
let remoteCursorWidget = null;
let bookmark = null;

function simulateRemoteCursor(name, color, pos) {
    if (bookmark) bookmark.clear();
    
    const cursorEl = document.createElement('div');
    cursorEl.className = 'remote-cursor-widget';
    cursorEl.style.borderColor = color;
    cursorEl.style.height = '1.2em';
    
    const nameEl = document.createElement('div');
    nameEl.className = 'remote-cursor-name';
    nameEl.style.backgroundColor = color;
    nameEl.textContent = name;
    cursorEl.appendChild(nameEl);

    bookmark = editor.setBookmark(pos, { widget: cursorEl, insertLeft: true });
}

// Simulates real-time character-by-character incoming WebSocket operations
function simulateRemoteTyping(text, startPos) {
    let currentPos = { ...startPos };
    let i = 0;
    
    const typeChar = () => {
        if (i < text.length) {
            const char = text[i];
            // Insert character programmatically
            editor.replaceRange(char, currentPos, currentPos, '*remote');
            
            // Update position
            if (char === '\n') {
                currentPos.line += 1;
                currentPos.ch = 0;
            } else {
                currentPos.ch += 1;
            }
            
            // Move remote cursor
            simulateRemoteCursor('Alex', 'var(--cursor-peer1)', currentPos);
            
            i++;
            setTimeout(typeChar, 80 + Math.random() * 100); // Random human-like typing speed
        } else {
            // Clear cursor name after typing stops
            setTimeout(() => {
                if(bookmark) bookmark.widgetNode.querySelector('.remote-cursor-name').style.display = 'none';
            }, 1000);
        }
    };
    
    typeChar();
}
