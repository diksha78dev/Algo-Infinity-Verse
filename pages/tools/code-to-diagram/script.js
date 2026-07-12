

const examples = {
  javascript: `// Binary Search
function binarySearch(arr, target) {
    let left = 0;
    let right = arr.length - 1;
    
    while (left <= right) {
        let mid = Math.floor((left + right) / 2);
        
        if (arr[mid] === target) {
            return mid;
        }
        if (arr[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return -1;
}`,

  python: `# Quick Sort
def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[0]
    left = [x for x in arr[1:] if x <= pivot]
    right = [x for x in arr[1:] if x > pivot]
    return quick_sort(left) + [pivot] + quick_sort(right)`,

  java: `// Bubble Sort
public class BubbleSort {
    void bubbleSort(int arr[]) {
        int n = arr.length;
        for (int i = 0; i < n-1; i++) {
            for (int j = 0; j < n-i-1; j++) {
                if (arr[j] > arr[j+1]) {
                    int temp = arr[j];
                    arr[j] = arr[j+1];
                    arr[j+1] = temp;
                }
            }
        }
    }
}`
};

document.addEventListener('DOMContentLoaded', function() {
  const codeInput = document.getElementById('codeInput');
  const generateBtn = document.getElementById('generateBtn');
  const exampleBtn = document.getElementById('exampleBtn');
  const clearBtn = document.getElementById('clearBtn');
  const languageSelect = document.getElementById('languageSelect');
  const diagramType = document.getElementById('diagramType');
  const diagramContainer = document.getElementById('diagramContainer');

  // Load example
  exampleBtn.addEventListener('click', function() {
    const lang = languageSelect.value;
    codeInput.value = examples[lang] || examples.javascript;
  });

  // Clear
  clearBtn.addEventListener('click', function() {
    codeInput.value = '';
    diagramContainer.innerHTML = `
      <div class="placeholder">
        <span class="placeholder-icon">📐</span>
        <p>Enter code and click Generate</p>
      </div>
    `;
  });

  // Generate diagram
  generateBtn.addEventListener('click', function() {
    const code = codeInput.value.trim();
    if (!code) {
      diagramContainer.innerHTML = `
        <div class="placeholder">
          <span class="placeholder-icon">⚠️</span>
          <p>Please enter some code first</p>
        </div>
      `;
      return;
    }

    const type = diagramType.value;
    const lang = languageSelect.value;

    if (type === 'flowchart') {
      generateFlowchart(code, diagramContainer);
    } else if (type === 'class') {
      generateClassDiagram(code, diagramContainer);
    } else if (type === 'sequence') {
      generateSequenceDiagram(code, diagramContainer);
    }
  });

  // Generate Flowchart
  function generateFlowchart(code, container) {
    const lines = code.split('\n').filter(l => l.trim());
    const functions = lines.filter(l => l.includes('function') || l.includes('=>') || l.includes('def '));

    let svg = `<svg viewBox="0 0 600 ${Math.max(300, functions.length * 80 + 60)}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Start node
    svg += `
      <rect x="250" y="20" width="100" height="40" rx="20" class="node" />
      <text x="300" y="45" class="node-text">Start</text>
    `;

    // Function nodes
    functions.forEach((fn, i) => {
      const y = 100 + i * 80;
      const name = fn.trim().replace(/^.*function\s*/, '').replace(/^.*def\s*/, '').replace(/\(.*$/, '').trim() || `Step ${i+1}`;
      
      svg += `
        <rect x="220" y="${y}" width="160" height="40" rx="8" class="node" />
        <text x="300" y="${y+25}" class="node-text">${name}</text>
        
        ${i === 0 ? `<line x1="300" y1="60" x2="300" y2="${y}" class="edge" />` : ''}
        ${i > 0 ? `<line x1="300" y1="${y-40}" x2="300" y2="${y}" class="edge" />` : ''}
      `;
    });

    // End node
    const lastY = 100 + (functions.length - 1) * 80 + 60;
    svg += `
      <rect x="250" y="${lastY}" width="100" height="40" rx="20" class="node" style="fill:#4CAF50;stroke:#388E3C;" />
      <text x="300" y="${lastY+25}" class="node-text">End</text>
      ${functions.length > 0 ? `<line x1="300" y1="${lastY-40}" x2="300" y2="${lastY}" class="edge" />` : ''}
    `;

    svg += '</svg>';
    container.innerHTML = svg;
  }

  // Generate Class Diagram
  function generateClassDiagram(code, container) {
    const lines = code.split('\n');
    const classes = lines.filter(l => l.includes('class '));

    let svg = `<svg viewBox="0 0 500 ${Math.max(200, classes.length * 150 + 50)}" xmlns="http://www.w3.org/2000/svg">`;

    classes.forEach((cls, i) => {
      const x = 50;
      const y = 30 + i * 150;
      const name = cls.replace(/^.*class\s*/, '').replace(/\s*{.*$/, '').trim() || 'MyClass';

      svg += `
        <rect x="${x}" y="${y}" width="200" height="120" rx="4" fill="white" stroke="#6c63ff" stroke-width="2" />
        <rect x="${x}" y="${y}" width="200" height="30" rx="4" fill="#6c63ff" />
        <text x="${x+100}" y="${y+20}" fill="white" text-anchor="middle" font-weight="bold">${name}</text>
        <text x="${x+10}" y="${y+50}" font-size="11" fill="#333">- fields</text>
        <text x="${x+10}" y="${y+70}" font-size="11" fill="#333">- methods</text>
        <line x1="${x}" y1="${y+80}" x2="${x+200}" y2="${y+80}" stroke="#ddd" />
        <text x="${x+10}" y="${y+100}" font-size="11" fill="#333">+ doSomething()</text>
      `;
    });

    svg += '</svg>';
    container.innerHTML = svg;
  }

  // Generate Sequence Diagram
  function generateSequenceDiagram(code, container) {
    const lines = code.split('\n').filter(l => l.trim());
    const calls = lines.filter(l => l.includes('(') && l.includes(')'));

    let svg = `<svg viewBox="0 0 600 ${Math.max(300, calls.length * 40 + 80)}" xmlns="http://www.w3.org/2000/svg">`;

    // Participants
    svg += `
      <rect x="100" y="20" width="100" height="30" rx="4" fill="#6c63ff" />
      <text x="150" y="40" fill="white" text-anchor="middle" font-size="12">User</text>
      
      <rect x="350" y="20" width="120" height="30" rx="4" fill="#4CAF50" />
      <text x="410" y="40" fill="white" text-anchor="middle" font-size="12">System</text>
      
      <!-- Lifelines -->
      <line x1="150" y1="50" x2="150" y2="${calls.length * 40 + 80}" stroke="#ccc" stroke-dasharray="4,4" />
      <line x1="410" y1="50" x2="410" y2="${calls.length * 40 + 80}" stroke="#ccc" stroke-dasharray="4,4" />
    `;

    calls.forEach((call, i) => {
      const y = 80 + i * 40;
      const name = call.trim().replace(/^.*?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(.*$/, '$1').trim() || `call_${i}`;

      svg += `
        <!-- Arrow -->
        <line x1="155" y1="${y}" x2="400" y2="${y}" stroke="#333" stroke-width="2" />
        <polygon points="400,${y-4} 410,${y} 400,${y+4}" fill="#333" />
        
        <!-- Label -->
        <text x="280" y="${y-8}" text-anchor="middle" font-size="11" fill="#666">${name}()</text>
      `;
    });

    svg += '</svg>';
    container.innerHTML = svg;
  }

  // Export functions
  document.getElementById('exportPngBtn').addEventListener('click', function() {
    const svg = document.querySelector('#diagramContainer svg');
    if (!svg) {
      alert('Please generate a diagram first');
      return;
    }
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = function() {
      ctx.drawImage(img, 0, 0, 800, 600);
      const png = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'diagram.png';
      link.href = png;
      link.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });

  document.getElementById('exportSvgBtn').addEventListener('click', function() {
    const svg = document.querySelector('#diagramContainer svg');
    if (!svg) {
      alert('Please generate a diagram first');
      return;
    }
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.download = 'diagram.svg';
    link.href = URL.createObjectURL(blob);
    link.click();
  });
});