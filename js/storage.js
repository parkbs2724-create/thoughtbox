import { generateId } from './utils.js';
import { getDb, getCurrentUser } from './firebase-init.js';

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

let currentMode = 'local';
let cloudUserId = null;
let thoughtCache = [];

// Internal helpers
function loadLocalThoughts() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.THOUGHTS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load local thoughts:', e);
    return [];
  }
}

function saveLocalThoughts(thoughts) {
  try {
    localStorage.setItem(STORAGE_KEYS.THOUGHTS, JSON.stringify(thoughts));
    return true;
  } catch (e) {
    console.error('Failed to save local thoughts:', e);
    return false;
  }
}

function getActiveThoughts() {
  if (currentMode === 'cloud') {
    return thoughtCache;
  }
  return loadLocalThoughts();
}

function setActiveThoughts(thoughts) {
  if (currentMode === 'cloud') {
    thoughtCache = thoughts;
  } else {
    saveLocalThoughts(thoughts);
  }
}

// New Cloud Exports
export function setCloudMode(userId) {
  currentMode = 'cloud';
  cloudUserId = userId;
}

export function setLocalMode() {
  currentMode = 'local';
  cloudUserId = null;
  thoughtCache = [];
}

export async function migrateLocalToCloud() {
  if (currentMode !== 'cloud' || !cloudUserId) return { migrated: 0 };
  const db = getDb();
  if (!db) return { migrated: 0 };

  const localThoughts = loadLocalThoughts();
  if (localThoughts.length === 0) return { migrated: 0 };

  const batch = db.batch();
  let count = 0;

  for (const thought of localThoughts) {
    const docRef = db.collection('users').doc(cloudUserId).collection('thoughts').doc(thought.id);
    batch.set(docRef, thought);
    count++;
  }

  try {
    await batch.commit();
    return { migrated: count };
  } catch (e) {
    console.error('Migration failed:', e);
    return { migrated: 0 };
  }
}

export async function loadFromCloud() {
  if (currentMode !== 'cloud' || !cloudUserId) return;
  const db = getDb();
  if (!db) return;

  try {
    const snapshot = await db.collection('users').doc(cloudUserId).collection('thoughts').get();
    thoughtCache = snapshot.docs.map(doc => doc.data());
  } catch (e) {
    console.error('Failed to load from cloud:', e);
    thoughtCache = [];
  }
}

// Save a new thought
export function saveThought(thought) {
  const thoughts = getActiveThoughts();
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
  setActiveThoughts(thoughts);

  if (currentMode === 'cloud' && cloudUserId) {
    const db = getDb();
    if (db) {
      db.collection('users').doc(cloudUserId).collection('thoughts').doc(newThought.id).set(newThought)
        .catch(e => console.error('Failed to save to cloud:', e));
    }
  }

  return newThought;
}

// Get all thoughts (sorted by createdAt desc)
export function getAllThoughts() {
  const thoughts = getActiveThoughts();
  return [...thoughts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// Get a single thought by ID
export function getThoughtById(id) {
  const thoughts = getActiveThoughts();
  return thoughts.find(t => t.id === id) || null;
}

// Update a thought (partial update)
export function updateThought(id, updates) {
  const thoughts = getActiveThoughts();
  const index = thoughts.findIndex(t => t.id === id);
  
  if (index === -1) return null;

  const now = new Date().toISOString();
  thoughts[index] = {
    ...thoughts[index],
    ...updates,
    updatedAt: now
  };

  setActiveThoughts(thoughts);

  if (currentMode === 'cloud' && cloudUserId) {
    const db = getDb();
    if (db) {
      db.collection('users').doc(cloudUserId).collection('thoughts').doc(id).update({
        ...updates,
        updatedAt: now
      }).catch(e => console.error('Failed to update in cloud:', e));
    }
  }

  return thoughts[index];
}

// Delete a thought
export function deleteThought(id) {
  let thoughts = getActiveThoughts();
  
  // Remove the thought
  thoughts = thoughts.filter(t => t.id !== id);
  
  // Remove connections pointing to this thought
  thoughts = thoughts.map(t => ({
    ...t,
    connections: (t.connections || []).filter(c => c.targetId !== id)
  }));

  setActiveThoughts(thoughts);

  if (currentMode === 'cloud' && cloudUserId) {
    const db = getDb();
    if (db) {
      db.collection('users').doc(cloudUserId).collection('thoughts').doc(id).delete()
        .catch(e => console.error('Failed to delete from cloud:', e));
      
      const batch = db.batch();
      thoughts.forEach(t => {
        const docRef = db.collection('users').doc(cloudUserId).collection('thoughts').doc(t.id);
        batch.update(docRef, { connections: t.connections });
      });
      batch.commit().catch(e => console.error('Failed to update connections in cloud:', e));
    }
  }
}

// Add a connection between two thoughts
export function addConnection(fromId, toId, strength = 0.5, reason = '') {
  const thoughts = getActiveThoughts();
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
  
  const now = new Date().toISOString();
  thoughts[index].updatedAt = now;
  setActiveThoughts(thoughts);

  if (currentMode === 'cloud' && cloudUserId) {
    const db = getDb();
    if (db) {
      db.collection('users').doc(cloudUserId).collection('thoughts').doc(fromId).update({
        connections: thoughts[index].connections,
        updatedAt: now
      }).catch(e => console.error('Failed to add connection in cloud:', e));
    }
  }

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
    thoughts: getActiveThoughts(),
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
    
    setActiveThoughts(data.thoughts);

    if (currentMode === 'cloud' && cloudUserId) {
      const db = getDb();
      if (db) {
        const batch = db.batch();
        data.thoughts.forEach(t => {
          const docRef = db.collection('users').doc(cloudUserId).collection('thoughts').doc(t.id);
          batch.set(docRef, t);
        });
        batch.commit().catch(e => console.error('Failed to import to cloud:', e));
      }
    }

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
  const thoughts = getActiveThoughts();
  return thoughts.length;
}
