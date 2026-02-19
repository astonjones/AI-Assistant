const express = require('express');
const { chat } = require('../services/openai');
const { emailTools } = require('../services/openaiTools/emailTools');
const { twilioTools } = require('../services/openaiTools/twilioTools');
const { calendarTools } = require('../services/openaiTools/calendarTools');
const { databaseTools } = require('../services/openaiTools/databaseTools');
const { telegramTools } = require('../services/openaiTools/telegramTools');
const { processToolCalls, hasToolCalls } = require('../services/functionHandler');
const router = express.Router();

/**
 * PUT /agent
 * 
 * Main agent endpoint with function calling capability
 * 
 * Body:
 *   - messages: Array of message objects (required)
 *   - prompt: String (alternative to messages)
 *   - model: Model name (default: gpt-4-turbo)
 *   - temperature: Temperature (default: 0.7)
 *   - tools: Array of function names to enable (default: ['email', 'twilio', 'calendar', 'database'])
 *     Available: 'email' (send_email, read_emails, summarize_emails)
 *                'twilio' (send_sms, list_sms_history)
 *                'calendar' (list_events, create_event, update_event, delete_event)
 *                'database' (update_caller_name)
 *                'telegram' (send_telegram_message, summarize_and_send_telegram, send_telegram_summary)
 * 
 * Examples:
 *   { "prompt": "Send john@example.com an email", "tools": ["email"] }
 *   { "prompt": "Text 555-1234 about the event", "tools": ["twilio"] }
 *   { "prompt": "Schedule a meeting for tomorrow at 2pm", "tools": ["calendar"] }
 *   { "prompt": "Email and text the team, then create a calendar event", "tools": ["email", "twilio", "calendar"] }
 *   { "prompt": "Summarize this conversation and send it to me on Telegram", "tools": ["telegram"], "messages": [...] }
 */
router.put('/', async (req, res) => {
  try {
    let { 
      model = 'gpt-4-turbo', 
      messages, 
      temperature = 0.7,
      tools = ['email', 'twilio', 'calendar', 'database', 'telegram']
    } = req.body;

    // Convert prompt to messages if needed
    if (!messages) {
      if (req.body.prompt) {
        messages = [{ role: 'user', content: req.body.prompt }];
      } else {
        return res.status(400).json({ error: 'Missing messages or prompt in body' });
      }
    }

    // Build available tools based on requested types
    let availableTools = [];
    if (tools.includes('email')) {
      availableTools = [...availableTools, ...emailTools];
    }
    if (tools.includes('twilio')) {
      availableTools = [...availableTools, ...twilioTools];
    }
    if (tools.includes('calendar')) {
      availableTools = [...availableTools, ...calendarTools];
    }
    if (tools.includes('database')) {
      availableTools = [...availableTools, ...databaseTools];
    }
    if (tools.includes('telegram')) {
      availableTools = [...availableTools, ...telegramTools];
    }

    // Call OpenAI with function definitions
    let response = await chat(messages, availableTools, model, temperature);

    // Track all tool calls and results
    const toolResults = [];
    let iterationCount = 0;
    const maxIterations = 5; // Prevent infinite loops

    // Agentic loop: keep calling functions until model doesn't need to
    while (hasToolCalls(response) && iterationCount < maxIterations) {
      iterationCount++;
      
      const toolCalls = response.choices[0].message.tool_calls;
      
      // Add assistant message with tool calls
      messages.push({
        role: 'assistant',
        content: response.choices[0].message.content || '',
        tool_calls: toolCalls
      });

      // Execute all tool calls
      const toolCallResults = await processToolCalls(toolCalls);
      toolResults.push(...toolCallResults);

      // Add tool results back to messages
      messages.push(...toolCallResults);

      // Call model again with tool results
      response = await chat(messages, availableTools, model, temperature);
    }

    // Build final response
    const result = {
      choices: response.choices,
      model: response.model,
      usage: response.usage,
      toolCalls: toolResults.length > 0 ? toolResults : undefined
    };

    res.json(result);
  } catch (err) {
    const status = err.response ? err.response.status : 500;
    const data = err.response ? err.response.data : { message: err.message };
    res.status(status).json({ error: data });
  }
});

module.exports = router;
