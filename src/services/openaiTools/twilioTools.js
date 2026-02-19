/**
 * Twilio Tools
 * Tool definitions (schemas only) for OpenAI function calling
 * 
 * NOTE: Handlers are implemented in functionHandler.js
 */

const twilioTools = [
  {
    type: 'function',
    name: 'send_sms',
    description: 'Send an SMS text message to a phone number. Use when user asks to send, text, or message someone via SMS.',
    parameters: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'The recipient phone number in E.164 format (e.g., +1234567890 or +44 20 7946 0958)'
        },
        body: {
          type: 'string',
          description: 'The SMS message content (max 160 characters for best results)'
        }
      },
      required: ['to', 'body']
    }
  },
  {
    type: 'function',
    name: 'list_sms_history',
    description: 'Retrieve recent SMS messages (both sent and received). Use when user asks to check texts, messages, or SMS history.',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          description: 'Number of recent messages to fetch (default: 10, max: 100)',
          default: 10
        }
      }
    }
  },
  {
    type: 'function',
    name: 'hang_up_call',
    description:
      'End the current phone call immediately. ' +
      'Use when the caller asks to hang up, says goodbye and the conversation is clearly finished, ' +
      'or when you need to terminate the call for any reason.',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Optional brief reason for ending the call, e.g. "caller requested", "conversation complete".'
        }
      }
    }
  }
];

module.exports = { twilioTools };
