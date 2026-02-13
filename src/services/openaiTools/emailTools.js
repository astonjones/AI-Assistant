/**
 * Email Tools
 * Tool definitions (schemas only) for OpenAI function calling
 * 
 * NOTE: Handlers are implemented in functionHandler.js
 */

const emailTools = [
  {
    type: 'function',
    name: 'send_email',
    description: 'Send an email to a recipient. Use this when the user asks to send, compose, or write an email.',
    parameters: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'The recipient email address (e.g., john@example.com)'
        },
        subject: {
          type: 'string',
          description: 'The email subject line'
        },
        body: {
          type: 'string',
          description: 'The email body/message content'
        }
      },
      required: ['to', 'subject', 'body']
    }
  },
  {
    type: 'function',
    name: 'read_emails',
    description: 'Fetch recent emails from the inbox. Use when user asks to read, check, or retrieve emails.',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          description: 'Number of recent emails to fetch (default: 5, max: 20)',
          default: 5
        }
      }
    }
  },
  {
    type: 'function',
    name: 'summarize_emails',
    description: 'Summarize emails by urgency level. Use when user asks for a summary or categorization of emails.',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          description: 'Number of recent emails to summarize (default: 10)',
          default: 10
        }
      }
    }
  }
];

module.exports = { emailTools };
