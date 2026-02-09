/**
 * Calendar Service Functions
 * Function definitions for OpenAI function calling
 */

const calendarFunctions = [
  {
    name: 'list_events',
    description: 'List upcoming calendar events. Use this when the user asks to view, check, or list calendar events.',
    parameters: {
      type: 'object',
      properties: {
        maxResults: {
          type: 'integer',
          description: 'Number of events to retrieve (default: 10, max: 50)',
          default: 10
        },
        timeMin: {
          type: 'string',
          description: 'Filter events from this time onwards (RFC3339 format, e.g., 2024-02-15T00:00:00Z). If not provided, defaults to now.'
        }
      }
    }
  },
  {
    name: 'create_event',
    description: 'Create a new calendar event. Use this when the user asks to schedule, add, or create an event.',
    parameters: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'The event title/name (required)'
        },
        description: {
          type: 'string',
          description: 'Event description or notes (optional)'
        },
        startTime: {
          type: 'string',
          description: 'Event start time in ISO 8601 format (required, e.g., 2024-02-15T14:00:00)'
        },
        endTime: {
          type: 'string',
          description: 'Event end time in ISO 8601 format (required, e.g., 2024-02-15T15:00:00)'
        },
        location: {
          type: 'string',
          description: 'Event location or meeting details (optional)'
        }
      },
      required: ['summary', 'startTime', 'endTime']
    }
  },
  {
    name: 'update_event',
    description: 'Update an existing calendar event. Use this when the user asks to edit, modify, or reschedule an event.',
    parameters: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'The ID of the event to update (required)'
        },
        summary: {
          type: 'string',
          description: 'Updated event title (optional)'
        },
        description: {
          type: 'string',
          description: 'Updated event description (optional)'
        },
        startTime: {
          type: 'string',
          description: 'Updated start time in ISO 8601 format (optional, e.g., 2024-02-15T14:00:00)'
        },
        endTime: {
          type: 'string',
          description: 'Updated end time in ISO 8601 format (optional, e.g., 2024-02-15T15:00:00)'
        },
        location: {
          type: 'string',
          description: 'Updated location (optional)'
        }
      },
      required: ['eventId']
    }
  },
  {
    name: 'delete_event',
    description: 'Delete a calendar event. Use this when the user asks to remove, cancel, or delete an event.',
    parameters: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'The ID of the event to delete (required)'
        }
      },
      required: ['eventId']
    }
  }
];

module.exports = calendarFunctions;
