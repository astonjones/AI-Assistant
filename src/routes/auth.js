/**
 * OAuth Authentication Routes
 * Handles Google OAuth2 callbacks for Gmail and Calendar
 */

const express = require('express');
const { google } = require('googleapis');
const router = express.Router();

/**
 * GET /auth/gmail/callback
 * Google OAuth2 callback endpoint
 * Handles the authorization code and exchanges it for a refresh token
 */
router.get('/gmail/callback', async (req, res) => {
  try {
    const { code, error } = req.query;

    // Check for errors from Google
    if (error) {
      return res.status(400).json({ 
        error: 'Authorization failed',
        details: error 
      });
    }

    if (!code) {
      return res.status(400).json({ 
        error: 'Missing authorization code' 
      });
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      `${process.env.NGROK_URL}/auth/gmail/callback`
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    // Return the refresh token to the user
    res.json({
      success: true,
      message: 'Authorization successful!',
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      expiresIn: tokens.expiry_date,
      instructions: 'Copy the refreshToken above and add it to your .env file as GMAIL_REFRESH_TOKEN'
    });
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).json({ 
      error: 'Failed to process authorization',
      message: err.message 
    });
  }
});

module.exports = router;
