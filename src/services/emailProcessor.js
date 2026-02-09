const emailService = require('./email');
const { chat } = require('./openai');

/**
 * Email Processor - Analyzes and summarizes emails
 */

/**
 * Summarize emails by urgency
 * @param {Array} emails - List of email objects
 * @returns {Promise<object>} Summary with urgent, normal, low urgency groups
 */
async function summarizeEmailsByUrgency(emails) {
  const emailText = emails.map(e => `From: ${e.from}\nSubject: ${e.subject}\nBody: ${e.body}\n`).join('\n---\n');

  const response = await chat([
    {
      role: 'system',
      content: 'You are an email assistant. Analyze emails and categorize by urgency (urgent, normal, low). Return JSON with keys: urgent, normal, low. Each contains email subjects.'
    },
    {
      role: 'user',
      content: `Analyze these emails and categorize by urgency:\n\n${emailText}`
    }
  ]);

  try {
    return JSON.parse(response.choices[0].message.content);
  } catch {
    return response.choices[0].message.content;
  }
}

/**
 * Generate email report
 * @param {Array} emails - List of email objects
 * @returns {Promise<string>} Human-readable email report
 */
async function generateEmailReport(emails) {
  const emailText = emails.map(e => `From: ${e.from}\nSubject: ${e.subject}\nDate: ${e.date}\n`).join('\n');

  const response = await chat([
    {
      role: 'system',
      content: 'You are an email assistant. Create a concise, actionable report of emails. Highlight key senders and topics.'
    },
    {
      role: 'user',
      content: `Create a report for these emails:\n\n${emailText}`
    }
  ]);

  return response.choices[0].message.content;
}

/**
 * Draft email response using AI
 * @param {object} emailContext - Email to respond to (from, subject, body)
 * @param {string} userPrompt - User instructions for response
 * @returns {Promise<string>} Draft email body
 */
async function draftEmailResponse(emailContext, userPrompt) {
  const response = await chat([
    {
      role: 'system',
      content: 'You are an email assistant. Draft professional email responses based on context.'
    },
    {
      role: 'user',
      content: `Original email from ${emailContext.from}:\nSubject: ${emailContext.subject}\n\n${emailContext.body}\n\nUser request: ${userPrompt}\n\nDraft a response:`
    }
  ]);

  return response.choices[0].message.content;
}

module.exports = {
  summarizeEmailsByUrgency,
  generateEmailReport,
  draftEmailResponse
};
