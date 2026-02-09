/**
 * Twilio Service - SMS & Voice Integration
 * Handles SMS messages and voice call streaming
 */

const twilio = require('twilio');
const EventEmitter = require('events');

class TwilioService extends EventEmitter {
  constructor() {
    super();
    // Initialize Twilio client
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (this.accountSid && this.authToken) {
      this.client = twilio(this.accountSid, this.authToken);
    } else {
      this.client = null;
    }

    // Voice streaming management
    this.activeStreams = new Map(); // Track active audio streams by call SID
  }

  /**
   * Check if Twilio is configured
   */
  isConfigured() {
    return !!(this.client && this.phoneNumber);
  }

  /**
   * Send an SMS message
   * @param {string} to - Recipient phone number (e.g., +1234567890)
   * @param {string} body - Message content
   * @returns {Promise<object>} Confirmation with message SID
   */
  async sendSMS(to, body) {
    if (!this.isConfigured()) {
      throw new Error(
        'Twilio not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to .env'
      );
    }

    if (!to || !body) {
      throw new Error('Missing required parameters: to (phone number) and body (message)');
    }

    try {
      const message = await this.client.messages.create({
        body: body,
        from: this.phoneNumber,
        to: to
      });

      return {
        success: true,
        messageSid: message.sid,
        status: message.status,
        message: `SMS sent to ${to}`
      };
    } catch (err) {
      throw new Error(`Failed to send SMS: ${err.message}`);
    }
  }

  /**
   * List recent SMS messages (sent and received)
   * @param {number} limit - Number of messages to fetch
   * @returns {Promise<Array>} List of SMS messages
   */
  async listMessages(limit = 10) {
    if (!this.isConfigured()) {
      throw new Error('Twilio not configured');
    }

    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    try {
      const messages = await this.client.messages.list({
        limit: limit
      });

      return messages.map(msg => ({
        sid: msg.sid,
        from: msg.from,
        to: msg.to,
        body: msg.body,
        status: msg.status,
        direction: msg.direction, // 'inbound' or 'outbound'
        dateSent: msg.dateSent,
        dateCreated: msg.dateCreated
      }));
    } catch (err) {
      throw new Error(`Failed to fetch messages: ${err.message}`);
    }
  }

  /**
   * Get SMS message details by SID
   * @param {string} messageSid - Twilio message SID
   * @returns {Promise<object>} Message details
   */
  async getMessageDetails(messageSid) {
    if (!this.isConfigured()) {
      throw new Error('Twilio not configured');
    }

    try {
      const message = await this.client.messages(messageSid).fetch();

      return {
        sid: message.sid,
        from: message.from,
        to: message.to,
        body: message.body,
        status: message.status,
        direction: message.direction,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateSent: message.dateSent,
        dateCreated: message.dateCreated,
        price: message.price,
        priceUnit: message.priceUnit
      };
    } catch (err) {
      throw new Error(`Failed to fetch message details: ${err.message}`);
    }
  }

  // ════════════════════════════════════════════════════════
  // VOICE STREAMING METHODS (formerly in voice.js)
  // ════════════════════════════════════════════════════════

  /**
   * Initialize an audio stream for a call
   * @param {string} callSid - Twilio call SID
   * @param {string} streamSid - Twilio stream SID
   * @param {WebSocket} ws - WebSocket connection for audio stream
   */
  initializeStream(callSid, streamSid, ws) {
    console.log(`🎤 Initializing audio stream for call: ${callSid}`);
    
    const streamData = {
      callSid,
      streamSid,
      ws,
      audioChunks: [],
      startTime: new Date(),
      isActive: true
    };

    this.activeStreams.set(callSid, streamData);
    
    // Emit event for stream initialization
    this.emit('stream-started', { callSid, timestamp: streamData.startTime });
    
    return streamData;
  }

  /**
   * Handle incoming audio data from stream
   * @param {string} callSid - Twilio call SID
   * @param {Buffer} audioBuffer - Audio data buffer
   */
  handleAudioData(callSid, audioBuffer) {
    const streamData = this.activeStreams.get(callSid);
    
    if (!streamData) {
      console.warn(`No stream found for call: ${callSid}`);
      return;
    }

    // Store audio chunk
    streamData.audioChunks.push(audioBuffer);

    // Emit audio received event (for future processing)
    this.emit('audio-received', {
      callSid,
      audioLength: audioBuffer.length,
      totalDuration: new Date() - streamData.startTime
    });
  }

  /**
   * Close an audio stream
   * @param {string} callSid - Twilio call SID
   */
  closeStream(callSid) {
    const streamData = this.activeStreams.get(callSid);
    
    if (!streamData) {
      console.warn(`No stream found to close for call: ${callSid}`);
      return;
    }

    streamData.isActive = false;
    const duration = new Date() - streamData.startTime;
    
    console.log(`🔇 Audio stream closed for call: ${callSid}`);
    console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`   Total audio chunks: ${streamData.audioChunks.length}`);
    console.log(`   Total bytes: ${streamData.audioChunks.reduce((acc, chunk) => acc + chunk.length, 0)}`);

    // Emit event for stream closure
    this.emit('stream-ended', {
      callSid,
      duration,
      audioChunks: streamData.audioChunks.length
    });

    // Clean up
    this.activeStreams.delete(callSid);
  }

  /**
   * Get active stream data
   * @param {string} callSid - Twilio call SID
   * @returns {object|null} Stream data or null if not found
   */
  getStream(callSid) {
    return this.activeStreams.get(callSid) || null;
  }

  /**
   * Get all active streams
   * @returns {Map} Map of active streams
   */
  getActiveStreams() {
    return this.activeStreams;
  }

  /**
   * Get statistics about all active streams
   * @returns {object} Stream statistics
   */
  getStreamStats() {
    const stats = {
      activeStreamCount: this.activeStreams.size,
      totalDuration: 0,
      totalAudioChunks: 0,
      totalBytes: 0,
      streams: []
    };

    for (const [callSid, streamData] of this.activeStreams.entries()) {
      const duration = new Date() - streamData.startTime;
      const totalBytes = streamData.audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
      
      stats.totalDuration += duration;
      stats.totalAudioChunks += streamData.audioChunks.length;
      stats.totalBytes += totalBytes;
      
      stats.streams.push({
        callSid,
        duration: (duration / 1000).toFixed(2),
        audioChunks: streamData.audioChunks.length,
        bytes: totalBytes
      });
    }

    return stats;
  }

  /**
   * Send audio data back to Twilio for playback to caller
   * Used by OpenAI Realtime API to send AI responses
   * @param {WebSocket} ws - WebSocket connection to Twilio MediaStream
   * @param {string} audioBase64 - Base64-encoded audio data
   * @param {string} streamSid - Twilio stream SID for this media update
   */
  sendMediaUpdate(ws, audioBase64, streamSid) {
    if (!ws) {
      console.error('❌ WebSocket is null');
      return;
    }

    console.log(`   📊 WebSocket state: ${ws.readyState} (0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)`);

    if (ws.readyState !== 1) { // 1 = OPEN
      console.warn(`⚠️  WebSocket not ready (state: ${ws.readyState}). Message will not be sent.`);
      return;
    }

    try {
      // The audio comes from OpenAI as a base64 string in g711_ulaw format
      // Twilio expects the payload to remain as base64 string for MediaStream
      
      const mediaUpdate = {
        event: 'media',
        streamSid: streamSid,
        media: {
          payload: audioBase64
        }
      };

      const jsonStr = JSON.stringify(mediaUpdate);
      console.log(`   📤 Sending media update:`);
      console.log(`      - Event: media`);
      console.log(`      - StreamSid: ${streamSid}`);
      console.log(`      - Track: outbound`);
      console.log(`      - Payload size: ${audioBase64?.length || 0} chars (base64)`);
      console.log(`      - Total message size: ${jsonStr.length} bytes`);

      ws.send(jsonStr);
      console.log(`   ✅ Media update sent successfully`);
    } catch (err) {
      console.error(`   ❌ Error sending media update to Twilio: ${err.message}`);
      console.error(`   Stack:`, err.stack);
    }
  }
}

// Export singleton instance
module.exports = new TwilioService();
