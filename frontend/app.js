// Application logic for Route Navigation Engine Visualizer

const API_BASE = window.location.origin.includes('3000') 
  ? window.location.origin 
  : 'http://localhost:3000';

const canvas = document.getElementById('graph-canvas');
const ctx = canvas.getContext('2d');
const form = document.getElementById('route-form');
const startSelect = document.getElementById('start-node');
const endSelect = document.getElementById('end-node');
const computeBtn = document.getElementById('compute-btn');

const metricTime = document.getElementById('metric-time');
const metricCache = document.getElementById('metric-cache');
const metricPath = document.getElementById('metric-path');

// State
let nodes = [];
let edges = [];
let bounds = { minX: 0, maxX: 1, minY: 0, maxY: 1 };
let selectedStart = null;
let selectedEnd = null;
let activePath = [];
let pulseProgress = 0;
let hoveredNode = null;

// Scale helper for High-DPI screens
function resizeCanvas() {
  const wrapper = canvas.parentElement;
  const width = wrapper.clientWidth;
  const height = wrapper.clientHeight;
  
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  
  draw();
}

window.addEventListener('resize', resizeCanvas);

// Auto-scale bounds calculation
function calculateBounds() {
  if (nodes.length === 0) return;
  const xs = nodes.map(n => n.x);
  const ys = nodes.map(n => n.y);
  
  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);

  // If linear, pad bounds to center nodes correctly
  if (maxX === minX) { maxX += 1; minX -= 1; }
  if (maxY === minY) { maxY += 1; minY -= 1; }

  bounds = { minX, maxX, minY, maxY };
}

// Convert graph node space to canvas viewport coordinate space
function getCanvasCoords(x, y) {
  const padding = 80;
  const w = canvas.width / (window.devicePixelRatio || 1) - padding * 2;
  const h = canvas.height / (window.devicePixelRatio || 1) - padding * 2;

  let pctX = (x - bounds.minX) / (bounds.maxX - bounds.minX);
  let pctY = (y - bounds.minY) / (bounds.maxY - bounds.minY);

  if (Math.abs(bounds.maxY - bounds.minY) < 0.0001) {
    pctY = 0.5;
  }
  if (Math.abs(bounds.maxX - bounds.minX) < 0.0001) {
    pctX = 0.5;
  }

  return {
    x: padding + pctX * w,
    y: padding + pctY * h
  };
}

// Fetch graph metadata from server
async function loadGraph() {
  try {
    const res = await fetch(`${API_BASE}/graph`);
    if (!res.ok) throw new Error('API server returned error');
    const data = await res.ok ? await res.json() : null;
    
    if (data) {
      nodes = data.nodes || [];
      edges = data.edges || [];
      
      calculateBounds();
      populateDropdowns();
      resizeCanvas();
    }
  } catch (error) {
    console.error('Error fetching graph data:', error);
    metricPath.textContent = 'Connection to API failed. Make sure Redis & server are running!';
    metricPath.style.color = '#ef4444';
  }
}

// Populate dropdown selectors dynamically
function populateDropdowns() {
  // Clear options
  startSelect.innerHTML = '<option value="" disabled selected>Select start node...</option>';
  endSelect.innerHTML = '<option value="" disabled selected>Select end node...</option>';

  nodes.forEach(node => {
    const startOption = document.createElement('option');
    startOption.value = node.id;
    startOption.textContent = `Node ${node.id} (${node.x}, ${node.y})`;
    startSelect.appendChild(startOption);

    const endOption = document.createElement('option');
    endOption.value = node.id;
    endOption.textContent = `Node ${node.id} (${node.x}, ${node.y})`;
    endSelect.appendChild(endOption);
  });
}

// Sync selection visual state with selections in dropdowns
function syncDropdowns() {
  startSelect.value = selectedStart !== null ? selectedStart : '';
  endSelect.value = selectedEnd !== null ? selectedEnd : '';
}

// Draw the graph
function draw() {
  const dWidth = canvas.width / (window.devicePixelRatio || 1);
  const dHeight = canvas.height / (window.devicePixelRatio || 1);
  
  ctx.clearRect(0, 0, dWidth, dHeight);

  // 1️⃣ Draw Edges
  edges.forEach(edge => {
    const fromNode = nodes.find(n => n.id === edge.from);
    const toNode = nodes.find(n => n.id === edge.to);
    if (!fromNode || !toNode) return;

    const fromCoords = getCanvasCoords(fromNode.x, fromNode.y);
    const toCoords = getCanvasCoords(toNode.x, toNode.y);

    // Is this edge part of the computed shortest path?
    let isPathEdge = false;
    if (activePath.length > 0) {
      for (let i = 0; i < activePath.length - 1; i++) {
        if ((activePath[i] === edge.from && activePath[i + 1] === edge.to) ||
            (activePath[i] === edge.to && activePath[i + 1] === edge.from)) {
          isPathEdge = true;
          break;
        }
      }
    }

    ctx.beginPath();
    ctx.moveTo(fromCoords.x, fromCoords.y);
    ctx.lineTo(toCoords.x, toCoords.y);

    if (isPathEdge) {
      // Highlight path connection
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.shadowColor = 'rgba(56, 189, 248, 0.4)';
      ctx.shadowBlur = 10;
    } else {
      // Default connection
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 0;
    }
    ctx.stroke();
    
    // Draw weights in the middle of edges
    const midX = (fromCoords.x + toCoords.x) / 2;
    const midY = (fromCoords.y + toCoords.y) / 2;
    
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 11px Outfit';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(edge.weight, midX, midY - 10);
  });

  // 2️⃣ Draw Animated Pulse Dot Along the Path
  if (activePath.length >= 2) {
    const pulseCoords = getPositionOnPath(pulseProgress);
    if (pulseCoords) {
      ctx.beginPath();
      ctx.arc(pulseCoords.x, pulseCoords.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#f0abfc'; // Pink/Purple pulse glow
      ctx.shadowColor = '#d946ef';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0; // reset
    }
  }

  // 3️⃣ Draw Nodes
  nodes.forEach(node => {
    const coords = getCanvasCoords(node.x, node.y);
    const radius = 18;
    const isStart = node.id === selectedStart;
    const isEnd = node.id === selectedEnd;
    const isHovered = node.id === hoveredNode;

    ctx.beginPath();
    ctx.arc(coords.x, coords.y, radius, 0, Math.PI * 2);

    // Style determination
    if (isStart) {
      ctx.fillStyle = '#065f46';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(16, 185, 129, 0.5)';
      ctx.shadowBlur = 14;
    } else if (isEnd) {
      ctx.fillStyle = '#9f1239';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(244, 63, 94, 0.5)';
      ctx.shadowBlur = 14;
    } else if (isHovered) {
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(139, 92, 246, 0.4)';
      ctx.shadowBlur = 10;
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 0;
    }

    ctx.fill();
    ctx.stroke();

    // Node labels (Node ID)
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 13px Outfit';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.id, coords.x, coords.y);
  });
}

// Calculate animated coordinates of the pulse
function getPositionOnPath(progress) {
  if (!activePath || activePath.length < 2) return null;
  
  const numSegments = activePath.length - 1;
  const segmentProg = 1 / numSegments;
  const segmentIdx = Math.min(Math.floor(progress / segmentProg), numSegments - 1);
  
  const startNodeId = activePath[segmentIdx];
  const endNodeId = activePath[segmentIdx + 1];
  
  const startNode = nodes.find(n => n.id === startNodeId);
  const endNode = nodes.find(n => n.id === endNodeId);
  if (!startNode || !endNode) return null;

  const startCoords = getCanvasCoords(startNode.x, startNode.y);
  const endCoords = getCanvasCoords(endNode.x, endNode.y);

  const localProg = (progress - (segmentIdx * segmentProg)) / segmentProg;
  
  return {
    x: startCoords.x + (endCoords.x - startCoords.x) * localProg,
    y: startCoords.y + (endCoords.y - startCoords.y) * localProg
  };
}

// Find node at cursor click / hover position
function getNodeAtPosition(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width / (window.devicePixelRatio || 1);
  const scaleY = canvas.height / rect.height / (window.devicePixelRatio || 1);
  
  const clickX = (clientX - rect.left) * scaleX;
  const clickY = (clientY - rect.top) * scaleY;

  for (let node of nodes) {
    const coords = getCanvasCoords(node.x, node.y);
    const dist = Math.sqrt((coords.x - clickX) ** 2 + (coords.y - clickY) ** 2);
    if (dist <= 22) { // 22px buffer radius
      return node.id;
    }
  }
  return null;
}

// Canvas Click Handler
canvas.addEventListener('click', (e) => {
  const nodeId = getNodeAtPosition(e.clientX, e.clientY);
  if (nodeId === null) return;

  if (selectedStart === null) {
    selectedStart = nodeId;
  } else if (selectedEnd === null && selectedStart !== nodeId) {
    selectedEnd = nodeId;
  } else {
    // Reset/cycle selections
    selectedStart = nodeId;
    selectedEnd = null;
    activePath = [];
    resetMetrics();
  }
  
  syncDropdowns();
  draw();
});

// Canvas Mouse Move Handler (for hover effects)
canvas.addEventListener('mousemove', (e) => {
  const nodeId = getNodeAtPosition(e.clientX, e.clientY);
  if (nodeId !== hoveredNode) {
    hoveredNode = nodeId;
    draw();
  }
});

// Dropdown change handlers
startSelect.addEventListener('change', (e) => {
  selectedStart = parseInt(e.target.value);
  activePath = [];
  resetMetrics();
  draw();
});

endSelect.addEventListener('change', (e) => {
  selectedEnd = parseInt(e.target.value);
  activePath = [];
  resetMetrics();
  draw();
});

// Reset metrics display
function resetMetrics() {
  metricTime.textContent = '--';
  metricCache.textContent = '--';
  metricCache.className = 'badge inactive';
  metricPath.textContent = '--';
  metricPath.style.color = 'var(--text-secondary)';
}

// Form Submit Handler (Submit calculations API call)
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (selectedStart === null || selectedEnd === null) {
    alert('Please select both Start and End nodes.');
    return;
  }

  const algorithm = document.querySelector('input[name="algo"]:checked').value;
  computeBtn.disabled = true;
  computeBtn.querySelector('span').textContent = 'Computing Path...';

  try {
    const response = await fetch(`${API_BASE}/route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        start: selectedStart,
        end: selectedEnd,
        algo: algorithm
      })
    });

    if (!response.ok) throw new Error('Shortest path search failed');
    const result = await response.json();

    if (result.error) {
      alert(result.error);
      resetMetrics();
      activePath = [];
    } else {
      activePath = result.path || [];
      
      // Update displays
      metricTime.textContent = `${result.time_us} μs`;
      
      metricCache.textContent = result.cache;
      metricCache.className = `badge ${result.cache.toLowerCase()}`;
      
      if (activePath.length > 0) {
        metricPath.textContent = activePath.join(' ➔ ');
        metricPath.style.color = 'var(--color-path)';
      } else {
        metricPath.textContent = 'No Path Found!';
        metricPath.style.color = '#f43f5e';
      }
    }
  } catch (error) {
    console.error(error);
    alert('Failed to connect to API server.');
  } finally {
    computeBtn.disabled = false;
    computeBtn.querySelector('span').textContent = 'Find Shortest Path';
    draw();
  }
});

// Animation Loop for pulsing visualizer path
function animate(timestamp) {
  if (activePath.length >= 2) {
    pulseProgress += 0.005;
    if (pulseProgress > 1) {
      pulseProgress = 0;
    }
    draw();
  }
  requestAnimationFrame(animate);
}

// Launch
loadGraph().then(() => {
  requestAnimationFrame(animate);
});
