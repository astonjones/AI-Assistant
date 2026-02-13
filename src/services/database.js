/**
 * Database Service - SQLite Integration
 * Manages caller info, conversations, and message history
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class DatabaseService extends EventEmitter {
  constructor() {
    super();
    this.db = null;
    this.dbPath = path.join(__dirname, '../../data/calls.db');
    this.ready = false;
    this.initPromise = this.initialize();
  }

  async initialize() {
    try {
      const SQL = await initSqlJs();
      
      // Load existing database or create new one
      if (fs.existsSync(this.dbPath)) {
        const buffer = fs.readFileSync(this.dbPath);
        this.db = new SQL.Database(buffer);
      } else {
        // Ensure data directory exists
        const dataDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        this.db = new SQL.Database();
      }
      
      // Initialize schema
      this.initializeSchema();
      this.ready = true;
      this.saveToFile();
      console.log(`✅ Database initialized and ready`);
    } catch (err) {
      console.error(`❌ Database initialization error: ${err.message}`);
      throw err;
    }
  }

  saveToFile() {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    } catch (err) {
      console.error(`❌ Database save error: ${err.message}`);
    }
  }

  async ensureReady() {
    if (!this.ready) {
      await this.initPromise;
    }
  }

  /**
   * Initialize database schema (creates tables if they don't exist)
   */
  initializeSchema() {
    // Callers table - tracks unique phone numbers and caller info
    this.db.run(`
      CREATE TABLE IF NOT EXISTS callers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT UNIQUE NOT NULL,
        name TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        lastCallAt DATETIME,
        callCount INTEGER DEFAULT 0
      )
    `);

    // Conversations table - tracks individual calls
    this.db.run(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        callSid TEXT UNIQUE NOT NULL,
        callerId INTEGER NOT NULL,
        callStartTime DATETIME DEFAULT CURRENT_TIMESTAMP,
        callEndTime DATETIME,
        durationSeconds INTEGER,
        nameExtracted BOOLEAN DEFAULT 0,
        summary TEXT,
        FOREIGN KEY(callerId) REFERENCES callers(id)
      )
    `);

    // Messages table - logs all user/AI messages in a conversation
    this.db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversationId INTEGER NOT NULL,
        role TEXT NOT NULL,
        transcript TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(conversationId) REFERENCES conversations(id)
      )
    `);
    
    this.saveToFile();
  }

  /**
   * Create or update a caller record
   * @param {string} phone - Caller's phone number (e.g., "+12125551234")
   * @param {string} [name] - Caller's name (optional)
   * @returns {object} Caller record
   */
  upsertCaller(phone, name = null) {
    if (!this.db) {
      console.error(`❌ Database not initialized in upsertCaller`);
      return null;
    }
    
    try {
      // Check if caller exists
      const stmt = this.db.prepare('SELECT * FROM callers WHERE phone = ?');
      stmt.bind([phone]);
      const existing = stmt.step() ? stmt.getAsObject() : null;
      stmt.free();

      if (existing) {
        // Update last call time
        this.db.run('UPDATE callers SET lastCallAt = CURRENT_TIMESTAMP, callCount = callCount + 1 WHERE phone = ?', [phone]);
        this.saveToFile();
        return existing;
      } else {
        // Insert new caller
        this.db.run('INSERT INTO callers (phone, name) VALUES (?, ?)', [phone, name]);
        this.saveToFile();
        
        const stmt2 = this.db.prepare('SELECT * FROM callers WHERE phone = ?');
        stmt2.bind([phone]);
        const result = stmt2.step() ? stmt2.getAsObject() : null;
        stmt2.free();
        return result;
      }
    } catch (err) {
      console.error(`❌ Database error (upsertCaller): ${err.message}`);
      return null;
    }
  }

  /**
   * Create a new conversation record
   * @param {string} callSid - Twilio Call SID
   * @param {string} phone - Caller's phone number
   * @returns {object} Conversation record
   */
  createConversation(callSid, phone) {
    if (!this.db) {
      console.error(`❌ Database not initialized in createConversation`);
      return null;
    }
    
    try {
      // Get caller ID
      const stmt = this.db.prepare('SELECT id FROM callers WHERE phone = ?');
      stmt.bind([phone]);
      const caller = stmt.step() ? stmt.getAsObject() : null;
      stmt.free();

      if (!caller) {
        console.error(`❌ Caller not found: ${phone}`);
        return null;
      }

      // Create conversation
      this.db.run('INSERT INTO conversations (callSid, callerId) VALUES (?, ?)', [callSid, caller.id]);
      this.saveToFile();

      const stmt2 = this.db.prepare('SELECT * FROM conversations WHERE callSid = ?');
      stmt2.bind([callSid]);
      const result = stmt2.step() ? stmt2.getAsObject() : null;
      stmt2.free();
      return result;
    } catch (err) {
      console.error(`❌ Database error (createConversation): ${err.message}`);
      return null;
    }
  }

  /**
   * End a conversation and calculate duration
   * @param {string} callSid - Twilio Call SID
   */
  endConversation(callSid) {
    try {
      const stmt = this.db.prepare('SELECT callStartTime FROM conversations WHERE callSid = ?');
      stmt.bind([callSid]);
      const conv = stmt.step() ? stmt.getAsObject() : null;
      stmt.free();

      if (!conv) return null;

      // Calculate duration in seconds
      const startTime = new Date(conv.callStartTime);
      const endTime = new Date();
      const durationSeconds = Math.round((endTime - startTime) / 1000);

      this.db.run('UPDATE conversations SET callEndTime = CURRENT_TIMESTAMP, durationSeconds = ? WHERE callSid = ?', [durationSeconds, callSid]);
      this.saveToFile();
    } catch (err) {
      console.error(`❌ Database error (endConversation): ${err.message}`);
    }
  }

  /**
   * Log a message (user or assistant) in a conversation
   * @param {string} callSid - Twilio Call SID
   * @param {string} role - 'user' or 'assistant'
   * @param {string} transcript - The message text
   */
  logMessage(callSid, role, transcript) {
    try {
      const stmt = this.db.prepare('SELECT id FROM conversations WHERE callSid = ?');
      stmt.bind([callSid]);
      const conv = stmt.step() ? stmt.getAsObject() : null;
      stmt.free();

      if (!conv) {
        console.warn(`⚠️  Conversation not found for message: ${callSid}`);
        return;
      }

      this.db.run('INSERT INTO messages (conversationId, role, transcript) VALUES (?, ?, ?)', [conv.id, role, transcript]);
      this.saveToFile();
    } catch (err) {
      console.error(`❌ Database error (logMessage): ${err.message}`);
    }
  }

  /**
   * Update caller's name
   * @param {string} phone - Caller's phone number
   * @param {string} name - Caller's name
   */
  updateCallerName(phone, name) {
    if (!this.db) {
      console.error(`❌ Database not initialized in updateCallerName`);
      return { success: false, error: 'Database not initialized' };
    }

    try {
      if (!name || name.trim().length === 0) {
        console.warn(`⚠️  Cannot update caller name - name is empty`);
        return { success: false, error: 'Name is empty' };
      }

      console.log(`📝 Updating caller name: ${phone} → "${name}"`);
      
      this.db.run('UPDATE callers SET name = ? WHERE phone = ?', [name, phone]);
      this.saveToFile();
      
      // Verify update
      const stmt = this.db.prepare('SELECT * FROM callers WHERE phone = ?');
      stmt.bind([phone]);
      const result = stmt.step() ? stmt.getAsObject() : null;
      stmt.free();
      
      if (result) {
        console.log(`✅ Name updated successfully: ${phone} → "${result.name}"`);
        return { success: true, caller: result };
      } else {
        console.error(`❌ Caller not found after update: ${phone}`);
        return { success: false, error: 'Caller not found' };
      }
    } catch (err) {
      console.error(`❌ Database error (updateCallerName): ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Mark that caller's name has been extracted in this conversation
   * @param {string} callSid - Twilio Call SID
   */
  markNameExtracted(callSid) {
    try {
      this.db.run('UPDATE conversations SET nameExtracted = 1 WHERE callSid = ?', [callSid]);
      this.saveToFile();
    } catch (err) {
      console.error(`❌ Database error (markNameExtracted): ${err.message}`);
    }
  }

  /**
   * Get conversation record
   * @param {string} callSid - Twilio Call SID
   * @returns {object} Conversation record
   */
  getConversation(callSid) {
    try {
      const stmt = this.db.prepare('SELECT * FROM conversations WHERE callSid = ?');
      stmt.bind([callSid]);
      const result = stmt.step() ? stmt.getAsObject() : null;
      stmt.free();
      return result;
    } catch (err) {
      console.error(`❌ Database error (getConversation): ${err.message}`);
      return null;
    }
  }

  /**
   * Get conversation history for a caller
   * @param {string} phone - Caller's phone number
   * @param {number} limit - Max conversations to return
   * @returns {array} Conversation records
   */
  getConversationHistory(phone, limit = 10) {
    if (!this.db) {
      console.error(`❌ Database not initialized in getConversationHistory`);
      return [];
    }
    
    try {
      const stmt = this.db.prepare(`
        SELECT c.* FROM conversations c
        JOIN callers cal ON c.callerId = cal.id
        WHERE cal.phone = ?
        ORDER BY c.callStartTime DESC
        LIMIT ?
      `);
      stmt.bind([phone, limit]);
      
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    } catch (err) {
      console.error(`❌ Database error (getConversationHistory): ${err.message}`);
      return [];
    }
  }

  /**
   * Get all messages in a conversation
   * @param {string} callSid - Twilio Call SID
   * @returns {array} Message records
   */
  getConversationMessages(callSid) {
    try {
      const stmt = this.db.prepare(`
        SELECT m.* FROM messages m
        JOIN conversations c ON m.conversationId = c.id
        WHERE c.callSid = ?
        ORDER BY m.timestamp ASC
      `);
      stmt.bind([callSid]);
      
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    } catch (err) {
      console.error(`❌ Database error (getConversationMessages): ${err.message}`);
      return [];
    }
  }

  /**
   * Get caller info
   * @param {string} phone - Caller's phone number
   * @returns {object} Caller record
   */
  getCaller(phone) {
    try {
      const stmt = this.db.prepare('SELECT * FROM callers WHERE phone = ?');
      stmt.bind([phone]);
      const result = stmt.step() ? stmt.getAsObject() : null;
      stmt.free();
      return result;
    } catch (err) {
      console.error(`❌ Database error (getCaller): ${err.message}`);
      return null;
    }
  }

  /**
   * Get previous conversations formatted for OpenAI API context injection
   * Returns a string summary of past conversations for system prompt context
   * @param {string} phone - Caller's phone number
   * @param {number} limitConversations - Max conversations to summarize
   * @returns {string} Formatted conversation history for context
   */
  getConversationContextForOpenAI(phone, limitConversations = 3) {
    try {
      const stmt = this.db.prepare(`
        SELECT c.id, c.callStartTime, c.durationSeconds FROM conversations c
        JOIN callers cal ON c.callerId = cal.id
        WHERE cal.phone = ?
        ORDER BY c.callStartTime DESC
        LIMIT ?
      `);
      stmt.bind([phone, limitConversations]);
      
      const conversations = [];
      while (stmt.step()) {
        conversations.push(stmt.getAsObject());
      }
      stmt.free();

      if (!conversations || conversations.length === 0) {
        return ''; // First-time caller
      }

      // Build context string with brief summaries
      let contextLines = [`Previous conversation(s) with this caller:`];
      conversations.forEach((conv, idx) => {
        const date = new Date(conv.callStartTime);
        const duration = conv.durationSeconds ? `${Math.round(conv.durationSeconds / 60)}m` : 'unknown';
        contextLines.push(`- Call ${idx + 1}: ${date.toLocaleDateString()} (${duration})`);
      });

      return contextLines.join('\n');
    } catch (err) {
      console.error(`❌ Database error (getConversationContextForOpenAI): ${err.message}`);
      return '';
    }
  }

  /**
   * Get conversation messages formatted as OpenAI API messages
   * Useful for re-injecting context into new sessions
   * @param {string} callSid - Twilio Call SID
   * @returns {array} Array of {role: 'user'|'assistant', content: string}
   */
  getConversationAsOpenAIMessages(callSid) {
    try {
      const stmt = this.db.prepare(`
        SELECT m.role, m.transcript FROM messages m
        JOIN conversations c ON m.conversationId = c.id
        WHERE c.callSid = ?
        ORDER BY m.timestamp ASC
      `);
      stmt.bind([callSid]);
      
      const messages = [];
      while (stmt.step()) {
        messages.push(stmt.getAsObject());
      }
      stmt.free();

      // Transform to OpenAI format
      return messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.transcript
      }));
    } catch (err) {
      console.error(`❌ Database error (getConversationAsOpenAIMessages): ${err.message}`);
      return [];
    }
  }

  /**
   * Get all callers from the database
   * @returns {array} All caller records
   */
  getAllCallers() {
    if (!this.db) {
      console.error(`❌ Database not initialized in getAllCallers`);
      return [];
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM callers ORDER BY createdAt DESC');
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    } catch (err) {
      console.error(`❌ Database error (getAllCallers): ${err.message}`);
      return [];
    }
  }

  /**
   * Get all conversations from the database
   * @param {number} limit - Optional limit
   * @returns {array} All conversation records with caller info
   */
  getAllConversations(limit = 50) {
    if (!this.db) {
      console.error(`❌ Database not initialized in getAllConversations`);
      return [];
    }

    try {
      const stmt = this.db.prepare(`
        SELECT 
          c.*,
          cal.phone as callerPhone,
          cal.name as callerName
        FROM conversations c
        LEFT JOIN callers cal ON c.callerId = cal.id
        ORDER BY c.callStartTime DESC
        LIMIT ?
      `);
      stmt.bind([limit]);
      
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    } catch (err) {
      console.error(`❌ Database error (getAllConversations): ${err.message}`);
      return [];
    }
  }

  /**
   * Get database statistics
   * @returns {object} Database stats
   */
  getStats() {
    if (!this.db) {
      return { error: 'Database not initialized' };
    }

    try {
      const callerCount = this.db.exec('SELECT COUNT(*) as count FROM callers')[0]?.values[0][0] || 0;
      const conversationCount = this.db.exec('SELECT COUNT(*) as count FROM conversations')[0]?.values[0][0] || 0;
      const messageCount = this.db.exec('SELECT COUNT(*) as count FROM messages')[0]?.values[0][0] || 0;
      
      return {
        totalCallers: callerCount,
        totalConversations: conversationCount,
        totalMessages: messageCount,
        databasePath: this.dbPath,
        isReady: this.ready
      };
    } catch (err) {
      console.error(`❌ Database error (getStats): ${err.message}`);
      return { error: err.message };
    }
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.saveToFile();
      this.db.close();
      console.log(`🔐 Database connection closed`);
    }
  }
}

module.exports = new DatabaseService();
