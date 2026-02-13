/**
 * OpenAI Realtime API Service
 * Manages bidirectional WebSocket connection with OpenAI for real-time
 * speech recognition, language model, and text-to-speech synthesis
 */

const WebSocket = require('ws');
const EventEmitter = require('events');
const toolsService = require('./tools');

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
        currentAIResponse: '', // Track the current AI response text being assembled
        audioBuffer: [],
        startTime: new Date(),
        pendingToolCall: null, // Track tool call in progress { name, arguments }
        stats: {
          audioChunksSent: 0,
          audioChunksReceived: 0,
          messagesReceived: 0
        }
      };

      // Handle connection open
      ws.on('open', () => {
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
            },
            tools: toolsService.getTools()
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
      session.sessionId = message.session.id;
    }
    else if (messageType === 'session.updated') {
      // Session configured
    }
    else if (messageType === 'conversation.item.created') {
      // User audio was captured, but transcription comes later via input_audio_transcription.completed
    }
    else if (messageType === 'conversation.item.input_audio_transcription.completed') {
      // This is where the actual user transcription comes through
      const transcript = message.transcript;
      if (transcript) {
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
        // Emit the full AI response text if we have it
        if (session.currentAIResponse) {
          this.emit('assistant-transcript', {
            callSid,
            text: session.currentAIResponse,
            timestamp: new Date()
          });
          session.currentAIResponse = ''; // Reset for next response
        }
        
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
        // Accumulate the AI response text
        session.currentAIResponse += message.delta;
      }
    }
    else if (messageType === 'response.output_item.added') {
      // A new output item was added (could be function call or message)
      const item = message.item;
      if (item && item.type === 'function_call') {
        // Initialize pending tool call with the function name
        session.pendingToolCall = {
          name: item.name || '',
          callId: item.call_id || '',
          arguments: ''
        };
      }
    }
    else if (messageType === 'response.function_call_arguments.delta') {
      // Accumulate function call arguments
      if (!session.pendingToolCall) {
        session.pendingToolCall = {
          name: message.name || '',
          arguments: ''
        };
      }
      if (message.delta) {
        session.pendingToolCall.arguments += message.delta;
      }
    }
    else if (messageType === 'response.function_call_arguments.done') {
      // Tool call is complete - parse arguments and execute
      if (session.pendingToolCall) {
        const toolName = session.pendingToolCall.name;
        let toolArgs = {};
        
        try {
          toolArgs = JSON.parse(session.pendingToolCall.arguments);
        } catch (err) {
          console.error(`❌ Failed to parse tool arguments:`, err.message);
        }
        
        // Emit event for index.js to execute the tool
        this.emit('tool-call', {
          callSid,
          toolName,
          toolArgs,
          callId: session.pendingToolCall.callId, // Include call_id for response
          session // Pass session so we can send result back
        });

        // Don't reset pendingToolCall yet - we need the callId for the response
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
   * Send tool result back to OpenAI
   * Called after a tool has been executed to provide the result to the AI
   * @param {string} callSid - Call SID
   * @param {string} callId - Function call ID from OpenAI
   * @param {object} result - Result from tool execution { success, result, error }
   */
  sendToolResult(callSid, callId, result) {
    const session = this.sessions.get(callSid);
    if (!session || !session.ws || session.ws.readyState !== WebSocket.OPEN) {
      console.error(`❌ Cannot send tool result - session not found or WebSocket closed`);
      return;
    }

    // Format the result as a string for OpenAI
    let resultText;
    if (result.success) {
      // Convert result to string - handle arrays and objects
      if (typeof result.result === 'string') {
        resultText = result.result;
      } else if (Array.isArray(result.result)) {
        // Format array results - check if it's calendar events for better formatting
        if (result.result.length === 0) {
          resultText = 'No items found.';
        } else if (result.result[0]?.summary && result.result[0]?.start) {
          // Calendar events - format in natural language
          resultText = this._formatCalendarEvents(result.result);
        } else {
          // Other arrays - use JSON
          resultText = JSON.stringify(result.result, null, 2);
        }
      } else if (typeof result.result === 'object') {
        resultText = JSON.stringify(result.result, null, 2);
      } else {
        resultText = String(result.result);
      }
    } else {
      resultText = `Error: ${result.error}`;
    }

    const message = {
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: resultText
      }
    };

    try {
      session.ws.send(JSON.stringify(message));
      console.log(`📤 Sent tool result to OpenAI (call_id: ${callId})`);
      
      // Clear pending tool call after successful response
      session.pendingToolCall = null;
    } catch (err) {
      console.error(`❌ Failed to send tool result:`, err.message);
    }
  }

  /**
   * Format calendar events in natural language for the AI
   * @private
   */
  _formatCalendarEvents(events) {
    if (!events || events.length === 0) {
      return 'No calendar events found.';
    }

    const eventStrings = events.map((event, index) => {
      const eventNum = index + 1;
      const date = new Date(event.start);
      const dateStr = date.toLocaleString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
      });
      
      let eventText = `${eventNum}. "${event.summary}" on ${dateStr}`;
      
      if (event.location) {
        eventText += ` at ${event.location}`;
      }
      
      if (event.description) {
        eventText += `. Description: ${event.description}`;
      }
      
      return eventText;
    });

    const summary = `Found ${events.length} event${events.length > 1 ? 's' : ''}:\n\n${eventStrings.join('\n\n')}`;
    return summary;
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
