/**
 * Email Service - Integrates with Gmail API
 * Handles reading and sending emails with OAuth2 refresh token
 */

const { google } = require('googleapis');

class EmailService {
  constructor() {
    // Initialize Gmail OAuth2 client
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'http://localhost:3000/auth/gmail/callback'
    );

    // Set refresh token for persistent authentication
    if (process.env.GMAIL_REFRESH_TOKEN) {
      this.oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN
      });
      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    } else {
      this.gmail = null;
    }
  }

  /**
   * Check if Gmail is configured
   */
  isConfigured() {
    return !!this.gmail;
  }

  /**
   * Get recent emails from inbox
   * @param {number} limit - Number of emails to fetch
   * @returns {Promise<Array>} List of emails with subject, from, body, timestamp
   */
  async getRecentEmails(limit = 10) {
    if (!this.isConfigured()) {
      throw new Error('Gmail not configured. Add GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN to .env');
    }

    try {
      // List messages
      const res = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults: limit,
        q: 'is:inbox'
      });

      const messages = res.data.messages || [];
      const emails = [];

      // Get full details for each message
      for (const msg of messages) {
        const fullMsg = await this.gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full'
        });

        const headers = fullMsg.data.payload.headers;
        const subject = headers.find(h => h.name === 'Subject')?.value || '(no subject)';
        const from = headers.find(h => h.name === 'From')?.value || '(unknown)';
        const date = headers.find(h => h.name === 'Date')?.value || '';

        let body = '';
        if (fullMsg.data.payload.parts) {
          const textPart = fullMsg.data.payload.parts.find(p => p.mimeType === 'text/plain');
          if (textPart) {
            body = Buffer.from(textPart.body.data || '', 'base64').toString('utf-8');
          }
        } else if (fullMsg.data.payload.body?.data) {
          body = Buffer.from(fullMsg.data.payload.body.data, 'base64').toString('utf-8');
        }

        emails.push({
          id: msg.id,
          from,
          subject,
          body: body.substring(0, 500), // Truncate for performance
          date
        });
      }

      return emails;
    } catch (err) {
      throw new Error(`Failed to fetch emails: ${err.message}`);
    }
  }

  /**
   * Send an email
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} body - Email body
   * @returns {Promise<object>} Confirmation with message ID
   */
  async sendEmail(to, subject, body) {
    if (!this.isConfigured()) {
      throw new Error('Gmail not configured');
    }

    try {
      const message = [
        `To: ${to}`,
        `Subject: ${subject}`,
        '',
        body
      ].join('\n');

      const base64Message = Buffer.from(message).toString('base64');

      const res = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: base64Message
        }
      });

      return {
        success: true,
        messageId: res.data.id,
        message: `Email sent to ${to}`
      };
    } catch (err) {
      throw new Error(`Failed to send email: ${err.message}`);
    }
  }

  /**
   * Get email details by ID
   * @param {string} messageId - Gmail message ID
   * @returns {Promise<object>} Email details
   */
  async getEmailDetails(messageId) {
    if (!this.isConfigured()) {
      throw new Error('Gmail not configured');
    }

    try {
      const msg = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const headers = msg.data.payload.headers;
      return {
        id: messageId,
        from: headers.find(h => h.name === 'From')?.value,
        subject: headers.find(h => h.name === 'Subject')?.value,
        date: headers.find(h => h.name === 'Date')?.value
      };
    } catch (err) {
      throw new Error(`Failed to fetch email: ${err.message}`);
    }
  }
}

module.exports = new EmailService();
