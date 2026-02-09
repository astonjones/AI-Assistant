/**
 * SMS Routes
 * Handles SMS-related operations (sending, listing, etc.)
 */

const express = require('express');
const twilioService = require('../services/twilio');
const router = express.Router();

/**
 * POST /sms/send
 * Send an SMS message
 * 
 * Body:
 *   - to: Recipient phone number (required, e.g., +15551234567)
 *   - body: Message content (required)
 * 
 * Example:
 *   POST /sms/send
 *   { "to": "+15551234567", "body": "Hello from AI Agent" }
 */
router.post('/send', async (req, res) => {
  try {
    const { to, body } = req.body;

    if (!to || !body) {
      return res.status(400).json({
        error: 'Missing required parameters: to (phone number) and body (message)'
      });
    }

    const result = await twilioService.sendSMS(to, body);
    res.json(result);
  } catch (err) {
    console.error('Error sending SMS:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /sms/list
 * List recent SMS messages
 * 
 * Query Parameters:
 *   - limit: Number of messages to fetch (optional, default: 10, max: 100)
 * 
 * Example:
 *   GET /sms/list?limit=20
 */
router.get('/list', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        error: 'Limit must be between 1 and 100'
      });
    }

    const messages = await twilioService.listMessages(limit);
    res.json({
      count: messages.length,
      messages: messages
    });
  } catch (err) {
    console.error('Error listing SMS messages:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /sms/details/:messageSid
 * Get details about a specific SMS message
 * 
 * Params:
 *   - messageSid: Twilio message SID
 * 
 * Example:
 *   GET /sms/details/SM1234567890abcdef
 */
router.get('/details/:messageSid', async (req, res) => {
  try {
    const { messageSid } = req.params;

    if (!messageSid) {
      return res.status(400).json({
        error: 'Message SID is required'
      });
    }

    const details = await twilioService.getMessageDetails(messageSid);
    res.json(details);
  } catch (err) {
    console.error('Error fetching message details:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
