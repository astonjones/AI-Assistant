/**
 * Database Routes
 * View database contents for debugging and monitoring
 */

const express = require('express');
const router = express.Router();
const dbService = require('../services/database.auto');

/**
 * GET /database/callers
 * Get all callers with their names and phone numbers
 */
router.get('/callers', async (req, res) => {
  try {
    await dbService.ensureReady();
    const callers = dbService.getAllCallers();
    
    res.json({
      success: true,
      count: callers.length,
      callers: callers
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /database/conversations
 * Get all conversations with caller info
 */
router.get('/conversations', async (req, res) => {
  try {
    await dbService.ensureReady();
    const limit = parseInt(req.query.limit) || 50;
    const conversations = dbService.getAllConversations(limit);
    
    res.json({
      success: true,
      count: conversations.length,
      conversations: conversations
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /database/stats
 * Get database statistics
 */
router.get('/stats', async (req, res) => {
  try {
    await dbService.ensureReady();
    const stats = dbService.getStats();
    
    res.json({
      success: true,
      stats: stats
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /database/caller/:phone
 * Get specific caller by phone number
 */
router.get('/caller/:phone', async (req, res) => {
  try {
    await dbService.ensureReady();
    const phone = req.params.phone;
    
    const callers = dbService.getAllCallers();
    const caller = callers.find(c => c.phone === phone);
    
    if (!caller) {
      return res.status(404).json({
        success: false,
        error: 'Caller not found'
      });
    }
    
    const conversations = dbService.getConversationHistory(phone, 10);
    
    res.json({
      success: true,
      caller: caller,
      conversationCount: conversations.length,
      recentConversations: conversations
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /database/conversation/:callSid
 * Get specific conversation with messages
 */
router.get('/conversation/:callSid', async (req, res) => {
  try {
    await dbService.ensureReady();
    const callSid = req.params.callSid;
    
    const conversation = dbService.getConversation(callSid);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }
    
    const messages = dbService.getConversationMessages(callSid);
    
    res.json({
      success: true,
      conversation: conversation,
      messageCount: messages.length,
      messages: messages
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
