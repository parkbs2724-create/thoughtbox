import { generateId } from './utils.js';

const STORAGE_KEYS = {
  THOUGHTS: 'thoughtbox_thoughts',
  SETTINGS: 'thoughtbox_settings'
};

const DEFAULT_SETTINGS = {
  apiKey: '',
  model: 'gpt-4o-mini',
  context: '',
  theme: 'dark'
};

// Internal helpers
function loadThoughts() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.THOUGHTS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load thoughts:', e);
    return [];
  }
}

function saveThoughts(thoughts) {
  try {
    localStorage.setItem(STORAGE_KEYS.THOUGHTS, JSON.stringify(thoughts));
    return true;
  } catch (e) {
    console.error('Failed to save thoughts:', e);
    return false;
  }
}

// Save a new thought
export function saveThought(thought) {
  const thoughts = loadThoughts();
  const now = new Date().toISOString();
  
  const newThought = {
    id: generateId('t'),
    content: thought.content,
    category: thought.category || 'idea',
    aiFeedback: thought.aiFeedback || '',
    connections: thought.connections || [],
    isAIGenerated: thought.isAIGenerated || false,
    createdAt: now,
    updatedAt: now
  };

  thoughts.push(newThought);
  saveThoughts(thoughts);
  return newThought;
}

// Get all thoughts (sorted by createdAt desc)
export function getAllThoughts() {
  const thoughts = loadThoughts();
  return thoughts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// Get a single thought by ID
export function getThoughtById(id) {
  const thoughts = loadThoughts();
  return thoughts.find(t => t.id === id) || null;
}

// Update a thought (partial update)
export function updateThought(id, updates) {
  const thoughts = loadThoughts();
  const index = thoughts.findIndex(t => t.id === id);
  
  if (index === -1) return null;

  const now = new Date().toISOString();
  thoughts[index] = {
    ...thoughts[index],
    ...updates,
    updatedAt: now
  };

  saveThoughts(thoughts);
  return thoughts[index];
}

// Delete a thought
export function deleteThought(id) {
  let thoughts = loadThoughts();
  
  // Remove the thought
  thoughts = thoughts.filter(t => t.id !== id);
  
  // Remove connections pointing to this thought
  thoughts = thoughts.map(t => ({
    ...t,
    connections: (t.connections || []).filter(c => c.targetId !== id)
  }));

  saveThoughts(thoughts);
}

// Add a connection between two thoughts
export function addConnection(fromId, toId, strength = 0.5, reason = '') {
  const thoughts = loadThoughts();
  const index = thoughts.findIndex(t => t.id === fromId);
  
  if (index === -1) return false;
  
  if (!thoughts[index].connections) {
    thoughts[index].connections = [];
  }
  
  // Check if connection already exists
  const existingIdx = thoughts[index].connections.findIndex(c => c.targetId === toId);
  if (existingIdx >= 0) {
    thoughts[index].connections[existingIdx] = { targetId: toId, strength, reason };
  } else {
    thoughts[index].connections.push({ targetId: toId, strength, reason });
  }
  
  thoughts[index].updatedAt = new Date().toISOString();
  saveThoughts(thoughts);
  return true;
}

// Get settings
export function getSettings() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const settings = data ? JSON.parse(data) : {};
    return { ...DEFAULT_SETTINGS, ...settings };
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}

// Save a setting
export function saveSetting(key, value) {
  const settings = getSettings();
  settings[key] = value;
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch (e) {
    console.error('Failed to save settings:', e);
    return false;
  }
}

// Export all data as JSON string
export function exportData() {
  const data = {
    thoughts: loadThoughts(),
    settings: getSettings(),
    exportDate: new Date().toISOString(),
    version: '1.0'
  };
  
  return JSON.stringify(data, null, 2);
}

// Import data from JSON string
export function importData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (!data.thoughts || !Array.isArray(data.thoughts)) {
      return { success: false, error: 'Invalid data format' };
    }
    
    saveThoughts(data.thoughts);
    if (data.settings) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
    }
    
    return { success: true, count: data.thoughts.length };
  } catch (e) {
    return { success: false, error: 'Failed to parse JSON' };
  }
}

// Get thought count
export function getThoughtCount() {
  const thoughts = loadThoughts();
  return thoughts.length;
}
