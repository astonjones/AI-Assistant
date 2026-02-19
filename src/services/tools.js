/**
 * Tools Orchestrator
 * Loads tool definitions and provides unified interface for tool execution
 * Works with both OpenAI Realtime and standard OpenAI APIs
 * 
 * NOTE: Actual tool implementations are in functionHandler.js
 */

// Load tool definitions (schemas only) from openaiTools/ folder
const { databaseTools } = require('./openaiTools/databaseTools');
const { calendarTools } = require('./openaiTools/calendarTools');
const { emailTools } = require('./openaiTools/emailTools');
const { twilioTools } = require('./openaiTools/twilioTools');
const { telegramTools } = require('./openaiTools/telegramTools');

// Import the actual function implementations
const { executeFunction } = require('./functionHandler');

class ToolsService {
  constructor() {
    // Combine all tool definitions into single array
    this.tools = [
      ...databaseTools,
      ...calendarTools,
      ...emailTools,
      ...twilioTools,
      ...telegramTools
    ];

    console.log(`✅ Tools service initialized with ${this.tools.length} available tools`);
  }

  /**
   * Get all available tools for the AI session
   * @returns {array} Tool definitions for OpenAI session config
   */
  getTools() {
    return this.tools;
  }

  /**
   * Execute a tool based on function name and arguments
   * @param {string} name - Tool/function name
   * @param {object} args - Function arguments
   * @param {string} phone - Optional phone number context
   * @returns {Promise<object>} { success, result, error }
   */
  async executeTool(name, args, phone = null, callSid = null) {
    try {
      const result = await executeFunction(name, args, phone, callSid);
      return result;
    } catch (err) {
      console.error(`❌ Tool execution error (${name}):`, err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }
}

module.exports = new ToolsService();