/**
 * Calendar Service - Integrates with Google Calendar API
 * Handles reading, creating, updating, and deleting calendar events with OAuth2
 */

const { google } = require('googleapis');

class CalendarService {
  constructor() {
    // Initialize Google Calendar OAuth2 client
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      `${process.env.NGROK_URL}/auth/gmail/callback`
    );

    // Set refresh token for persistent authentication
    if (process.env.GMAIL_REFRESH_TOKEN) {
      this.oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN
      });
      this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    } else {
      this.calendar = null;
    }

    // Default calendar ID (primary calendar)
    this.calendarId = 'primary';
  }

  /**
   * Check if Calendar is configured
   */
  isConfigured() {
    return !!this.calendar;
  }

  /**
   * List upcoming events from calendar
   * @param {number} maxResults - Maximum number of events to retrieve (default: 10, max: 50)
   * @param {string} timeMin - Start time for the search (RFC3339 format, optional)
   * @returns {Promise<Array>} List of events with title, start, end, description
   */
  async listEvents(maxResults = 10, timeMin = null) {
    if (!this.isConfigured()) {
      throw new Error('Calendar not configured. Add GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN to .env');
    }

    if (maxResults < 1 || maxResults > 50) {
      throw new Error('maxResults must be between 1 and 50');
    }

    try {
      const params = {
        calendarId: this.calendarId,
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      };

      // If no timeMin provided, default to now
      if (!timeMin) {
        params.timeMin = new Date().toISOString();
      } else {
        params.timeMin = timeMin;
      }

      const res = await this.calendar.events.list(params);

      const events = res.data.items || [];
      
      // Format events for readability
      return events.map(event => ({
        id: event.id,
        summary: event.summary || '(no title)',
        description: event.description || '',
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
        location: event.location || '',
        attendees: event.attendees?.length || 0,
        isAllDay: !event.start.dateTime
      }));
    } catch (err) {
      throw new Error(`Failed to list events: ${err.message}`);
    }
  }

  /**
   * Create a new calendar event
   * @param {object} params - Event parameters
   * @param {string} params.summary - Event title
   * @param {string} params.description - Event description (optional)
   * @param {string} params.startTime - Start time (RFC3339 format or Date string)
   * @param {string} params.endTime - End time (RFC3339 format or Date string)
   * @param {string} params.location - Event location (optional)
   * @returns {Promise<object>} Created event details
   */
  async createEvent(params) {
    if (!this.isConfigured()) {
      throw new Error('Calendar not configured. Add GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN to .env');
    }

    const { summary, description, startTime, endTime, location } = params;

    // Validate required fields
    if (!summary || !startTime || !endTime) {
      throw new Error('Missing required parameters: summary, startTime, endTime');
    }

    try {
      // Parse times if they're not already in RFC3339 format
      const start = new Date(startTime);
      const end = new Date(endTime);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid date format. Please use ISO 8601 format (e.g., 2024-02-15T14:00:00)');
      }

      if (end <= start) {
        throw new Error('End time must be after start time');
      }

      const event = {
        summary: summary,
        description: description || '',
        start: {
          dateTime: start.toISOString(),
          timeZone: 'UTC'
        },
        end: {
          dateTime: end.toISOString(),
          timeZone: 'UTC'
        }
      };

      if (location) {
        event.location = location;
      }

      const res = await this.calendar.events.insert({
        calendarId: this.calendarId,
        resource: event
      });

      return {
        id: res.data.id,
        summary: res.data.summary,
        description: res.data.description,
        start: res.data.start.dateTime,
        end: res.data.end.dateTime,
        location: res.data.location || 'No location',
        webLink: res.data.htmlLink
      };
    } catch (err) {
      throw new Error(`Failed to create event: ${err.message}`);
    }
  }

  /**
   * Update an existing calendar event
   * @param {object} params - Event update parameters
   * @param {string} params.eventId - The event ID to update
   * @param {string} params.summary - Updated event title (optional)
   * @param {string} params.description - Updated description (optional)
   * @param {string} params.startTime - Updated start time (optional, RFC3339 format)
   * @param {string} params.endTime - Updated end time (optional, RFC3339 format)
   * @param {string} params.location - Updated location (optional)
   * @returns {Promise<object>} Updated event details
   */
  async updateEvent(params) {
    if (!this.isConfigured()) {
      throw new Error('Calendar not configured. Add GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN to .env');
    }

    const { eventId, summary, description, startTime, endTime, location } = params;

    if (!eventId) {
      throw new Error('Missing required parameter: eventId');
    }

    try {
      // Fetch the current event
      const currentEvent = await this.calendar.events.get({
        calendarId: this.calendarId,
        eventId: eventId
      });

      const updateData = currentEvent.data;

      // Update only provided fields
      if (summary) updateData.summary = summary;
      if (description !== undefined) updateData.description = description;
      if (location !== undefined) updateData.location = location;

      if (startTime) {
        const start = new Date(startTime);
        if (isNaN(start.getTime())) {
          throw new Error('Invalid start time format. Please use ISO 8601 format');
        }
        updateData.start.dateTime = start.toISOString();
      }

      if (endTime) {
        const end = new Date(endTime);
        if (isNaN(end.getTime())) {
          throw new Error('Invalid end time format. Please use ISO 8601 format');
        }
        updateData.end.dateTime = end.toISOString();
      }

      const res = await this.calendar.events.update({
        calendarId: this.calendarId,
        eventId: eventId,
        resource: updateData
      });

      return {
        id: res.data.id,
        summary: res.data.summary,
        description: res.data.description,
        start: res.data.start.dateTime,
        end: res.data.end.dateTime,
        location: res.data.location || 'No location',
        webLink: res.data.htmlLink
      };
    } catch (err) {
      throw new Error(`Failed to update event: ${err.message}`);
    }
  }

  /**
   * Delete a calendar event
   * @param {string} eventId - The event ID to delete
   * @returns {Promise<object>} Confirmation of deletion
   */
  async deleteEvent(eventId) {
    if (!this.isConfigured()) {
      throw new Error('Calendar not configured. Add GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN to .env');
    }

    if (!eventId) {
      throw new Error('Missing required parameter: eventId');
    }

    try {
      // Get event info before deleting for confirmation
      const event = await this.calendar.events.get({
        calendarId: this.calendarId,
        eventId: eventId
      });

      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId: eventId
      });

      return {
        success: true,
        deletedEvent: event.data.summary,
        message: `Event "${event.data.summary}" has been deleted`
      };
    } catch (err) {
      throw new Error(`Failed to delete event: ${err.message}`);
    }
  }
}

// Create and export singleton instance
module.exports = new CalendarService();
