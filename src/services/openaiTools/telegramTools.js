/**
 * Telegram Tools
 * Tool definitions (schemas only) for OpenAI function calling.
 *
 * NOTE: Actual implementations live in functionHandler.js
 */

const telegramTools = [
  {
    type: 'function',
    name: 'send_telegram_message',
    description:
      'Send a text message to the user\'s Telegram chat. ' +
      'Use when the user asks to notify, ping, or message them via Telegram.',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The message text to send. Supports basic Markdown (bold with *text*, italic with _text_).'
        },
        chat_id: {
          type: 'string',
          description:
            'Optional Telegram chat ID to send to. Omit to use the default chat configured in the environment.'
        }
      },
      required: ['text']
    }
  },
  {
    type: 'function',
    name: 'summarize_and_send_telegram',
    description:
      'Summarize a list of conversation messages using AI and send the summary to Telegram. ' +
      'Use when the user asks to summarize a conversation and deliver it via Telegram.',
    parameters: {
      type: 'object',
      properties: {
        messages: {
          type: 'array',
          description: 'Array of conversation message objects to summarize.',
          items: {
            type: 'object',
            properties: {
              role: {
                type: 'string',
                description: 'The speaker role, e.g. "user", "assistant", "system".'
              },
              content: {
                type: 'string',
                description: 'The message content.'
              }
            },
            required: ['role', 'content']
          }
        },
        context_label: {
          type: 'string',
          description:
            'A short label describing what this conversation is about, ' +
            'e.g. "SMS conversation with John" or "support session". Defaults to "conversation".',
          default: 'conversation'
        },
        chat_id: {
          type: 'string',
          description:
            'Optional Telegram chat ID. Omit to use the default chat configured in the environment.'
        }
      },
      required: ['messages']
    }
  },
  {
    type: 'function',
    name: 'send_telegram_summary',
    description:
      'Send a pre-written summary text to Telegram with a formatted header. ' +
      'Use when you already have a summary string ready and just need to deliver it.',
    parameters: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'The pre-written summary text to send.'
        },
        title: {
          type: 'string',
          description: 'Bold title shown at the top of the Telegram message (default: "Summary").',
          default: 'Summary'
        },
        chat_id: {
          type: 'string',
          description:
            'Optional Telegram chat ID. Omit to use the default chat configured in the environment.'
        }
      },
      required: ['summary']
    }
  }
];

module.exports = { telegramTools };
