/**
 * Moderation Module for Discord Bot
 * Handles warns, mutes, bans, kicks
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const db = new Database(path.join(__dirname, 'servermanager.db'));

// Create moderation tables
db.exec(`
  CREATE TABLE IF NOT EXISTS warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    reason TEXT,
    admin_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS mutes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    reason TEXT,
    admin_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

/**
 * Add a warning to a user
 */
function addWarning(guildId, userId, reason, adminId) {
  db.prepare('INSERT INTO warnings (guild_id, user_id, reason, admin_id) VALUES (?, ?, ?, ?)')
    .run(guildId, userId, reason, adminId);
  
  const result = db.prepare('SELECT COUNT(*) as count FROM warnings WHERE guild_id = ? AND user_id = ?')
    .get(guildId, userId);
  return result.count;
}

/**
 * Get warning count for a user
 */
function getWarnings(guildId, userId) {
  const result = db.prepare('SELECT COUNT(*) as count FROM warnings WHERE guild_id = ? AND user_id = ?')
    .get(guildId, userId);
  return result.count;
}

/**
 * Get all warnings for a user
 */
function getWarningsList(guildId, userId) {
  return db.prepare('SELECT reason, admin_id, created_at FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC')
    .all(guildId, userId);
}

/**
 * Clear all warnings for a user
 */
function clearWarnings(guildId, userId) {
  db.prepare('DELETE FROM warnings WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
}

/**
 * Add a mute to a user
 */
function addMute(guildId, userId, expiresAt) {
  db.prepare('INSERT OR REPLACE INTO mutes (guild_id, user_id, expires_at) VALUES (?, ?, ?)')
    .run(guildId, userId, expiresAt.toISOString());
}

/**
 * Remove a mute from a user
 */
function removeMute(guildId, userId) {
  db.prepare('DELETE FROM mutes WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
}

/**
 * Check if a user is muted
 */
function isMuted(guildId, userId) {
  const mute = db.prepare('SELECT expires_at FROM mutes WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  if (!mute) return false;
  
  // Check if mute has expired
  if (new Date(mute.expires_at) < new Date()) {
    removeMute(guildId, userId);
    return false;
  }
  
  return true;
}

/**
 * Parse duration string (1m, 1h, 1d)
 */
function parseDuration(durationStr) {
  if (!durationStr) return 10 * 60 * 1000; // Default 10 minutes
  
  const match = durationStr.match(/^(\d+)([mhd])$/);
  if (!match) return 10 * 60 * 1000;
  
  const [, amount, unit] = match;
  const num = parseInt(amount);
  
  switch (unit) {
    case 'm': return num * 60 * 1000;
    case 'h': return num * 60 * 60 * 1000;
    case 'd': return num * 24 * 60 * 60 * 1000;
    default: return 10 * 60 * 1000;
  }
}

module.exports = {
  addWarning,
  getWarnings,
  getWarningsList,
  clearWarnings,
  addMute,
  removeMute,
  isMuted,
  parseDuration,
};