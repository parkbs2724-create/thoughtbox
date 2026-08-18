import { getCategoryInfo } from './utils.js';

let network = null;
let nodes = null; 
let edges = null; 
let currentMode = 'network'; 
let onNodeClickCallback = null;

const CATEGORY_COLORS = {
  idea: { background: '#FFD70033', border: '#FFD700', font: '#FFD700' },
  question: { background: '#00D4FF33', border: '#00D4FF', font: '#00D4FF' },
  memo: { background: '#A78BFA33', border: '#A78BFA', font: '#A78BFA' },
  inspiration: { background: '#FF6B9D33', border: '#FF6B9D', font: '#FF6B9D' },
  todo: { background: '#34D39933', border: '#34D399', font: '#34D399' },
  bridge: { background: '#F9731633', border: '#F97316', font: '#F97316' }
};

export function init(containerId) {
  nodes = new vis.DataSet();
  edges = new vis.DataSet();
  
  const container = document.getElementById(containerId);
  if (!container) return;
  const options = getNetworkOptions();
  
  network = new vis.Network(container, { nodes, edges }, options);
  
  network.on('click', (params) => {
    if (params.nodes.length > 0 && onNodeClickCallback) {
      onNodeClickCallback(params.nodes[0]);
    }
  });
  
  network.on('doubleClick', (params) => {
    if (params.nodes.length > 0) {
      network.focus(params.nodes[0], { scale: 1.5, animation: true });
    }
  });
}

function getNetworkOptions() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const fontColor = isDark ? '#e2e8f0' : '#1a1a2e';
  
  return {
    physics: {
      solver: 'barnesHut',
      barnesHut: {
        gravitationalConstant: -2000,
        centralGravity: 0.1,
        springLength: 150,
        springConstant: 0.04,
        damping: 0.09
      },
      stabilization: { iterations: 150 }
    },
    nodes: {
      shape: 'dot',
      size: 20,
      font: { 
        color: fontColor, 
        face: '"Pretendard", "Noto Sans KR", sans-serif',
        size: 14,
        strokeWidth: 0
      },
      borderWidth: 2,
      borderWidthSelected: 4,
      shadow: { enabled: true, color: 'rgba(0,0,0,0.2)', size: 10, x: 2, y: 2 }
    },
    edges: {
      smooth: { type: 'continuous', forceDirection: 'none', roundness: 0.5 },
      arrows: { to: { enabled: true, scaleFactor: 0.5 } },
      color: { inherit: false, color: isDark ? '#4b5563' : '#cbd5e1', highlight: '#8b5cf6' },
      font: { 
        color: fontColor, 
        face: '"Pretendard", "Noto Sans KR", sans-serif',
        size: 10,
        align: 'middle',
        strokeWidth: 2,
        strokeColor: isDark ? '#0f172a' : '#ffffff'
      }
    },
    interaction: {
      hover: true,
      tooltipDelay: 200,
      zoomView: true,
      dragView: true
    }
  };
}

function getTreeOptions() {
  const options = getNetworkOptions();
  options.layout = {
    hierarchical: {
      enabled: true,
      direction: 'UD',
      sortMethod: 'directed',
      nodeSpacing: 150,
      levelSeparation: 150
    }
  };
  options.physics = {
    hierarchicalRepulsion: {
      centralGravity: 0.0,
      springLength: 100,
      springConstant: 0.01,
      nodeDistance: 120,
      damping: 0.09
    },
    solver: 'hierarchicalRepulsion'
  };
  return options;
}

export function addNode(thought) {
  if (!nodes) return;
  const catInfo = getCategoryInfo(thought.category);
  const colors = CATEGORY_COLORS[thought.category] || CATEGORY_COLORS.memo;
  
  const labelText = thought.content.length > 20 
    ? thought.content.substring(0, 20) + '...' 
    : thought.content;
    
  const nodeSize = 15 + (thought.connections?.length || 0) * 3;
  
  const nodeData = {
    id: thought.id,
    label: `${catInfo.emoji} ${labelText}`,
    title: thought.content,
    color: {
      background: colors.background,
      border: colors.border,
      highlight: { background: colors.background, border: '#ffffff' },
      hover: { background: colors.background, border: '#ffffff' }
    },
    font: { color: colors.font },
    shape: 'dot',
    size: Math.min(nodeSize, 40),
    shapeProperties: {
      borderDashes: thought.isAIGenerated ? [5, 5] : false
    }
  };
  
  if (nodes.get(thought.id)) {
    nodes.update(nodeData);
  } else {
    nodes.add(nodeData);
  }
}

export function addEdge(fromId, toId, strength = 0.5, reason = '') {
  if (!edges) return;
  const edgeId = `${fromId}_${toId}`;
  const width = 1 + (strength * 4);
  const opacity = Math.max(0.2, strength);
  
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const baseColor = isDark ? `rgba(148, 163, 184, ${opacity})` : `rgba(100, 116, 139, ${opacity})`;
  
  const edgeData = {
    id: edgeId,
    from: fromId,
    to: toId,
    width: width,
    title: reason,
    color: { color: baseColor, highlight: '#8b5cf6', hover: '#a78bfa' }
  };
  
  if (!edges.get(edgeId)) {
    edges.add(edgeData);
  }
}

export function removeNode(id) {
  if (!nodes || !edges) return;
  nodes.remove(id);
  const connectedEdges = edges.get().filter(e => e.from === id || e.to === id);
  edges.remove(connectedEdges.map(e => e.id));
}

export function setMode(mode) {
  if (!network) return;
  currentMode = mode;
  if (mode === 'tree') {
    network.setOptions(getTreeOptions());
  } else {
    network.setOptions(getNetworkOptions());
  }
}

export function onNodeClick(callback) {
  onNodeClickCallback = callback;
}

export function refresh(thoughts) {
  if (!nodes || !edges) return;
  nodes.clear();
  edges.clear();
  
  thoughts.forEach(thought => addNode(thought));
  
  thoughts.forEach(thought => {
    if (thought.connections) {
      thought.connections.forEach(conn => {
        if (nodes.get(conn.targetId)) {
          addEdge(thought.id, conn.targetId, conn.strength, conn.reason);
        }
      });
    }
  });
  
  if (thoughts.length > 0 && network) {
    network.fit({ animation: true });
  }
}

export function focusNode(id) {
  if (network && nodes && nodes.get(id)) {
    network.focus(id, { scale: 1.5, animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
    network.selectNodes([id]);
  }
}

export function getNodeCount() {
  return nodes ? nodes.length : 0;
}

export function updateTheme(isDark) {
  if (network) {
    const fontColor = isDark ? '#e2e8f0' : '#1a1a2e';
    const edgeColor = isDark ? '#4b5563' : '#cbd5e1';
    network.setOptions({
      nodes: { font: { color: fontColor } },
      edges: { 
        color: { color: edgeColor },
        font: { 
          color: fontColor,
          strokeColor: isDark ? '#0f172a' : '#ffffff' 
        } 
      }
    });
    
    if (edges) {
      const allEdges = edges.get();
      const updatedEdges = allEdges.map(e => {
        return { id: e.id, color: { color: isDark ? 'rgba(148, 163, 184, 0.5)' : 'rgba(100, 116, 139, 0.5)' }};
      });
      edges.update(updatedEdges);
    }
  }
}
