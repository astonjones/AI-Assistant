const axios = require('axios');

/**
 * Call OpenAI Chat Completions API with optional function calling
 * @param {array} messages - Array of message objects
 * @param {array} tools - Optional array of function definitions
 * @param {string} model - Model name
 * @param {number} temperature - Temperature parameter
 * @returns {object} OpenAI response
 */
async function chat(messages, tools = null, model = 'gpt-4-turbo', temperature = 0.7) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const payload = {
    model,
    messages,
    temperature
  };

  // Add tools if provided
  if (tools && tools.length > 0) {
    payload.tools = tools.map(tool => ({
      type: 'function',
      function: tool
    }));
    payload.tool_choice = 'auto'; // Let model decide when to call functions
  }

  const response = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  return response.data;
}

module.exports = { chat };

