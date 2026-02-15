// File: ./utils/settingsCache.js
// In-memory settings cache with invalidate-on-write strategy

import AppConfig from '../models/AppConfig.js';

const cache = new Map();
let loaded = false;

/**
 * Load all AppConfig documents into the in-memory cache.
 * Called once at server startup.
 */
export async function loadSettings() {
  try {
    const docs = await AppConfig.find({}).lean();
    cache.clear();
    for (const doc of docs) {
      cache.set(doc.key, doc.value);
    }
    loaded = true;
    console.log(`[SettingsCache] Loaded ${docs.length} settings into cache`);
  } catch (error) {
    console.error('[SettingsCache] Failed to load settings:', error.message);
  }
}

/**
 * Get a setting value from cache (synchronous, 0ms).
 * Falls back to defaultValue if key is not in cache.
 * @param {string} key - Dot-notation key (e.g. 'rewards.question_correct.first_attempt.coins')
 * @param {*} defaultValue - Fallback value if key not found
 * @returns {*} The cached value or defaultValue
 */
export function getSetting(key, defaultValue) {
  if (!loaded) return defaultValue;
  const val = cache.get(key);
  return val !== undefined ? val : defaultValue;
}

/**
 * Invalidate the cache and reload from DB.
 * Called after admin writes to AppConfig.
 */
export async function invalidateCache() {
  console.log('[SettingsCache] Invalidating cache...');
  await loadSettings();
}
