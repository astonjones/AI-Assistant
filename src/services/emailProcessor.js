const emailService = require('./email');
const { chat } = require('./openai');

/**
 * Email Processor - Analyzes, summarizes, and auto-responds to emails.
 * Includes a dedicated pipeline for Zillow @convo.zillow.com leads.
 */

// ─────────────────────────────────────────────────────────────
// ZILLOW LEAD PROCESSING
// ─────────────────────────────────────────────────────────────

/**
 * Extract structured data from a Zillow relay email body.
 *
 * Zillow forwards buyer inquiries through @convo.zillow.com with a loosely
 * structured plain-text body. This parser uses regex to pull out the most
 * common fields while falling back gracefully when a field is absent.
 *
 * @param {object} email - Raw email object { id, from, replyTo, subject, body, date }
 * @returns {object} Normalized lead data
 */
function normalizeZillowEmail(email) {
  const body = email.body || '';
  const subject = email.subject || '';

  // ── Helper: first regex match or fallback ──────────────────
  const extract = (patterns, fallback = null) => {
    for (const pattern of patterns) {
      const m = body.match(pattern);
      if (m && m[1]) return m[1].trim();
    }
    return fallback;
  };

  // Buyer / contact name
  const buyerName = extract([
    /(?:name|buyer|contact|from)[:\s]+([A-Za-z][^\n\r]{1,60})/i,
    /^([A-Za-z][^\n\r]{1,60})\s+(?:sent|contacted|is interested)/im
  ]);

  // Buyer reply-to email address
  const buyerEmailMatch = (email.replyTo || email.from || '').match(/[\w.+-]+@[\w.-]+\.\w+/);
  const buyerEmail = buyerEmailMatch ? buyerEmailMatch[0] : null;

  // Buyer phone number
  const buyerPhone = extract([
    /(?:phone|cell|mobile|tel)[:\s]+([+\d()\s.\-]{7,20})/i,
    /(\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4})/
  ]);

  // Property address  (Zillow often puts it on its own line after "Property:")
  const propertyAddress = extract([
    /(?:property|address|listing|home)[:\s]+([^\n\r]{5,120})/i,
    /(?:interested in|viewing|about)\s+([^\n\r]{5,120})/i
  ]) || extract([/Subject:.*?([0-9]+[^\n\r]{5,80}(?:st|ave|blvd|rd|dr|ln|way|ct|pl|hwy)[^\n\r]*)/i]) || subject.replace(/^(?:re:|fwd?:|\[zillow\])\s*/i, '').trim() || null;

  // Listing price
  const listingPrice = extract([
    /(?:price|list(?:ing)?|asking)[:\s]+\$?([\d,]+(?:\.\d{2})?(?:\s*[kKmM])?)/i,
    /\$([\d,]{4,})/
  ]);

  // Buyer message – everything after a "Message:" label or the last paragraph
  let buyerMessage = null;
  const msgMatch = body.match(/(?:message|note|comment|says?)[:\s]*\n+([\s\S]+?)(?:\n[-─=*]{3,}|\n\n---|\Z)/i);
  if (msgMatch) {
    buyerMessage = msgMatch[1].trim();
  } else {
    // Grab the last substantive paragraph as the message
    const paragraphs = body.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 20);
    if (paragraphs.length) buyerMessage = paragraphs[paragraphs.length - 1];
  }

  return {
    buyerName,
    buyerEmail,
    buyerPhone,
    propertyAddress,
    listingPrice,
    buyerMessage,
    originalSubject: subject,
    originalFrom: email.from,
    replyTo: email.replyTo || email.from,
    emailId: email.id,
    receivedAt: email.date
  };
}

/**
 * Ask the AI to interpret a normalized Zillow lead and draft a reply.
 *
 * @param {object} lead - Output of normalizeZillowEmail()
 * @returns {Promise<string>} AI-generated email body ready to send
 */
async function generateZillowAIResponse(lead) {
  const leadSummary = [
    lead.buyerName    ? `Buyer name: ${lead.buyerName}`           : null,
    lead.buyerEmail   ? `Buyer email: ${lead.buyerEmail}`          : null,
    lead.buyerPhone   ? `Buyer phone: ${lead.buyerPhone}`          : null,
    lead.propertyAddress ? `Property: ${lead.propertyAddress}`     : null,
    lead.listingPrice ? `Listing price: ${lead.listingPrice}`      : null,
    lead.buyerMessage ? `Buyer's message:\n"${lead.buyerMessage}"` : null,
  ].filter(Boolean).join('\n');

  const response = await chat([
    {
      role: 'system',
      content: `You are a professional real estate agent assistant. 
A potential buyer has reached out through Zillow. 
Your job is to draft a warm, helpful, and professional email reply that:
- Addresses the buyer by name when available
- Acknowledges their interest in the property
- Answers or acknowledges any specific questions they raised
- Offers next steps (e.g., scheduling a showing, providing more info)
- Keeps the tone friendly but professional
- Is concise (under 200 words)
Only output the email body text — no subject line, no "Subject:", no metadata.`
    },
    {
      role: 'user',
      content: `Here is the incoming Zillow lead information:\n\n${leadSummary}\n\nPlease draft a reply email to this buyer.`
    }
  ]);

  return response.choices[0].message.content.trim();
}

/**
 * Full pipeline for a single Zillow email:
 *   1. Normalize the raw email into structured lead data
 *   2. Send the lead to the AI to generate a reply
 *   3. Email the reply back to the buyer's reply-to address
 *   4. Mark the original email as read so it won't be re-processed
 *
 * @param {object} email - Raw email from getUnreadEmailsFromQuery()
 * @returns {Promise<object>} Result object with lead and send confirmation
 */
async function processZillowInquiry(email) {
  console.log(`📬 Processing Zillow inquiry: "${email.subject}" from ${email.from}`);

  // 1. Normalize
  const lead = normalizeZillowEmail(email);
  console.log(`   Buyer: ${lead.buyerName || 'unknown'} | Property: ${lead.propertyAddress || 'unknown'}`);

  // 2. Generate AI response
  const replyBody = await generateZillowAIResponse(lead);
  console.log(`   AI response generated (${replyBody.length} chars)`);

  // 3. Determine reply address — prefer buyer's direct email, fall back to Zillow relay
  const sendTo = lead.replyTo || lead.buyerEmail || lead.originalFrom;
  const replySubject = email.subject.startsWith('Re:')
    ? email.subject
    : `Re: ${email.subject}`;

  const sendResult = await emailService.sendEmail(sendTo, replySubject, replyBody);
  console.log(`   ✅ Reply sent to ${sendTo} (messageId: ${sendResult.messageId})`);

  // 4. Mark original as read so the poller skips it next time
  await emailService.markAsRead(email.id);

  return { lead, replyBody, sendResult };
}

/**
 * Poll Gmail for unread emails from @convo.zillow.com and process each one.
 * This is called on a schedule from index.js.
 *
 * @returns {Promise<number>} Count of leads processed in this run
 */
async function pollZillowEmails() {
  if (!emailService.isConfigured()) return 0;

  const query = 'from:@convo.zillow.com is:unread';

  let emails;
  try {
    emails = await emailService.getUnreadEmailsFromQuery(query, 20);
  } catch (err) {
    console.error(`❌ Zillow poll – failed to fetch emails: ${err.message}`);
    return 0;
  }

  if (emails.length === 0) return 0;

  console.log(`📭 Zillow poller: found ${emails.length} unread email(s)`);

  let processed = 0;
  for (const email of emails) {
    try {
      await processZillowInquiry(email);
      processed++;
    } catch (err) {
      console.error(`❌ Zillow poll – failed to process email "${email.subject}": ${err.message}`);
      // Still mark as read to prevent infinite retries on a broken email
      await emailService.markAsRead(email.id).catch(() => {});
    }
  }

  return processed;
}

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
  // General email helpers
  summarizeEmailsByUrgency,
  generateEmailReport,
  draftEmailResponse,
  // Zillow lead pipeline
  normalizeZillowEmail,
  generateZillowAIResponse,
  processZillowInquiry,
  pollZillowEmails
};
