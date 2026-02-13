/**
 * Auto Database Loader
 * Automatically selects PostgreSQL (Railway) or SQLite (local)
 * based on DATABASE_URL environment variable
 */

// Check which database to use
const usePostgres = !!process.env.DATABASE_URL;

if (usePostgres) {
  console.log('🐘 Using PostgreSQL (Railway/Production)');
  module.exports = require('./database.postgres');
} else {
  console.log('💾 Using SQLite (Local Development)');
  module.exports = require('./database');
}
