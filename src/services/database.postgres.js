/**
 * Database Service - PostgreSQL Version
 * For Railway deployment with PostgreSQL
 * 
 * To use: Rename this file to database.js (backup old one first)
 * or update require() statements to use this file
 */

const { Pool } = require('pg');

class DatabaseService {
  constructor() {
    this.pool = null;
    this.ready = false;
  }

  /**
   * Initialize PostgreSQL connection
   */
  async initialize() {
    try {
      // Railway provides DATABASE_URL automatically
      const connectionString = process.env.DATABASE_URL;
      
      if (!connectionString) {
        console.warn('⚠️  DATABASE_URL not found. Using SQLite fallback (not recommended for production)');
        return;
      }

      this.pool = new Pool({
        connectionString,
        ssl: process.env.NODE_ENV === 'production' ? {
          rejectUnauthorized: false
        } : false
      });

      // Test connection
      const client = await this.pool.connect();
      console.log('✅ PostgreSQL connected');
      client.release();

      // Create tables
      await this.initializeSchema();
      
      this.ready = true;
      console.log('✅ Database initialized and ready');
    } catch (err) {
      console.error(`❌ Database initialization error: ${err.message}`);
      throw err;
    }
  }

  /**
   * Create database schema
   */
  async initializeSchema() {
    const schema = `
      CREATE TABLE IF NOT EXISTS callers (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(255),
        summary TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        call_sid VARCHAR(100) UNIQUE NOT NULL,
        caller_id INTEGER REFERENCES callers(id),
        call_start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        call_end_time TIMESTAMP,
        duration_seconds INTEGER,
        name_extracted BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES conversations(id),
        role VARCHAR(20) NOT NULL,
        content TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_callers_phone ON callers(phone);
      CREATE INDEX IF NOT EXISTS idx_conversations_call_sid ON conversations(call_sid);
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
    `;

    await this.pool.query(schema);

    // summary column added in v2 - safe migration for existing databases
    try {
      await this.pool.query(`ALTER TABLE callers ADD COLUMN IF NOT EXISTS summary TEXT`);
    } catch (_) { /* already exists */ }
  }

  /**
   * Wait for database to be ready
   */
  async ensureReady() {
    if (this.ready) return;
    
    let attempts = 0;
    while (!this.ready && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!this.ready) {
      throw new Error('Database not ready after 1 second');
    }
  }

  /**
   * Insert or update a caller by phone number
   * @param {string} phone - Caller's phone number
   * @param {string} name - Caller's name (optional)
   * @returns {object} Caller record
   */
  async upsertCaller(phone, name = null) {
    if (!this.pool) {
      console.error(`❌ Database not initialized in upsertCaller`);
      return null;
    }

    try {
      const result = await this.pool.query(
        `INSERT INTO callers (phone, name) 
         VALUES ($1, $2) 
         ON CONFLICT (phone) 
         DO UPDATE SET name = COALESCE($2, callers.name)
         RETURNING *`,
        [phone, name]
      );
      
      return result.rows[0];
    } catch (err) {
      console.error(`❌ Database error (upsertCaller): ${err.message}`);
      return null;
    }
  }

  /**
   * Create a new conversation
   * @param {string} callSid - Twilio Call SID
   * @param {string} phone - Caller's phone number
   * @returns {object} Conversation record
   */
  async createConversation(callSid, phone) {
    if (!this.pool) {
      console.error(`❌ Database not initialized in createConversation`);
      return null;
    }

    try {
      // Get caller ID
      const callerResult = await this.pool.query(
        'SELECT id FROM callers WHERE phone = $1',
        [phone]
      );

      if (callerResult.rows.length === 0) {
        console.error(`❌ Caller not found: ${phone}`);
        return null;
      }

      const callerId = callerResult.rows[0].id;

      // Create conversation
      const result = await this.pool.query(
        `INSERT INTO conversations (call_sid, caller_id) 
         VALUES ($1, $2) 
         RETURNING *`,
        [callSid, callerId]
      );

      return result.rows[0];
    } catch (err) {
      console.error(`❌ Database error (createConversation): ${err.message}`);
      return null;
    }
  }

  /**
   * End a conversation and calculate duration
   * @param {string} callSid - Twilio Call SID
   */
  async endConversation(callSid) {
    if (!this.pool) return;

    try {
      await this.pool.query(
        `UPDATE conversations 
         SET call_end_time = CURRENT_TIMESTAMP,
             duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - call_start_time))
         WHERE call_sid = $1`,
        [callSid]
      );
    } catch (err) {
      console.error(`❌ Database error (endConversation): ${err.message}`);
    }
  }

  /**
   * Log a message in the conversation
   * @param {string} callSid - Twilio Call SID
   * @param {string} role - Message role (user/assistant/system)
   * @param {string} content - Message content
   */
  async logMessage(callSid, role, content) {
    if (!this.pool) return;

    try {
      // Get conversation ID
      const convResult = await this.pool.query(
        'SELECT id FROM conversations WHERE call_sid = $1',
        [callSid]
      );

      if (convResult.rows.length === 0) {
        console.warn(`⚠️  Conversation not found for message: ${callSid}`);
        return;
      }

      const conversationId = convResult.rows[0].id;

      await this.pool.query(
        'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
        [conversationId, role, content]
      );
    } catch (err) {
      console.error(`❌ Database error (logMessage): ${err.message}`);
    }
  }

  /**
   * Get the rolling caller summary
   * @param {string} phone
   * @returns {string|null}
   */
  async getCallerSummary(phone) {
    try {
      const result = await this.pool.query(
        'SELECT summary FROM callers WHERE phone = $1',
        [phone]
      );
      return result.rows[0]?.summary || null;
    } catch (err) {
      console.error(`❌ Database error (getCallerSummary): ${err.message}`);
      return null;
    }
  }

  /**
   * Overwrite the rolling summary for a caller
   * @param {string} phone
   * @param {string} summary
   */
  async updateCallerSummary(phone, summary) {
    try {
      await this.pool.query(
        'UPDATE callers SET summary = $1 WHERE phone = $2',
        [summary, phone]
      );
    } catch (err) {
      console.error(`❌ Database error (updateCallerSummary): ${err.message}`);
    }
  }

  /**
   * Update caller's name
   * @param {string} phone - Caller's phone number
   * @param {string} name - New name
   */
  async updateCallerName(phone, name) {
    if (!this.pool) return;

    try {
      await this.pool.query(
        'UPDATE callers SET name = $1 WHERE phone = $2',
        [name, phone]
      );
    } catch (err) {
      console.error(`❌ Database error (updateCallerName): ${err.message}`);
    }
  }

  /**
   * Mark that caller's name has been extracted in this conversation
   * @param {string} callSid - Twilio Call SID
   */
  async markNameExtracted(callSid) {
    if (!this.pool) return;

    try {
      await this.pool.query(
        'UPDATE conversations SET name_extracted = TRUE WHERE call_sid = $1',
        [callSid]
      );
    } catch (err) {
      console.error(`❌ Database error (markNameExtracted): ${err.message}`);
    }
  }

  /**
   * Get conversation by Call SID
   * @param {string} callSid - Twilio Call SID
   * @returns {object} Conversation record
   */
  async getConversation(callSid) {
    if (!this.pool) return null;

    try {
      const result = await this.pool.query(
        'SELECT * FROM conversations WHERE call_sid = $1',
        [callSid]
      );
      return result.rows[0] || null;
    } catch (err) {
      console.error(`❌ Database error (getConversation): ${err.message}`);
      return null;
    }
  }

  /**
   * Get conversation history for a phone number
   * @param {string} phone - Phone number
   * @param {number} limit - Maximum number of conversations to return
   * @returns {array} Array of conversation records
   */
  async getConversationHistory(phone, limit = 5) {
    if (!this.pool) {
      console.error(`❌ Database not initialized in getConversationHistory`);
      return [];
    }

    try {
      const result = await this.pool.query(
        `SELECT c.* 
         FROM conversations c
         JOIN callers ca ON c.caller_id = ca.id
         WHERE ca.phone = $1
         ORDER BY c.call_start_time DESC
         LIMIT $2`,
        [phone, limit]
      );

      return result.rows;
    } catch (err) {
      console.error(`❌ Database error (getConversationHistory): ${err.message}`);
      return [];
    }
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Export singleton instance
module.exports = new DatabaseService();
