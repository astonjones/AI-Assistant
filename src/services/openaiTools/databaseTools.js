/**
 * Database Tools
 * Tool definitions (schemas only) for OpenAI function calling
 * 
 * NOTE: Handlers are implemented in functionHandler.js
 */

const databaseTools = [
  {
    type: 'function',
    name: 'update_caller_name',
    description: 'REQUIRED: Save or update the caller\'s name in the database. You MUST call this immediately when the caller tells you their name (e.g., "My name is John", "I\'m Sarah", "This is Mike"). This ensures you remember their name for future calls.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The caller\'s name (first name, full name, or nickname as they provided it)'
        }
      },
      required: ['name']
    }
  }
];

module.exports = { databaseTools };
