/**
 * Function Handler
 * Routes and executes function calls from OpenAI
 */

const emailService = require('./email');
const twilioService = require('./twilio');
const calendarService = require('./calendar');
const databaseService = require('./database.auto');
const { summarizeEmailsByUrgency, generateEmailReport } = require('./emailProcessor');

/**
 * Map of all available functions
 * Format: { functionName: async (params) => result }
 */
const functionMap = {
  send_email: async (params) => {
    const { to, subject, body } = params;
    
    // Validate
    if (!to || !subject || !body) {
      throw new Error('Missing required parameters: to, subject, body');
    }
    
    return await emailService.sendEmail(to, subject, body);
  },

  read_emails: async (params) => {
    const limit = params.limit || 5;
    
    if (limit < 1 || limit > 20) {
      throw new Error('Limit must be between 1 and 20');
    }
    
    const emails = await emailService.getRecentEmails(limit);
    return {
      count: emails.length,
      emails: emails
    };
  },

  summarize_emails: async (params) => {
    const limit = params.limit || 10;
    
    if (limit < 1 || limit > 50) {
      throw new Error('Limit must be between 1 and 50');
    }
    
    const emails = await emailService.getRecentEmails(limit);
    const summary = await summarizeEmailsByUrgency(emails);
    
    return {
      summary: summary,
      emailsAnalyzed: emails.length
    };
  },

  send_sms: async (params) => {
    const { to, body } = params;
    
    // Validate
    if (!to || !body) {
      throw new Error('Missing required parameters: to (phone number), body (message)');
    }
    
    return await twilioService.sendSMS(to, body);
  },

  list_sms_history: async (params) => {
    const limit = params.limit || 10;
    
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }
    
    const messages = await twilioService.listMessages(limit);
    return {
      count: messages.length,
      messages: messages
    };
  },

  list_events: async (params) => {
    const maxResults = params.maxResults || 10;
    const timeMin = params.timeMin || null;
    
    return await calendarService.listEvents(maxResults, timeMin);
  },

  create_event: async (params) => {
    const { summary, description, startTime, endTime, location } = params;
    
    // Validate required parameters
    if (!summary || !startTime || !endTime) {
      throw new Error('Missing required parameters: summary, startTime, endTime');
    }
    
    return await calendarService.createEvent({
      summary,
      description: description || '',
      startTime,
      endTime,
      location: location || ''
    });
  },

  update_event: async (params) => {
    const { eventId, summary, description, startTime, endTime, location } = params;
    
    // Validate required parameter
    if (!eventId) {
      throw new Error('Missing required parameter: eventId');
    }
    
    return await calendarService.updateEvent({
      eventId,
      summary,
      description,
      startTime,
      endTime,
      location
    });
  },

  delete_event: async (params) => {
    const { eventId } = params;
    
    // Validate required parameter
    if (!eventId) {
      throw new Error('Missing required parameter: eventId');
    }
    
    return await calendarService.deleteEvent(eventId);
  },

  update_caller_name: async (params, phone) => {
    const { name } = params;
    
    // Validate required parameter
    if (!name) {
      throw new Error('Missing required parameter: name');
    }
    
    if (!phone) {
      throw new Error('Phone number not available - cannot update caller');
    }
    
    // Update the caller's name in the database
    const result = await databaseService.updateCallerName(phone, name);
    
    // Return the result from database service
    if (result.success) {
      return {
        success: true,
        message: `Saved your name as "${name}"`
      };
    } else {
      throw new Error(result.error || 'Failed to save name');
    }
  }
};

/**
 * Execute a function call from OpenAI
 * @param {string} functionName - Name of the function to call
 * @param {object} params - Function parameters
 * @param {string} phone - Optional phone number context for certain functions
 * @returns {object} Function result
 */
async function executeFunction(functionName, params, phone = null) {
  const func = functionMap[functionName];
  
  if (!func) {
    throw new Error(`Unknown function: ${functionName}`);
  }
  
  try {
    // Pass phone number to functions that need it (like update_caller_name)
    const result = await func(params, phone);
    return {
      success: true,
      result: result
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Process tool calls from OpenAI response
 * @param {array} toolCalls - Array of tool_call objects from OpenAI
 * @returns {array} Array of tool results
 */
async function processToolCalls(toolCalls) {
  const results = [];
  
  for (const toolCall of toolCalls) {
    const functionName = toolCall.function.name;
    const params = JSON.parse(toolCall.function.arguments);
    
    const result = await executeFunction(functionName, params);
    
    results.push({
      tool_call_id: toolCall.id,
      role: 'tool',
      name: functionName,
      content: JSON.stringify(result)
    });
  }
  
  return results;
}

/**
 * Check if response contains tool calls
 */
function hasToolCalls(response) {
  return response.choices[0]?.message?.tool_calls && 
         response.choices[0].message.tool_calls.length > 0;
}

module.exports = {
  executeFunction,
  processToolCalls,
  hasToolCalls,
  functionMap
};
