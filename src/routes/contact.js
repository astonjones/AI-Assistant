/**
 * Contact Route
 * Handles lead form submissions from the marketing site.
 * Sends a Telegram notification with the lead's details.
 */

const express = require('express');
const telegramService = require('../services/telegram');
const router = express.Router();

/**
 * POST /contact
 *
 * Body:
 *   - firstName  {string} required
 *   - lastName   {string} required
 *   - email      {string} required
 *   - phone      {string} optional
 *   - business   {string} required
 *   - message    {string} required
 */
router.post('/', async (req, res) => {
  const { firstName, lastName, email, phone, business, message } = req.body;

  if (!firstName || !lastName || !email || !business || !message) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    const notification = [
      `📋 *New Lead — CallCleric*`,
      ``,
      `👤 *Name:* ${firstName} ${lastName}`,
      `🏢 *Business:* ${business}`,
      `📧 *Email:* ${email}`,
      phone ? `📞 *Phone:* ${phone}` : null,
      ``,
      `💬 *Message:*`,
      message,
    ]
      .filter((line) => line !== null)
      .join('\n');

    if (telegramService.isConfigured()) {
      await telegramService.sendMessage(notification);
    } else {
      // Still succeed for the user — just log locally if Telegram isn't set up
      console.log('New lead received (Telegram not configured):');
      console.log(notification);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to process contact form:', err.message);
    res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
});

module.exports = router;
