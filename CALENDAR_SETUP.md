# Google Calendar Setup Guide

This guide will help you set up Google Calendar integration with your AI Agent.

## Overview

The AI Agent can now:
- **List/View** upcoming calendar events
- **Create** new calendar events
- **Edit** existing events
- **Delete** calendar events

All calendar operations use your Google Account's primary calendar via OAuth2 authentication.

## Prerequisites

You should already have:
- A Google Cloud Project set up (from Gmail integration)
- `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` in your `.env` file
- `GMAIL_REFRESH_TOKEN` in your `.env` file

The calendar integration reuses the same OAuth2 credentials from Gmail setup.

## Step 1: Enable Google Calendar API

If you haven't already done this:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Click the **Enable APIs and Services** button
4. Search for **Google Calendar API**
5. Click it and press the **Enable** button

That's it! Your existing OAuth2 credentials will automatically have access to Google Calendar.

## Step 2: Verify Your .env File

Make sure your `.env` file contains:

```
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REFRESH_TOKEN=your-refresh-token
```

If you're missing the `GMAIL_REFRESH_TOKEN`, follow the Gmail setup guide in [GMAIL_SETUP.md](./GMAIL_SETUP.md).

## Step 3: Test Calendar Functions

Once configured, you can use the calendar functions through the agent endpoint.

### Example Requests

#### List upcoming events
```bash
curl -X PUT http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Show me my upcoming events",
    "tools": ["calendar"]
  }'
```

#### Create an event
```bash
curl -X PUT http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Schedule a team meeting for tomorrow at 2pm for 1 hour",
    "tools": ["calendar"]
  }'
```

#### Update an event
```bash
curl -X PUT http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Move my 2pm meeting to 3pm today",
    "tools": ["calendar"]
  }'
```

#### Delete an event
```bash
curl -X PUT http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Cancel my meeting with John",
    "tools": ["calendar"]
  }'
```

## Available Calendar Functions

### list_events
Lists upcoming calendar events.

**Parameters:**
- `maxResults` (integer, optional): Number of events to retrieve (default: 10, max: 50)
- `timeMin` (string, optional): Filter events from this time onwards (RFC3339 format)

**Example Response:**
```json
[
  {
    "id": "abc123",
    "summary": "Team Meeting",
    "description": "Weekly sync",
    "start": "2024-02-15T14:00:00.000Z",
    "end": "2024-02-15T15:00:00.000Z",
    "location": "Conference Room A",
    "attendees": 5,
    "isAllDay": false
  }
]
```

### create_event
Creates a new calendar event.

**Parameters:**
- `summary` (string, required): Event title
- `description` (string, optional): Event description
- `startTime` (string, required): Start time in ISO 8601 format (e.g., `2024-02-15T14:00:00`)
- `endTime` (string, required): End time in ISO 8601 format
- `location` (string, optional): Event location

**Example Response:**
```json
{
  "id": "abc123",
  "summary": "Team Meeting",
  "description": "Weekly sync",
  "start": "2024-02-15T14:00:00.000Z",
  "end": "2024-02-15T15:00:00.000Z",
  "location": "Conference Room A",
  "webLink": "https://calendar.google.com/calendar/u/0/r/eventedit/abc123"
}
```

### update_event
Updates an existing calendar event.

**Parameters:**
- `eventId` (string, required): The ID of the event to update
- `summary` (string, optional): Updated event title
- `description` (string, optional): Updated description
- `startTime` (string, optional): Updated start time (ISO 8601 format)
- `endTime` (string, optional): Updated end time (ISO 8601 format)
- `location` (string, optional): Updated location

**Example Response:**
```json
{
  "id": "abc123",
  "summary": "Team Meeting (Updated)",
  "description": "Weekly sync",
  "start": "2024-02-15T15:00:00.000Z",
  "end": "2024-02-15T16:00:00.000Z",
  "location": "Conference Room B",
  "webLink": "https://calendar.google.com/calendar/u/0/r/eventedit/abc123"
}
```

### delete_event
Deletes a calendar event.

**Parameters:**
- `eventId` (string, required): The ID of the event to delete

**Example Response:**
```json
{
  "success": true,
  "deletedEvent": "Team Meeting",
  "message": "Event \"Team Meeting\" has been deleted"
}
```

## Date/Time Format

Calendar functions expect dates and times in **ISO 8601 format**:

```
YYYY-MM-DDTHH:mm:ss
```

**Examples:**
- `2024-02-15T14:00:00` - February 15, 2024 at 2:00 PM
- `2024-03-01T09:30:00` - March 1, 2024 at 9:30 AM
- `2024-12-25T18:45:00` - December 25, 2024 at 6:45 PM

## Troubleshooting

### "Calendar not configured" error
- Verify `GMAIL_REFRESH_TOKEN` is set in your `.env` file
- Make sure the Google Calendar API is enabled in your Google Cloud Project

### "Invalid date format" error
- Check that times are in ISO 8601 format: `YYYY-MM-DDTHH:mm:ss`
- Ensure end time is after start time

### "Event not found" error
- Verify the `eventId` is correct by listing events first
- Event IDs are provided in the response when listing or creating events

### Timezone issues
- Times are stored in UTC by default
- The agent will interpret relative times (e.g., "tomorrow at 2pm") based on UTC
- Consider providing explicit times or adjusting the agent prompt

## Combining with Other Tools

You can combine calendar operations with other agent tools:

```bash
curl -X PUT http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Schedule a meeting for next Monday at 10am and send an invite email to the team",
    "tools": ["calendar", "email"]
  }'
```

## Advanced: Custom Calendars

By default, the integration uses your primary calendar (`primary`). To use a different calendar:

1. Edit [src/services/calendar.js](src/services/calendar.js)
2. Change line: `this.calendarId = 'primary';` to your calendar's email address
3. Restart the application

You can find your calendar IDs in Google Calendar settings under "Settings and sharing" → "Integrate calendar" → "Calendar ID".

## Next Steps

- Review [QUICK_START.md](./QUICK_START.md) for API usage examples
- Check [ARCHITECTURE.md](./ARCHITECTURE.md) for system design details
- Explore [FUNCTION_CALLING.md](./FUNCTION_CALLING.md) for more about function calling
