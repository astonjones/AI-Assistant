/**
 * Webhook Routes
 * Handles incoming webhooks from external services
 */

const express = require('express');
const router = express.Router();

/**
 * POST /webhooks/sms
 * Receives incoming SMS messages from Twilio
 * 
 * Twilio sends form-encoded data:
 *   - MessageSid: Unique message identifier
 *   - From: Sender's phone number
 *   - To: Recipient phone number
 *   - Body: Message content
 */
router.post('/sms', (req, res) => {
  try {
    const { MessageSid, From, To} = req.body;

    // Log incoming message
    console.log('📨 Incoming SMS received:');
    console.log(`  Message ID: ${MessageSid}`);
    console.log(`  From: ${From}`);
    console.log(`  To: ${To}`);

  } catch (err) {
    console.error('Error processing webhook:', err.message);
    res.status(400).json({ error: 'Failed to process webhook' });
  }
});

module.exports = router;
