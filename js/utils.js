// Generate unique ID with prefix
export function generateId(prefix = 't') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}

// Format ISO date string to Korean-friendly format
export function formatDate(isoString) {
  if (!isoString) return { full: '', relative: '' };
  
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return { full: '', relative: '' };

  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  const full = `${year}.${month}.${day} ${hours}:${minutes}`;
  
  let relative = '';
  if (diffSec < 60) relative = '방금 전';
  else if (diffMin < 60) relative = `${diffMin}분 전`;
  else if (diffHour < 24) relative = `${diffHour}시간 전`;
  else if (diffDay === 1) relative = '어제';
  else if (diffDay < 7) relative = `${diffDay}일 전`;
  else relative = full;

  return { full, relative };
}

// Debounce function
export function debounce(fn, delay = 300) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Category info lookup
export function getCategoryInfo(category) {
  const categories = {
    idea: { key: 'idea', label: '아이디어', emoji: '💡', color: '#FFD700', cssClass: 'cat-idea' },
    question: { key: 'question', label: '궁금증', emoji: '❓', color: '#00D4FF', cssClass: 'cat-question' },
    memo: { key: 'memo', label: '메모', emoji: '📝', color: '#A78BFA', cssClass: 'cat-memo' },
    inspiration: { key: 'inspiration', label: '영감', emoji: '✨', color: '#FF6B9D', cssClass: 'cat-inspiration' },
    todo: { key: 'todo', label: '할일', emoji: '☑️', color: '#34D399', cssClass: 'cat-todo' },
    bridge: { key: 'bridge', label: 'AI 브릿지', emoji: '🤖', color: '#F97316', cssClass: 'cat-bridge' }
  };
  return categories[category] || categories.idea;
}

// Get all categories (excluding bridge)
export function getAllCategories() {
  const categories = ['idea', 'question', 'memo', 'inspiration', 'todo'];
  return categories.map(getCategoryInfo);
}

// Truncate text
export function truncate(text, maxLength = 100) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Show toast notification
export function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  // Trigger reflow for animation
  void toast.offsetWidth;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300); // Wait for transition
  }, 3000);
}

// Escape HTML
export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
