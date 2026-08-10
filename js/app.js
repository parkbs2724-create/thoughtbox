import * as Storage from './storage.js';
import * as GPT from './gpt.js';
import * as MindMap from './mindmap.js';
import * as Utils from './utils.js';

let els = {};
let state = {
  currentFilter: 'all',
  activeBridgeIdea: null
};

function init() {
  cacheElements();
  bindEvents();
  
  // Init MindMap
  MindMap.init('mindmapContainer');
  
  // Load initial settings
  const settings = Storage.getSettings();
  els.apiKeyInput.value = settings.apiKey || '';
  els.modelSelect.value = settings.model || 'gpt-4o';
  els.contextInput.value = settings.context || '';
  
  if (settings.theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    els.themeToggle.textContent = '🌙';
    MindMap.updateTheme(false);
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    els.themeToggle.textContent = '☀️';
    MindMap.updateTheme(true);
  }
  
  renderAll();
}

function cacheElements() {
  els = {
    thoughtInput: document.getElementById('thoughtInput'),
    sendBtn: document.getElementById('sendBtn'),
    categorySelect: document.getElementById('categorySelect'),
    thoughtList: document.getElementById('thoughtList'),
    emptyState: document.getElementById('emptyState'),
    thoughtCount: document.getElementById('thoughtCount'),
    mindmapContainer: document.getElementById('mindmapContainer'),
    mindmapEmpty: document.getElementById('mindmapEmpty'),
    searchInput: document.getElementById('searchInput'),
    filterTags: document.getElementById('filterTags'),
    themeToggle: document.getElementById('themeToggle'),
    settingsBtn: document.getElementById('settingsBtn'),
    networkViewBtn: document.getElementById('networkViewBtn'),
    treeViewBtn: document.getElementById('treeViewBtn'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingText: document.getElementById('loadingText'),
    settingsModal: document.getElementById('settingsModal'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    toggleApiKey: document.getElementById('toggleApiKey'),
    modelSelect: document.getElementById('modelSelect'),
    contextInput: document.getElementById('contextInput'),
    exportBtn: document.getElementById('exportBtn'),
    importBtn: document.getElementById('importBtn'),
    importFile: document.getElementById('importFile'),
    detailModal: document.getElementById('detailModal'),
    detailCategory: document.getElementById('detailCategory'),
    detailContent: document.getElementById('detailContent'),
    detailMeta: document.getElementById('detailMeta'),
    detailFeedback: document.getElementById('detailFeedback'),
    detailConnections: document.getElementById('detailConnections'),
    deleteThoughtBtn: document.getElementById('deleteThoughtBtn'),
    bridgeModal: document.getElementById('bridgeModal'),
    bridgeContent: document.getElementById('bridgeContent'),
    bridgeConnectionInfo: document.getElementById('bridgeConnectionInfo'),
    acceptBridgeBtn: document.getElementById('acceptBridgeBtn'),
    rejectBridgeBtn: document.getElementById('rejectBridgeBtn'),
    mobileNav: document.getElementById('mobileNav'),
    toastContainer: document.getElementById('toastContainer'),
    sidebar: document.getElementById('sidebar'),
    mainContent: document.getElementById('mainContent')
  };
}

function bindEvents() {
  // Input auto-resize
  els.thoughtInput.addEventListener('input', () => {
    els.thoughtInput.style.height = 'auto';
    els.thoughtInput.style.height = Math.min(els.thoughtInput.scrollHeight, 120) + 'px';
  });
  
  // Submit on Ctrl+Enter
  els.thoughtInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      submitThought();
    }
  });
  els.sendBtn.addEventListener('click', submitThought);

  // Filter tags
  els.filterTags.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-tag');
    if (!btn) return;
    document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    state.currentFilter = btn.dataset.category;
    renderAll();
  });

  // Search input
  els.searchInput.addEventListener('input', Utils.debounce(renderAll, 300));

  // Theme toggle
  els.themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    els.themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    Storage.saveSetting('theme', newTheme);
    MindMap.updateTheme(newTheme === 'dark');
  });

  // Modals
  els.settingsBtn.addEventListener('click', () => openModal('settingsModal'));

  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      closeModal(e.target.dataset.modal);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(overlay.id);
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(overlay => {
        closeModal(overlay.id);
      });
    }
  });

  // Auto-save Settings
  els.apiKeyInput.addEventListener('input', () => Storage.saveSetting('apiKey', els.apiKeyInput.value));
  els.modelSelect.addEventListener('change', () => Storage.saveSetting('model', els.modelSelect.value));
  els.contextInput.addEventListener('input', () => Storage.saveSetting('context', els.contextInput.value));

  // Toggle API Key visibility
  els.toggleApiKey.addEventListener('click', () => {
    if (els.apiKeyInput.type === 'password') {
      els.apiKeyInput.type = 'text';
      els.toggleApiKey.textContent = '숨기기';
    } else {
      els.apiKeyInput.type = 'password';
      els.toggleApiKey.textContent = '보기';
    }
  });

  // Data Export/Import
  els.exportBtn.addEventListener('click', exportData);
  els.importBtn.addEventListener('click', () => els.importFile.click());
  els.importFile.addEventListener('change', importData);

  // Mobile Nav Tabs
  if (els.mobileNav) {
    els.mobileNav.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const target = btn.dataset.tab;
      if (target === 'sidebar') {
        els.sidebar.classList.add('active-tab');
        els.mainContent.classList.remove('active-tab');
      } else {
        els.sidebar.classList.remove('active-tab');
        els.mainContent.classList.add('active-tab');
      }
    });
  }

  // View Toggle (Mindmap vs Tree)
  els.networkViewBtn.addEventListener('click', () => {
    els.networkViewBtn.classList.add('active');
    els.treeViewBtn.classList.remove('active');
    MindMap.setMode('network');
  });
  
  els.treeViewBtn.addEventListener('click', () => {
    els.treeViewBtn.classList.add('active');
    els.networkViewBtn.classList.remove('active');
    MindMap.setMode('tree');
  });

  // Detail Modal Actions
  els.deleteThoughtBtn.addEventListener('click', () => {
    const id = els.detailModal.dataset.thoughtId;
    if (id && confirm('이 생각을 삭제하시겠습니까?')) {
      Storage.deleteThought(id);
      MindMap.removeNode(id);
      closeModal('detailModal');
      renderAll();
      Utils.showToast('삭제되었습니다.', 'success');
    }
  });

  // Mindmap Node Click
  MindMap.onNodeClick((id) => {
    openDetailModal(id);
  });

  // Bridge Modal Actions
  els.acceptBridgeBtn.addEventListener('click', acceptBridgeIdea);
  els.rejectBridgeBtn.addEventListener('click', () => {
    closeModal('bridgeModal');
    state.activeBridgeIdea = null;
  });
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

async function submitThought() {
  const content = els.thoughtInput.value.trim();
  if (!content) return;

  const category = els.categorySelect.value;
  const newThought = Storage.saveThought({ content, category });
  
  els.thoughtInput.value = '';
  els.thoughtInput.style.height = 'auto';
  
  renderAll(); // Renders the new thought immediately
  Utils.showToast('생각이 저장되었습니다.', 'success');
  
  const settings = Storage.getSettings();
  if (!settings.apiKey) return; // Silent return if no API key

  showLoading('AI 분석 중...');
  try {
    const existingThoughts = Storage.getAllThoughts().filter(t => t.id !== newThought.id);
    const analysis = await GPT.analyzeThought(newThought, existingThoughts);
    
    let updates = {};
    if (analysis.feedback) {
      updates.aiFeedback = analysis.feedback;
    }
    
    // Add connections
    if (analysis.connections && analysis.connections.length > 0) {
      updates.connections = analysis.connections; // Assuming Storage handles updating connections this way, or via explicit addConnection
      Storage.updateThought(newThought.id, updates);
      
      for (const conn of analysis.connections) {
        Storage.addConnection(newThought.id, conn.targetId, conn.strength, conn.reason);
      }
    } else if (analysis.feedback) {
      Storage.updateThought(newThought.id, updates);
    }

    renderAll();

    // Show bridge idea if available
    if (analysis.bridgeIdeas && analysis.bridgeIdeas.length > 0) {
      showBridgeModal(analysis.bridgeIdeas[0], newThought.id);
    }

  } catch (error) {
    console.error(error);
    Utils.showToast('AI 분석 중 오류가 발생했습니다.', 'error');
  } finally {
    hideLoading();
  }
}

function showLoading(text) {
  els.loadingText.textContent = text;
  els.loadingOverlay.style.display = 'flex';
}

function hideLoading() {
  els.loadingOverlay.style.display = 'none';
}

function renderAll() {
  const allThoughts = Storage.getAllThoughts();
  const query = els.searchInput.value.toLowerCase().trim();
  
  const filtered = allThoughts.filter(t => {
    const matchCategory = state.currentFilter === 'all' || t.category === state.currentFilter;
    const matchQuery = !query || t.content.toLowerCase().includes(query) || (t.aiFeedback && t.aiFeedback.toLowerCase().includes(query));
    return matchCategory && matchQuery;
  });

  els.thoughtList.innerHTML = '';
  if (filtered.length === 0) {
    els.thoughtList.appendChild(els.emptyState);
    els.emptyState.style.display = 'flex';
  } else {
    els.emptyState.style.display = 'none';
    filtered.forEach(t => {
      const card = createThoughtCard(t);
      els.thoughtList.appendChild(card);
    });
  }

  els.thoughtCount.textContent = `${Storage.getThoughtCount()}개의 생각`;

  MindMap.refresh(filtered);
  
  if (filtered.length === 0) {
    els.mindmapEmpty.style.display = 'flex';
  } else {
    els.mindmapEmpty.style.display = 'none';
  }
}

function createThoughtCard(thought) {
  const div = document.createElement('div');
  div.className = 'thought-card';
  div.dataset.category = thought.category;
  div.dataset.id = thought.id;

  const catInfo = Utils.getCategoryInfo(thought.category);
  const dateInfo = Utils.formatDate(thought.createdAt);
  const connectionCount = (thought.connections || []).length;

  div.innerHTML = `
    <div class="card-header">
      <span class="card-badge">${catInfo.emoji} ${catInfo.label}</span>
      <span class="card-time" title="${dateInfo.full}">${dateInfo.relative}</span>
    </div>
    <div class="card-content">${Utils.escapeHtml(Utils.truncate(thought.content, 120))}</div>
    <div class="card-footer">
      <span class="connection-badge">🔗 ${connectionCount}개 연결</span>
      ${thought.aiFeedback ? '<span class="ai-feedback-preview" style="cursor:pointer;">🤖 AI 피드백 보기</span>' : ''}
    </div>
  `;

  // Attach click to the whole card
  div.addEventListener('click', (e) => {
    openDetailModal(thought.id);
  });
  
  return div;
}

function openDetailModal(id) {
  const thought = Storage.getThoughtById(id);
  if (!thought) return;

  els.detailModal.dataset.thoughtId = thought.id;
  
  const catInfo = Utils.getCategoryInfo(thought.category);
  els.detailCategory.textContent = `${catInfo.emoji} ${catInfo.label}`;
  els.detailMeta.textContent = Utils.formatDate(thought.createdAt).full;
  els.detailContent.textContent = thought.content;
  
  if (thought.aiFeedback) {
    els.detailFeedback.style.display = 'block';
    els.detailFeedback.textContent = thought.aiFeedback;
  } else {
    els.detailFeedback.style.display = 'none';
  }

  els.detailConnections.innerHTML = '';
  if (thought.connections && thought.connections.length > 0) {
    thought.connections.forEach(conn => {
      const targetId = typeof conn === 'string' ? conn : (conn.targetId || conn.toId || conn.fromId);
      // Skip if somehow the target is the thought itself
      if (targetId === thought.id && (conn.toId && conn.fromId)) {
          // It's not a simple targetId, handle carefully if needed
      }

      const targetThought = Storage.getThoughtById(targetId);
      if (targetThought && targetThought.id !== thought.id) {
        const item = document.createElement('div');
        item.style.padding = '0.5rem';
        item.style.marginBottom = '0.5rem';
        item.style.background = 'var(--bg-secondary)';
        item.style.borderRadius = '6px';
        item.style.cursor = 'pointer';
        item.style.border = '1px solid var(--border-color)';
        
        const tCat = Utils.getCategoryInfo(targetThought.category);
        item.innerHTML = `<span style="font-size:0.9rem; margin-right:4px;">${tCat.emoji}</span> <span style="font-size:0.95rem;">${Utils.escapeHtml(Utils.truncate(targetThought.content, 60))}</span>`;
        
        item.addEventListener('click', () => {
          closeModal('detailModal');
          setTimeout(() => openDetailModal(targetThought.id), 200);
          MindMap.focusNode(targetThought.id);
        });
        
        els.detailConnections.appendChild(item);
      }
    });
    
    if (els.detailConnections.children.length === 0) {
      els.detailConnections.innerHTML = '<div style="color: var(--text-secondary); font-size:0.9rem;">연결된 생각이 없습니다.</div>';
    }
  } else {
    els.detailConnections.innerHTML = '<div style="color: var(--text-secondary); font-size:0.9rem;">연결된 생각이 없습니다.</div>';
  }

  openModal('detailModal');
}

function showBridgeModal(bridgeData, sourceId) {
  state.activeBridgeIdea = {
    ...bridgeData,
    sourceId
  };
  
  els.bridgeConnectionInfo.textContent = `AI가 두 생각 사이에서 새로운 아이디어를 발견했습니다!`;
  els.bridgeContent.textContent = bridgeData.idea;
  openModal('bridgeModal');
}

function acceptBridgeIdea() {
  if (!state.activeBridgeIdea) return;
  
  const bridge = state.activeBridgeIdea;
  const newThought = Storage.saveThought({
    content: bridge.idea,
    category: 'bridge',
    isAIGenerated: true,
    aiFeedback: 'AI가 생성한 브릿지 아이디어입니다.\n이유: ' + bridge.reason
  });
  
  Storage.addConnection(newThought.id, bridge.connectsFrom, 0.8, '브릿지 출발점');
  Storage.addConnection(newThought.id, bridge.connectsTo, 0.8, '브릿지 도착점');
  
  closeModal('bridgeModal');
  state.activeBridgeIdea = null;
  renderAll();
  Utils.showToast('브릿지 아이디어가 추가되었습니다.', 'success');
}

function exportData() {
  const jsonString = Storage.exportData();
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `thoughtbox_export_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const result = Storage.importData(event.target.result);
      if (result.success) {
        Utils.showToast(`${result.count}개의 데이터를 성공적으로 불러왔습니다.`, 'success');
        renderAll();
      } else {
        Utils.showToast('데이터 불러오기 실패: ' + (result.error || '알 수 없는 오류'), 'error');
      }
    } catch (err) {
      Utils.showToast('파일 처리 중 오류가 발생했습니다.', 'error');
    }
    els.importFile.value = ''; // Reset input
  };
  reader.readAsText(file);
}

// Custom Toast override if Utils.showToast isn't injecting HTML properly
// We'll trust Utils.showToast for now, but just in case, we can override or rely on it.
// Assuming Utils.showToast handles the DOM creation or we provide it.
// The prompt says utils.js exports showToast(message, type), so we just call it.

window.addEventListener('DOMContentLoaded', init);
