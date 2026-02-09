/**
 * OpenAI Realtime API Service
 * Manages bidirectional WebSocket connection with OpenAI for real-time
 * speech recognition, language model, and text-to-speech synthesis
 */

const WebSocket = require('ws');
const EventEmitter = require('events');

class RealtimeService extends EventEmitter {
  constructor() {
    super();
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.sessions = new Map(); // Map of callSid -> { ws, config, stats }
    // Use the stable gpt-4o-realtime model instead of preview
    this.openaiUrl = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview';
  }

  /**
   * Check if OpenAI Realtime is configured
   */
  isConfigured() {
    return !!this.openaiApiKey;
  }

  /**
   * Create a new OpenAI Realtime session for a call
   * @param {string} callSid - Twilio call SID
   * @param {string} systemPrompt - Custom system prompt for the AI (optional)
   * @returns {Promise<object>} Session info
   */
  async createSession(callSid, systemPrompt) {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured. Add OPENAI_API_KEY to .env');
    }

    console.log(`🤖 Creating OpenAI Realtime session for call: ${callSid}`);
    console.log(`   Connecting to: ${this.openaiUrl}`);

    try {
      const ws = new WebSocket(this.openaiUrl, {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      const session = {
        callSid,
        ws,
        isConnected: false,
        sessionId: null,
        transcription: '',
        audioBuffer: [],
        startTime: new Date(),
        stats: {
          audioChunksSent: 0,
          audioChunksReceived: 0,
          messagesReceived: 0
        }
      };

      // Handle connection open
      ws.on('open', () => {
        console.log(`✅ OpenAI Realtime connected for call: ${callSid}`);
        session.isConnected = true;

        // Send session creation message with system prompt
        const sessionConfig = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: systemPrompt || this._getDefaultSystemPrompt(),
            voice: 'alloy',
            input_audio_format: 'g711_ulaw',
            output_audio_format: 'g711_ulaw',
            input_audio_transcription: {
              model: 'whisper-1'
            }
          }
        };

        ws.send(JSON.stringify(sessionConfig));
        this.emit('session-created', { callSid, timestamp: new Date() });
      });

      // Handle incoming messages from OpenAI
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this._handleOpenAIMessage(callSid, message, session);
        } catch (err) {
          console.error(`Error parsing OpenAI message for call ${callSid}:`, err.message);
        }
      });

      // Handle errors
      ws.on('error', (err) => {
        console.error(`❌ OpenAI WebSocket ERROR for call ${callSid}:`);
        console.error(`   Message: ${err.message}`);
        console.error(`   Code: ${err.code}`);
        console.error(`   Details:`, err);
        this.emit('session-error', { callSid, error: err.message });
      });

      // Handle connection close
      ws.on('close', () => {
        console.log(`🔌 OpenAI Realtime session closed for call: ${callSid}`);
        session.isConnected = false;
        this.sessions.delete(callSid);
        this.emit('session-closed', { callSid });
      });

      this.sessions.set(callSid, session);
      return session;
    } catch (err) {
      throw new Error(`Failed to create OpenAI Realtime session: ${err.message}`);
    }
  }

  /**
   * Send audio chunk to OpenAI for processing
   * @param {string} callSid - Twilio call SID
   * @param {string} audioBase64 - Base64-encoded audio data
   */
  sendAudioToOpenAI(callSid, audioBase64) {
    const session = this.sessions.get(callSid);
    if (!session || !session.isConnected) {
      return;
    }

    try {
      const message = {
        type: 'input_audio_buffer.append',
        audio: audioBase64
      };

      session.ws.send(JSON.stringify(message));
      session.stats.audioChunksSent++;
    } catch (err) {
      console.error(`Error sending audio to OpenAI:`, err.message);
    }
  }

  /**
   * Commit audio buffer to OpenAI for processing
   * Call this when audio frame is complete
   * @param {string} callSid - Twilio call SID
   */
  commitAudioBuffer(callSid) {
    const session = this.sessions.get(callSid);
    if (!session || !session.isConnected) {
      return;
    }

    try {
      const message = {
        type: 'input_audio_buffer.commit'
      };
      session.ws.send(JSON.stringify(message));
    } catch (err) {
      console.error(`Error committing audio buffer for call ${callSid}:`, err.message);
    }
  }

  /**
   * Handle messages received from OpenAI
   * @private
   */
  _handleOpenAIMessage(callSid, message, session) {
    const messageType = message.type;

    // Only log important OpenAI API events
    if (messageType === 'session.created') {
      console.log(`📋 OpenAI session created: ${message.session.id}`);
      session.sessionId = message.session.id;
    }
    else if (messageType === 'session.updated') {
      console.log(`📋 OpenAI session configured`);
    }
    else if (messageType === 'conversation.item.created') {
      // User audio was captured, but transcription comes later via input_audio_transcription.completed
    }
    else if (messageType === 'conversation.item.input_audio_transcription.completed') {
      // This is where the actual user transcription comes through
      const transcript = message.transcript;
      if (transcript) {
        console.log(`👤 User: "${transcript}"`);
        session.transcription = transcript;
        
        this.emit('user-transcription', {
          callSid,
          text: transcript,
          timestamp: new Date()
        });
      }
    }
    else if (messageType === 'response.audio.delta') {
      session.stats.audioChunksReceived++;
      const audioData = message.delta;
      
      console.log(`🔊 Audio delta received:`);
      console.log(`   Size: ${audioData?.length || 'unknown'}`);
      console.log(`   Data type: ${typeof audioData}`);
      console.log(`   First 50 chars: ${audioData?.substring(0, 50)}`);
      console.log(`   Is base64: ${/^[A-Za-z0-9+/=]+$/.test(audioData?.substring(0, 50))}`);

      this.emit('response-audio', {
        callSid,
        audio: audioData,
        timestamp: new Date()
      });
    }
    else if (messageType === 'response.created') {
      // Response is starting (can be ignored)
    }
    else if (messageType === 'response.done') {
      // Check if response succeeded or failed
      const status = message.response?.status;
      const statusDetails = message.response?.status_details;
      
      if (status === 'failed') {
        const error = statusDetails?.error?.message || 'Unknown error';
        console.error(`❌ OpenAI Response Failed: ${error}`);
      } else if (status === 'completed' && message.response?.output && message.response.output.length > 0) {
        console.log(`🤖 AI response sent to caller`);
        this.emit('response-complete', {
          callSid,
          response: message.response.output[0],
          timestamp: new Date()
        });
      }
    }
    else if (messageType === 'response.text.delta') {
      if (message.delta) {
        console.log(`📝 AI response: ${message.delta}`);
      }
    }
    else if (messageType === 'error') {
      console.error(`❌ OpenAI error: ${message.error.message || message.error}`);
      this.emit('openai-error', {
        callSid,
        error: message.error,
        timestamp: new Date()
      });
    }
    // Silently handle other message types (speech_started, speech_stopped, committed, etc.)
    // These are informational and don't need logging

    session.stats.messagesReceived++;
  }

  /**
   * Get default system prompt for voice assistant
   * @private
   */
  _getDefaultSystemPrompt() {
    return `You are a helpful voice assistant. You are having a phone conversation. 
    Be concise, natural, and friendly. Respond to the user's questions and requests.
    Keep responses brief and conversational - this is a phone call, not a text chat.
    Avoid long responses. Aim for responses under 30 seconds when spoken aloud.`;
  }

  /**
   * Get session info
   */
  getSession(callSid) {
    return this.sessions.get(callSid) || null;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions() {
    return this.sessions;
  }

  /**
   * Get session statistics
   */
  getSessionStats(callSid) {
    const session = this.sessions.get(callSid);
    if (!session) return null;

    const duration = new Date() - session.startTime;

    return {
      callSid,
      isConnected: session.isConnected,
      duration: (duration / 1000).toFixed(2),
      audioChunksSent: session.stats.audioChunksSent,
      audioChunksReceived: session.stats.audioChunksReceived,
      messagesReceived: session.stats.messagesReceived,
      lastTranscription: session.transcription
    };
  }

  /**
   * Close a session
   */
  closeSession(callSid) {
    const session = this.sessions.get(callSid);
    if (!session) {
      console.warn(`No session found to close for call: ${callSid}`);
      return;
    }

    const duration = new Date() - session.startTime;
    console.log(`🔇 Closing OpenAI Realtime session for call: ${callSid}`);
    console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`   Audio chunks sent: ${session.stats.audioChunksSent}`);
    console.log(`   Audio chunks received: ${session.stats.audioChunksReceived}`);

    try {
      if (session.ws && session.isConnected) {
        session.ws.close();
      }
    } catch (err) {
      console.error(`Error closing session for call ${callSid}:`, err.message);
    }

    this.sessions.delete(callSid);
  }

  /**
   * Clear all sessions (useful for cleanup)
   */
  clearAllSessions() {
    for (const [callSid] of this.sessions) {
      this.closeSession(callSid);
    }
  }
}

// Export singleton instance
module.exports = new RealtimeService();
