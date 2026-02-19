/**
 * Telegram Service
 * Sends messages and conversation summaries to a Telegram chat via the Bot API.
 *
 * Required environment variables:
 *   TELEGRAM_BOT_TOKEN  - From @BotFather (e.g. 123456:ABC-DEF...)
 *   TELEGRAM_CHAT_ID    - Your personal chat ID (get it from @userinfobot after
 *                         starting a conversation with your bot)
 */

const axios = require('axios');
const { chat } = require('./openai');

class TelegramService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || null;
    this.defaultChatId = process.env.TELEGRAM_CHAT_ID || null;
    this.apiBase = this.botToken
      ? `https://api.telegram.org/bot${this.botToken}`
      : null;
  }

  // ─── helpers ────────────────────────────────────────────────────────────────

  isConfigured() {
    return !!(this.botToken && this.defaultChatId);
  }

  _requireConfig() {
    if (!this.isConfigured()) {
      throw new Error(
        'Telegram not configured. Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to your .env file.'
      );
    }
  }

  /**
   * Resolve a chat ID, falling back to the env default.
   * @param {string|number|null} chatId
   * @returns {string}
   */
  _resolveChatId(chatId) {
    const resolved = chatId || this.defaultChatId;
    if (!resolved) {
      throw new Error('No chat_id provided and TELEGRAM_CHAT_ID is not set.');
    }
    return String(resolved);
  }

  // ─── core send ──────────────────────────────────────────────────────────────

  /**
   * Send a plain or Markdown-formatted text message to a Telegram chat.
   * @param {string} text          - Message text (supports Telegram MarkdownV2)
   * @param {string|number} [chatId] - Recipient chat ID; falls back to TELEGRAM_CHAT_ID
   * @param {object} [options]     - Extra Telegram sendMessage parameters
   * @returns {Promise<object>}    - { success, messageId, message }
   */
  async sendMessage(text, chatId = null, options = {}) {
    this._requireConfig();

    if (!text || !text.trim()) {
      throw new Error('Message text cannot be empty.');
    }

    const resolvedChatId = this._resolveChatId(chatId);

    const payload = {
      chat_id: resolvedChatId,
      text,
      parse_mode: options.parse_mode || 'Markdown',
      ...options
    };

    try {
      const response = await axios.post(`${this.apiBase}/sendMessage`, payload);
      const msg = response.data.result;

      return {
        success: true,
        messageId: msg.message_id,
        message: `Telegram message sent to chat ${resolvedChatId}`
      };
    } catch (err) {
      const detail = err.response?.data?.description || err.message;
      throw new Error(`Failed to send Telegram message: ${detail}`);
    }
  }

  // ─── AI summarisation ────────────────────────────────────────────────────────

  /**
   * Use OpenAI to produce a concise summary of an array of conversation messages.
   * @param {Array<{role:string, content:string}>} messages - Conversation history
   * @param {string} [contextLabel]  - Optional label, e.g. "SMS conversation with John"
   * @returns {Promise<string>} Plain-text summary
   */
  async summarizeConversation(messages, contextLabel = 'conversation') {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('messages must be a non-empty array.');
    }

    // Format the conversation for the prompt
    const transcript = messages
      .map(m => `${(m.role || 'unknown').toUpperCase()}: ${m.content || ''}`)
      .join('\n');

    const response = await chat([
      {
        role: 'system',
        content:
          'You are an assistant that creates concise, clear conversation summaries. ' +
          'Include: key topics discussed, any decisions made, action items, and the overall outcome. ' +
          'Keep it under 300 words. Use plain text with no special formatting symbols.'
      },
      {
        role: 'user',
        content: `Please summarize this ${contextLabel}:\n\n${transcript}`
      }
    ]);

    return response.choices[0].message.content.trim();
  }

  /**
   * Summarize a conversation with OpenAI, then send the result to Telegram.
   * @param {Array<{role:string, content:string}>} messages  - Conversation history
   * @param {string} [contextLabel] - Label shown in the Telegram header
   * @param {string|number} [chatId]  - Telegram chat ID; falls back to TELEGRAM_CHAT_ID
   * @returns {Promise<object>} { success, summary, messageId }
   */
  async sendConversationSummary(messages, contextLabel = 'conversation', chatId = null) {
    this._requireConfig();

    const summary = await this.summarizeConversation(messages, contextLabel);

    // Build a nicely formatted Telegram message (plain Markdown)
    const now = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const text =
      `*Conversation Summary*\n` +
      `*Context:* ${contextLabel}\n` +
      `*Date:* ${now}\n\n` +
      `${summary}`;

    const result = await this.sendMessage(text, chatId);

    return {
      success: true,
      summary,
      messageId: result.messageId,
      message: `Summary sent to Telegram (chat ${this._resolveChatId(chatId)})`
    };
  }

  /**
   * Summarize a voice call as a voicemail-style report and send it to Telegram.
   * Highlights caller info, the message left, any callback details, and urgency.
   * @param {Array<{role:string, content:string}>} messages - Full call transcript
   * @param {string} callerPhone  - The caller's phone number
   * @param {number} durationSecs - Call duration in seconds
   * @param {string|number} [chatId] - Telegram chat ID; falls back to TELEGRAM_CHAT_ID
   * @returns {Promise<object>} { success, summary, messageId }
   */
  async sendVoicemailSummary(messages, callerPhone, durationSecs, chatId = null) {
    this._requireConfig();

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('messages must be a non-empty array.');
    }

    const transcript = messages
      .map(m => `${(m.role || 'unknown').toUpperCase()}: ${m.content || ''}`)
      .join('\n');

    const response = await chat([
      {
        role: 'system',
        content:
          'You are summarizing a voicemail call handled by an AI assistant. ' +
          'Extract and present ONLY the following in plain text (no markdown symbols): ' +
          '1) Caller name (if given, otherwise "Unknown"). ' +
          '2) Reason for calling / message left. ' +
          '3) Any callback number or email provided. ' +
          '4) Urgency level: Low / Medium / High. ' +
          '5) One-line recommended action for Aston. ' +
          'If the call was spam, robocall, or bot and was hung up immediately, just say "SPAM/BOT — call ended immediately." ' +
          'Keep the whole summary under 120 words.'
      },
      {
        role: 'user',
        content: `Call transcript:\n\n${transcript}`
      }
    ]);

    const summary = response.choices[0].message.content.trim();

    const now = new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    const mins = Math.floor(durationSecs / 60);
    const secs = durationSecs % 60;
    const dur = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    const text =
      `*📱 Missed Call — Voicemail Summary*\n` +
      `*From:* ${callerPhone}\n` +
      `*Duration:* ${dur}\n` +
      `*Time:* ${now}\n\n` +
      `${summary}`;

    const result = await this.sendMessage(text, chatId);

    return {
      success: true,
      summary,
      messageId: result.messageId,
      message: `Voicemail summary sent to Telegram`
    };
  }

  /**
   * Send a pre-written summary to Telegram with an optional title header.
   * Use this when the summary text has already been generated.
   * @param {string} summary       - The summary text to send
   * @param {string} [title]       - Optional bold title line
   * @param {string|number} [chatId] - Telegram chat ID; falls back to TELEGRAM_CHAT_ID
   * @returns {Promise<object>}    - { success, messageId, message }
   */
  async sendFormattedSummary(summary, title = 'Summary', chatId = null) {
    this._requireConfig();

    if (!summary || !summary.trim()) {
      throw new Error('Summary text cannot be empty.');
    }

    const now = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const text =
      `*${title}*\n` +
      `_${now}_\n\n` +
      `${summary}`;

    return await this.sendMessage(text, chatId);
  }
}

module.exports = new TelegramService();
